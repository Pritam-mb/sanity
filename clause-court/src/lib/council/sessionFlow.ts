// =============================================
// SESSION FLOW — deliberation state machine
// =============================================
//
// briefing → deliberation → synthesis → voting → ruled → approved → released
//
// The chair owns procedure (open, reveal, close, record). Members own
// positions and votes. Approvers own approval and release. The engine owns
// nothing — it only computes. Skipped steps and wrong-actor moves throw
// CouncilRuleError, which routes map to 409.

import { CouncilRuleError, type CastVote, type CouncilRules } from './tally.ts'

export const SESSION_STATUSES = [
  'briefing',
  'deliberation',
  'synthesis',
  'voting',
  'ruled',
  'approved',
  'released',
] as const

export type SessionStatus = (typeof SESSION_STATUSES)[number]

export type SessionActor = 'chair' | 'member' | 'approver'

interface SessionTransition {
  from: SessionStatus
  to: SessionStatus
  owner: SessionActor
  label: string
}

const SESSION_TRANSITIONS: SessionTransition[] = [
  { from: 'briefing', to: 'deliberation', owner: 'chair', label: 'Open deliberation (blind round)' },
  { from: 'deliberation', to: 'synthesis', owner: 'chair', label: 'Close deliberation, draft options' },
  { from: 'synthesis', to: 'voting', owner: 'chair', label: 'Open the vote' },
  { from: 'voting', to: 'ruled', owner: 'chair', label: 'Record the result' },
  { from: 'ruled', to: 'approved', owner: 'approver', label: 'Approve (two signatures)' },
  { from: 'approved', to: 'released', owner: 'approver', label: 'Release as precedent' },
]

export function isSessionStatus(value: unknown): value is SessionStatus {
  return (
    typeof value === 'string' &&
    (SESSION_STATUSES as readonly string[]).includes(value)
  )
}

/** Reveal is a round change inside deliberation, not a status change. */
export type SessionRound = 'blind' | 'open'

export function assertSessionTransition(
  from: SessionStatus | string | null | undefined,
  to: SessionStatus | string | null | undefined,
  actor: SessionActor
): void {
  const transition = SESSION_TRANSITIONS.find((t) => t.from === from && t.to === to)
  if (!transition) {
    throw new CouncilRuleError(`Illegal session transition: ${String(from)} → ${String(to)}`)
  }
  if (transition.owner !== actor) {
    throw new CouncilRuleError(
      `Only the ${transition.owner} can move a session ${transition.from} → ${transition.to}.`
    )
  }
}

export function nextSessionSteps(
  status: SessionStatus | string | null | undefined,
  actor: SessionActor
): SessionTransition[] {
  return SESSION_TRANSITIONS.filter((t) => t.from === status && t.owner === actor)
}

/** Deliberation needs at least two positions before options can be drafted. */
export function assertCanSynthesize(positionCount: number): void {
  if (positionCount < 2) {
    throw new CouncilRuleError(
      `Synthesis needs at least 2 positions, only ${positionCount} recorded.`
    )
  }
}

/** A vote needs at least two options, or it is not a choice. */
export function assertCanOpenVote(optionCount: number): void {
  if (optionCount < 2) {
    throw new CouncilRuleError(
      `Voting needs at least 2 options, only ${optionCount} drafted.`
    )
  }
}

export interface RoundGuard {
  memberId: string
  round: SessionRound
  /** Member ids with a position in the current round (latest revision counts). */
  positionedMemberIds: string[]
  revisionOf?: string | null
}

/**
 * Blind-round integrity: one live position per member per round. A second
 * submission must revise (point at the earlier one), never silently replace.
 */
export function assertPositionAllowed(guard: RoundGuard): void {
  const already = guard.positionedMemberIds.includes(guard.memberId)
  if (already && !guard.revisionOf) {
    throw new CouncilRuleError(
      'This member already holds a position this round — submit a revision that points at it instead.'
    )
  }
}

export interface ApprovalQuorum {
  approvals: Array<{ approverId: string }>
  required: number
}

export function approvalsNeeded(quorum: ApprovalQuorum): number {
  const unique = new Set(quorum.approvals.map((a) => a.approverId)).size
  return Math.max(quorum.required - unique, 0)
}

/** Map a finished session onto the v1 clause lifecycle so both UIs agree. */
export function clauseStatusForSession(sessionStatus: SessionStatus): string {
  switch (sessionStatus) {
    case 'ruled':
      return 'ruled'
    case 'approved':
      return 'resolved'
    case 'released':
      return 'published'
    default:
      return 'debated'
  }
}

export type { CastVote, CouncilRules }
