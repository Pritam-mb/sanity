// =============================================
// INTAKE - no policy enters without a hearing
// =============================================
//
// v2 left a hole: a clause could go draft -> flagged -> debated -> ruled with no
// `session` at all, through `POST /api/ruling`. One person could dispose of a
// policy with no council, no quorum and no second approver, and every rule in
// `tally.ts` would never notice because it was never consulted.
//
// This module closes that hole with deterministic guards that both the API and
// Sanity Studio call. The engine owns nothing here: it checks, and refuses.

import { CouncilRuleError } from './tally.ts'

export const INTAKE_SOURCES = [
  'new-policy',
  'amendment',
  'vendor-terms',
  'org-request',
  'regulatory-change',
] as const

export type IntakeSource = (typeof INTAKE_SOURCES)[number]

export function isIntakeSource(value: unknown): value is IntakeSource {
  return (
    typeof value === 'string' &&
    (INTAKE_SOURCES as readonly string[]).includes(value)
  )
}

export const INTAKE_SOURCE_LABELS: Record<IntakeSource, string> = {
  'new-policy': 'New policy',
  amendment: 'Amendment to published policy',
  'vendor-terms': 'Vendor terms',
  'org-request': 'Raised by an organisation',
  'regulatory-change': 'Regulatory change',
}

/** Sources that bring an existing published clause forward for re-argument. */
export const AMENDING_SOURCES: readonly IntakeSource[] = ['amendment']

/** Sources that only make sense with an organisation attached. */
export const ORG_BOUND_SOURCES: readonly IntakeSource[] = ['vendor-terms', 'org-request']

/** Sources that must name the date they take effect. */
export const DATED_SOURCES: readonly IntakeSource[] = [
  'new-policy',
  'amendment',
  'regulatory-change',
]

/** A clause shorter than this is not yet a policy statement worth a hearing. */
export const MIN_CLAUSE_CHARS = 12

export const COUNCIL_REQUIRED_ENV = 'COUNCIL_REQUIRED'

type EnvLike = Record<string, string | undefined>

/**
 * The council gate is on unless explicitly disabled.
 *
 * `COUNCIL_REQUIRED=false` re-opens the v1 single-judge path. It exists so the
 * pre-council demo can still be replayed; it must never be the default, and a
 * run with it off is a run where the council rules do not apply.
 */
export function councilRequired(env: EnvLike = process.env): boolean {
  const raw = env[COUNCIL_REQUIRED_ENV]
  if (typeof raw !== 'string') return true
  return raw.trim().toLowerCase() !== 'false'
}

// =============================================
// COMPLETENESS
// =============================================

export interface IntakeDraft {
  text: string
  source: IntakeSource
  requestedBy?: string | null
  requestingOrgId?: string | null
  supersedesId?: string | null
  effectiveDate?: string | null
  unitOfMeasure?: string | null
  proposedValue?: number | null
  mandatory?: boolean
}

export interface IntakeCompleteness {
  complete: boolean
  /** Field names that are missing, in a stable order so the UI can list them. */
  missing: string[]
  /** Blocking problems that are not a missing field. */
  problems: string[]
  isMandatory: boolean
}

/**
 * Whether an intake carries enough to open a hearing.
 *
 * Deterministic and field-level: the caller gets the exact list of what is
 * absent, so a policy author fixes the form rather than guessing.
 */
export function checkIntakeCompleteness(draft: IntakeDraft): IntakeCompleteness {
  const missing: string[] = []
  const problems: string[] = []
  const isMandatory = draft.mandatory !== false

  const text = (draft.text ?? '').trim()
  if (text.length < MIN_CLAUSE_CHARS) {
    missing.push('text')
    problems.push(
      `Clause text is shorter than ${MIN_CLAUSE_CHARS} characters - there is nothing yet to review.`
    )
  }

  if (!(draft.requestedBy ?? '').trim()) {
    missing.push('requestedBy')
    problems.push('No requester named - a case needs an attributable author.')
  }

  if (ORG_BOUND_SOURCES.includes(draft.source) && !(draft.requestingOrgId ?? '').trim()) {
    missing.push('requestingOrgId')
    problems.push(
      `${INTAKE_SOURCE_LABELS[draft.source]} must name the organisation it comes from.`
    )
  }

  if (DATED_SOURCES.includes(draft.source) && !(draft.effectiveDate ?? '').trim()) {
    missing.push('effectiveDate')
    problems.push(
      `${INTAKE_SOURCE_LABELS[draft.source]} must state the date it takes effect.`
    )
  }

  if (AMENDING_SOURCES.includes(draft.source) && !(draft.supersedesId ?? '').trim()) {
    missing.push('supersedesId')
    problems.push(
      'An amendment must point at the published clause it replaces - an amendment to nothing is a new policy.'
    )
  }

  if (typeof draft.proposedValue === 'number') {
    if (!Number.isFinite(draft.proposedValue)) {
      problems.push('The proposed value is not a finite number.')
    } else if (!(draft.unitOfMeasure ?? '').trim()) {
      missing.push('unitOfMeasure')
      problems.push(
        'A proposed number was supplied without a unit of measure - the unit is what makes the number arguable.'
      )
    }
  }

  return { complete: missing.length === 0, missing, problems, isMandatory }
}

export function assertIntakeComplete(check: IntakeCompleteness): void {
  if (check.complete) return
  if (!check.isMandatory) return
  throw new CouncilRuleError(
    `Incomplete intake: ${check.missing.join(', ')}. ${check.problems.join(' ')}`.trim()
  )
}

// =============================================
// GATES
// =============================================

export interface CouncilGateClause {
  status: string
  sessionId?: string | null
  intakeComplete?: boolean
}

/**
 * A clause may not leave `flagged` without an open session.
 *
 * This is the gate the whole council rests on: without it, "policy passed by
 * the council" is a claim the data cannot support.
 */
export function assertCouncilGate(
  clause: CouncilGateClause,
  env: EnvLike = process.env
): void {
  if (!councilRequired(env)) return

  if (clause.status === 'flagged' && !(clause.sessionId ?? '').trim()) {
    throw new CouncilRuleError(
      'This clause has no deliberation session. Open one before recording a debate - nothing leaves intake without a council.'
    )
  }

  if (
    clause.status !== 'draft' &&
    clause.intakeComplete === false
  ) {
    throw new CouncilRuleError(
      'This intake is incomplete, so it cannot enter the council lifecycle.'
    )
  }
}

/**
 * Every mandatory intake must be routed to a council that actually staffs the
 * seats the council requires. A council missing its Legal seat cannot convene.
 */
export function assertSeatAssigned(
  staffedSeats: string[],
  requiredSeats: string[],
  councilName = 'this council'
): void {
  const staffed = new Set(staffedSeats.map((s) => s.trim()).filter(Boolean))
  const missing = requiredSeats.filter((seat) => !staffed.has(seat))
  if (missing.length > 0) {
    throw new CouncilRuleError(
      `${councilName} cannot convene: no member holds the required seat(s) ${missing.join(', ')}. Staff the seat or amend the council's required seats.`
    )
  }
}

/**
 * Refuse a ruling that no council produced.
 *
 * Called by `POST /api/ruling`, which in v1 could dispose of any `debated`
 * clause on its own. With the council required, a ruling must cite a session
 * that went through the tally.
 */
export function assertNoLegacyPath(
  hasSession: boolean,
  env: EnvLike = process.env
): void {
  if (!councilRequired(env)) return
  if (!hasSession) {
    throw new CouncilRuleError(
      'A ruling must come from a council session. Open a session, hold the vote, and record the result.'
    )
  }
}

/**
 * Whether a session may be opened straight from intake, given the intake and
 * the council's staffing. Returns the refusal instead of throwing so a route
 * can answer 409 with a body.
 */
export function checkIntakeOpenable(input: {
  check: IntakeCompleteness
  staffedSeats: string[]
  requiredSeats: string[]
  councilName?: string
}): { ok: true } | { ok: false; message: string } {
  if (!input.check.complete && input.check.isMandatory) {
    return {
      ok: false,
      message: `Incomplete intake: ${input.check.missing.join(', ')}. ${input.check.problems.join(' ')}`.trim(),
    }
  }
  const staffed = new Set(input.staffedSeats.map((s) => s.trim()).filter(Boolean))
  const missing = input.requiredSeats.filter((seat) => !staffed.has(seat))
  if (missing.length > 0) {
    return {
      ok: false,
      message: `${input.councilName ?? 'This council'} cannot convene: no member holds the required seat(s) ${missing.join(', ')}.`,
    }
  }
  return { ok: true }
}
