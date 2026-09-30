// =============================================
// COUNCIL TALLY — pure, testable decision math
// =============================================
//
// Everything a council decision depends on — quorum, majority threshold,
// required seats, the two-person approval rule, and the deterministic
// summary of structured positions — lives here with no Sanity and no model.
// Routes enforce it; the UI displays it; tests pin it down.

export interface CouncilRules {
  /** Active seats on the council. */
  totalSeats: number
  /** Share of seats that must vote, 0–100. */
  quorumPct: number
  /** Share of cast votes the winner needs, 0–100. */
  thresholdPct: number
  /** Seats that must appear among the voters. */
  requiredSeats: string[]
}

export interface CastVote {
  memberId: string
  seat: string
  optionId: string
}

/** A refusal is the rule working, not a server fault — routes map it to 409. */
export class CouncilRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CouncilRuleError'
  }
}

export interface QuorumCheck {
  met: boolean
  cast: number
  needed: number
  totalSeats: number
}

export function checkQuorum(
  votesCast: number,
  totalSeats: number,
  quorumPct: number
): QuorumCheck {
  const needed = Math.ceil((totalSeats * quorumPct) / 100)
  return { met: votesCast >= needed, cast: votesCast, needed, totalSeats }
}

export interface RequiredSeatsCheck {
  met: boolean
  missing: string[]
}

export function checkRequiredSeats(
  voterSeats: string[],
  requiredSeats: string[]
): RequiredSeatsCheck {
  const present = new Set(voterSeats)
  const missing = requiredSeats.filter((seat) => !present.has(seat))
  return { met: missing.length === 0, missing }
}

export interface VoteEvaluation {
  /** Winning option id, or null when no result is valid. */
  winnerId: string | null
  /** Votes per option id. */
  tally: Record<string, number>
  quorum: QuorumCheck
  requiredSeats: RequiredSeatsCheck
  /** Winner's share of cast votes, 0–100. */
  winnerSharePct: number
  thresholdMet: boolean
  passes: boolean
  reasons: string[]
}

/**
 * One member, one vote: a second vote from the same member is rejected.
 * Blank (unknown-option) votes are rejected — a vote must pick an option.
 */
export function assertVote(
  vote: CastVote,
  existingVotes: CastVote[],
  optionIds: string[]
): void {
  if (!optionIds.includes(vote.optionId)) {
    throw new CouncilRuleError(`Vote names an unknown option: ${vote.optionId}`)
  }
  if (existingVotes.some((v) => v.memberId === vote.memberId)) {
    throw new CouncilRuleError(
      `Member ${vote.memberId} has already voted — one member, one vote.`
    )
  }
}

/**
 * Decide a vote: quorum first, then required seats, then threshold.
 * The first failing gate decides the outcome and explains it.
 */
export function evaluateResult(
  votes: CastVote[],
  optionIds: string[],
  rules: CouncilRules
): VoteEvaluation {
  const tally: Record<string, number> = {}
  for (const id of optionIds) tally[id] = 0
  for (const vote of votes) {
    if (tally[vote.optionId] !== undefined) tally[vote.optionId] += 1
  }

  const quorum = checkQuorum(votes.length, rules.totalSeats, rules.quorumPct)
  const requiredSeats = checkRequiredSeats(
    votes.map((v) => v.seat),
    rules.requiredSeats
  )

  let winnerId: string | null = null
  let winnerSharePct = 0
  for (const id of optionIds) {
    const share = votes.length === 0 ? 0 : (tally[id] / votes.length) * 100
    if (share > winnerSharePct || (share === winnerSharePct && winnerId === null && share > 0)) {
      winnerId = share > 0 ? id : winnerId
      winnerSharePct = share
    }
  }
  // Ties leave no winner: a tie is not a decision.
  const topCount = winnerId === null ? 0 : tally[winnerId]
  const tied = optionIds.filter((id) => tally[id] === topCount && topCount > 0).length > 1
  if (tied) {
    winnerId = null
    winnerSharePct = votes.length === 0 ? 0 : (topCount / votes.length) * 100
  }

  const thresholdMet = winnerId !== null && winnerSharePct >= rules.thresholdPct

  const reasons: string[] = []
  if (!quorum.met) {
    reasons.push(
      `Quorum not met: ${quorum.cast} of ${quorum.totalSeats} seats voted, ${quorum.needed} required.`
    )
  }
  if (!requiredSeats.met) {
    reasons.push(
      `Required seats missing: ${requiredSeats.missing.join(', ')}. A majority cannot bypass the experts.`
    )
  }
  if (winnerId === null && votes.length > 0) {
    reasons.push('No winner: the leading options are tied.')
  } else if (!thresholdMet && winnerId !== null) {
    reasons.push(
      `Threshold not met: leading option holds ${winnerSharePct.toFixed(1)}%, ${rules.thresholdPct}% required.`
    )
  }

  const passes = quorum.met && requiredSeats.met && thresholdMet && winnerId !== null
  if (passes && winnerId !== null) {
    reasons.push(
      `Option ${winnerId} carries with ${tally[winnerId]} of ${votes.length} votes (${winnerSharePct.toFixed(1)}%).`
    )
  }

  return { winnerId: passes ? winnerId : null, tally, quorum, requiredSeats, winnerSharePct, thresholdMet, passes, reasons }
}

// =============================================
// DETERMINISTIC POSITION SUMMARY
// =============================================

export interface PositionPoint {
  memberId: string
  seat: string
  value: number
  confidence: number
}

export interface ValueCluster {
  lo: number
  hi: number
  count: number
  memberIds: string[]
}

export interface PositionSummary {
  count: number
  min: number
  max: number
  median: number
  clusters: ValueCluster[]
  /** 0–1. 1 means total agreement. Spread is confidence-weighted. */
  consensus: number
  /** Seats present, for the "who is silent" display. */
  seatsHeard: string[]
}

function medianOf(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * The live summary card, computed — never generated. Values cluster by
 * single linkage: neighbours join while the gap stays within 40% of the
 * total range, so 4/8/8/24/48 reads as one main cluster plus the 48h
 * outlier. Chaining is intended: near neighbours belong together.
 */
export function summarizePositions(points: PositionPoint[]): PositionSummary {
  if (points.length === 0) {
    return { count: 0, min: 0, max: 0, median: 0, clusters: [], consensus: 0, seatsHeard: [] }
  }

  const values = points.map((p) => p.value).sort((a, b) => a - b)
  const min = values[0]
  const max = values[values.length - 1]
  const median = medianOf(values)

  const range = max - min
  const gapTolerance = Math.max(range * 0.4, Number.EPSILON)
  const ordered = [...points].sort((a, b) => a.value - b.value)
  const clusters: ValueCluster[] = []
  let current: PositionPoint[] = [ordered[0]]
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].value - ordered[i - 1].value <= gapTolerance) {
      current.push(ordered[i])
    } else {
      clusters.push(toCluster(current))
      current = [ordered[i]]
    }
  }
  clusters.push(toCluster(current))

  const totalConfidence = points.reduce((sum, p) => sum + p.confidence, 0)
  const spread =
    totalConfidence === 0
      ? range
      : points.reduce((sum, p) => sum + p.confidence * Math.abs(p.value - median), 0) /
        totalConfidence
  const scale = Math.max(range, 1)
  const consensus = Math.round((1 / (1 + spread / scale)) * 100) / 100

  return {
    count: points.length,
    min,
    max,
    median,
    clusters,
    consensus,
    seatsHeard: [...new Set(points.map((p) => p.seat))],
  }
}

function toCluster(group: PositionPoint[]): ValueCluster {
  const values = group.map((p) => p.value)
  return {
    lo: Math.min(...values),
    hi: Math.max(...values),
    count: group.length,
    memberIds: group.map((p) => p.memberId),
  }
}

/** A proposal below an applicable legal floor needs a recorded override. */
export function checkLegalFloor(
  value: number,
  floor: { value: number; unit: string; basis: string } | null
): { ok: boolean; detail: string } {
  if (!floor) return { ok: true, detail: 'No applicable legal floor.' }
  if (value >= floor.value) {
    return { ok: true, detail: `At or above the floor of ${floor.value} ${floor.unit} (${floor.basis}).` }
  }
  return {
    ok: false,
    detail: `Below the legal floor of ${floor.value} ${floor.unit} (${floor.basis}) — an override with a reason is required.`,
  }
}

// =============================================
// TWO-PERSON APPROVAL RULE
// =============================================

export interface ApprovalSignature {
  approverId: string
  approverName: string
}

/**
 * Two different approvers, and neither may be the clause author or the chair.
 * Name comparison is case-insensitive; the author is tracked by name because
 * clauses carry `submittedBy`, not a member reference.
 */
export function validateApprovals(
  approvals: ApprovalSignature[],
  opts: { authorName: string; chairId: string }
): void {
  if (approvals.length < 2) {
    throw new CouncilRuleError(
      `Two approvals are required, only ${approvals.length} recorded.`
    )
  }
  const ids = approvals.map((a) => a.approverId)
  if (new Set(ids).size !== ids.length) {
    throw new CouncilRuleError('Duplicate approver: the two signatures must come from different people.')
  }
  const author = opts.authorName.trim().toLowerCase()
  for (const approval of approvals) {
    if (approval.approverId === opts.chairId) {
      throw new CouncilRuleError('The chair holds a procedural role and cannot approve.')
    }
    if (approval.approverName.trim().toLowerCase() === author) {
      throw new CouncilRuleError('The author cannot approve their own case.')
    }
  }
}
