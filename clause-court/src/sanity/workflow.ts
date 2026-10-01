// =============================================
// CLAUSE COURT — WORKFLOW STATE MACHINE
// =============================================
//
// Single source of truth for the clause lifecycle.
// Imported by BOTH the Next.js app (UI stepper, API guards) and the
// Sanity Studio (document actions, desk structure). If a transition is
// illegal in one surface it is illegal in the other.
//
// draft -> flagged -> debated -> ruled -> resolved -> published
//
// The `ruled -> resolved` transition is the human approval gate (§16).
// It is NEVER performed by the AI or by the ruling pipeline. A ruling
// leaves the clause at `ruled` until a person acts.

export const WORKFLOW_STATES = [
  'draft',
  'flagged',
  'debated',
  'ruled',
  'resolved',
  'published',
] as const

export type WorkflowState = (typeof WORKFLOW_STATES)[number]

/**
 * Who is allowed to perform a transition.
 * - `deterministic`: owned by application code (the ambiguity engine)
 * - `human`: requires an explicit person to act — the approval gate
 */
export type TransitionOwner = 'deterministic' | 'human'

export interface WorkflowTransition {
  from: WorkflowState
  to: WorkflowState
  owner: TransitionOwner
  label: string
  description: string
  /** True when the UI must force an explicit confirmation before firing. */
  requiresConfirmation: boolean
}

export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  {
    from: 'draft',
    to: 'flagged',
    owner: 'deterministic',
    label: 'Flag',
    description:
      'The deterministic ambiguity engine found at least one inspectable signal. No AI decision involved.',
    requiresConfirmation: false,
  },
  {
    from: 'flagged',
    to: 'debated',
    owner: 'deterministic',
    label: 'Record Debate',
    description: 'Both advocates returned materially different interpretations.',
    requiresConfirmation: false,
  },
  {
    from: 'debated',
    to: 'ruled',
    owner: 'human',
    label: 'Issue Ruling',
    description: 'A human judge selected an interpretation or wrote a custom ruling.',
    requiresConfirmation: true,
  },
  {
    from: 'ruled',
    to: 'resolved',
    owner: 'human',
    label: 'Approve Resolution',
    description:
      'Human approval gate. A clause is never marked resolved by AI output alone — the reviewer must accept the ruling and close the case.',
    requiresConfirmation: true,
  },
  {
    from: 'resolved',
    to: 'published',
    owner: 'human',
    label: 'Publish',
    description: 'The clarified clause is released for publication.',
    requiresConfirmation: true,
  },
]

export function isWorkflowState(value: unknown): value is WorkflowState {
  return (
    typeof value === 'string' &&
    (WORKFLOW_STATES as readonly string[]).includes(value)
  )
}

export function stateIndex(state: WorkflowState | string | null | undefined): number {
  if (!isWorkflowState(state)) return -1
  return WORKFLOW_STATES.indexOf(state)
}

/**
 * Legal transitions available from a given state, for the given actor.
 *
 * Each actor sees only the steps it owns. A human is offered the approval gate
 * and nothing else — listing `draft -> flagged` for a person would let them
 * "approve" a step that is supposed to be derived from the engine, and would
 * also mean the button row is not a truthful picture of what a person decides.
 */
export function availableTransitions(
  state: WorkflowState | string | null | undefined,
  actor: 'system' | 'human'
): WorkflowTransition[] {
  if (!isWorkflowState(state)) return []
  const owner: TransitionOwner = actor === 'human' ? 'human' : 'deterministic'
  return WORKFLOW_TRANSITIONS.filter((t) => t.from === state && t.owner === owner)
}

export function findTransition(
  from: WorkflowState | string | null | undefined,
  to: WorkflowState | string | null | undefined
): WorkflowTransition | undefined {
  if (!isWorkflowState(from) || !isWorkflowState(to)) return undefined
  return WORKFLOW_TRANSITIONS.find((t) => t.from === from && t.to === to)
}

/**
 * The deterministic ambiguity engine is allowed to move draft -> flagged and
 * nothing else. Every other forward move requires a human.
 */
export function isAutomaticTransition(
  from: WorkflowState | string | null | undefined,
  to: WorkflowState | string | null | undefined
): boolean {
  const t = findTransition(from, to)
  return t?.owner === 'deterministic'
}

/**
 * A refused workflow transition.
 *
 * Distinct from a plain `Error` because a refusal is not a server fault — it is
 * the state machine working. Routes can catch this and answer `409 Conflict`
 * rather than `500`, so a rejected request is not reported as a crash and does
 * not light up error monitoring as if the app had broken.
 */
export class WorkflowViolationError extends Error {
  readonly from: string
  readonly to: string

  constructor(message: string, from: string, to: string) {
    super(message)
    this.name = 'WorkflowViolationError'
    this.from = from
    this.to = to
  }
}

/**
 * Throws unless the transition is legal *and* owned by a human.
 *
 * The ownership check is the approval gate. Every human-owned step also sets
 * `requiresConfirmation`, and both are checked: the owner decides whether the
 * step is a decision at all, and the flag guarantees the surface acting on it
 * has somewhere to force a confirmation.
 */
export function assertHumanTransition(
  from: WorkflowState | string | null | undefined,
  to: WorkflowState | string | null | undefined
): void {
  const transition = findTransition(from, to)
  if (!transition) {
    throw new WorkflowViolationError(
      `Illegal workflow transition: ${String(from)} -> ${String(to)}`,
      String(from),
      String(to)
    )
  }
  if (transition.owner !== 'human') {
    throw new WorkflowViolationError(
      `Transition ${transition.from} -> ${transition.to} is performed by the ${transition.owner} pipeline and cannot be approved by hand. It can only be reached by running that step.`,
      transition.from,
      transition.to
    )
  }
  if (!transition.requiresConfirmation) {
    throw new WorkflowViolationError(
      `Transition ${transition.from} -> ${transition.to} must be confirmed by a human`,
      transition.from,
      transition.to
    )
  }
}

export const WORKFLOW_STATE_META: Record<
  WorkflowState,
  { label: string; icon: string; description: string }
> = {
  draft: {
    label: 'Draft',
    icon: 'draft',
    description: 'Clause is being written. Not yet analyzed.',
  },
  flagged: {
    label: 'Flagged',
    icon: 'flagged',
    description: 'The deterministic engine found an inspectable ambiguity signal.',
  },
  debated: {
    label: 'Debated',
    icon: 'debated',
    description: 'Two advocates have argued opposing interpretations. No ruling yet.',
  },
  ruled: {
    label: 'Ruled',
    icon: 'ruled',
    description: 'A human judge ruled. Awaiting human approval to resolve.',
  },
  resolved: {
    label: 'Resolved',
    icon: 'resolved',
    description: 'The human approved the ruling. The clause now has an effective meaning.',
  },
  published: {
    label: 'Published',
    icon: 'published',
    description: 'Released. The ruling is live precedent.',
  },
}
