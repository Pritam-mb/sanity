// =============================================
// CASE STATUS - what stage is this file at, and what does it need
// =============================================
//
// Computed on read, never stored as a label. A stale badge is worse than no
// badge: it tells someone a case is waiting on them when it is not. This is the
// same discipline as `summarizePositions()` - the live card is derived, so it
// cannot drift.
//
// It powers `CaseStatusBanner` on every surface, and it is the implementation
// of the resumability contract: open a cold case at any moment and this answers
// what it is, who is in it, what is missing, what happens next, and what was
// last decided.

import { checkQuorum, checkRequiredSeats, type CastVote } from './tally.ts'
import { approvalsNeeded, type SessionStatus } from './sessionFlow.ts'

export interface CaseStatusMember {
  id: string
  name: string
  seat: string
}

export interface CaseStatusInput {
  sessionId: string
  clauseId: string
  status: SessionStatus | string
  round: string | null
  deadline: string | null
  chairId: string | null
  chairName: string | null
  members: CaseStatusMember[]
  /** Members holding a live position in the current round. */
  positionedMemberIds: string[]
  /** Members who have already voted. */
  votes: CastVote[]
  requiredSeats: string[]
  quorumPct: number
  approverIds: string[]
  approvalsRequired: number
  viewerMemberId: string | null
  ruling?: { holding: string; voteSummary?: string | null; approvedBy?: string[] } | null
  precedentId?: string | null
  now?: number
}

export type ViewerRole = 'chair' | 'approver' | 'member' | 'observer'

export interface CaseStatus {
  stage: string
  stageLabel: string
  roundLabel: string
  role: ViewerRole
  chairName: string | null
  silentMembers: Array<{ name: string; seat: string }>
  silentCount: number
  missingRequiredSeats: string[]
  quorum: { cast: number; needed: number; total: number; met: boolean; label: string }
  deadline: { at: string | null; expired: boolean; label: string }
  /** What this viewer personally still owes the case. */
  awaiting: string
  cta: { label: string; href: string }
  lastDecision: string | null
  approvalsOutstanding: number
}

const STAGE_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  deliberation: 'Deliberating',
  synthesis: 'Synthesis',
  voting: 'Voting',
  ruled: 'Ruled',
  approved: 'Approved',
  released: 'Released',
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'closed'
  const minutes = Math.floor(ms / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, '0')}m`
  return `${mins}m`
}

function roleOf(input: CaseStatusInput): ViewerRole {
  const id = input.viewerMemberId
  if (!id) return 'observer'
  if (id === input.chairId) return 'chair'
  if (input.approverIds.includes(id)) return 'approver'
  return 'member'
}

/**
 * Everything a person needs to answer "what is this, and do I owe it anything".
 */
export function computeCaseStatus(input: CaseStatusInput): CaseStatus {
  const chamberHref = `/chamber/${input.sessionId}`
  const status = String(input.status)
  const stageLabel = STAGE_LABELS[status] ?? status
  const role = roleOf(input)

  // Positions are only expected once deliberation has actually opened.
  const deliberating = status === 'deliberation'
  const positioned = new Set(deliberating ? input.positionedMemberIds : [])
  const silentMembers = deliberating
    ? input.members.filter((m) => !positioned.has(m.id))
    : []

  const voterSeats = input.votes.map((v) => v.seat)
  const requiredSeatCheck = checkRequiredSeats(voterSeats, input.requiredSeats)
  const quorum = checkQuorum(input.votes.length, input.members.length, input.quorumPct)

  const now = input.now ?? Date.now()
  const deadlineMs = input.deadline ? new Date(input.deadline).getTime() : null
  const expired = deadlineMs !== null && deadlineMs <= now
  const deadline = {
    at: input.deadline,
    expired,
    label:
      deadlineMs === null
        ? 'no deadline set'
        : expired
          ? 'round closed'
          : `closes in ${formatRemaining(deadlineMs - now)}`,
  }

  const quorumLabel =
    status === 'voting' || status === 'ruled' || status === 'approved' || status === 'released'
      ? `${quorum.cast}/${quorum.totalSeats} voted - ${quorum.needed} needed`
      : `${quorum.totalSeats} seats - quorum ${input.quorumPct}%`

  const approvalsOutstanding = approvalsNeeded({
    approvals: input.approverIds.map((id) => ({ approverId: id })),
    required: input.approvalsRequired,
  })

  // --- What does this viewer owe? ------------------------
  let awaiting = 'Nothing - you are up to date'
  let cta: CaseStatus['cta'] = { label: 'Enter chamber', href: chamberHref }

  const viewerPositioned = input.viewerMemberId
    ? positioned.has(input.viewerMemberId)
    : false
  const viewerVoted = input.votes.some((v) => v.memberId === input.viewerMemberId)
  const viewerApproved = input.viewerMemberId
    ? input.approverIds.includes(input.viewerMemberId)
    : false

  if (status === 'briefing') {
    awaiting = role === 'chair' ? 'Open the blind round' : 'Awaiting the chair'
    cta = { label: role === 'chair' ? 'Open deliberation' : 'View briefing', href: chamberHref }
  } else if (deliberating) {
    if (!input.viewerMemberId) {
      awaiting = 'Sign in to take part'
    } else if (!viewerPositioned) {
      awaiting = input.round === 'blind' ? 'Submit your blind position' : 'Submit a position'
    } else {
      awaiting = input.round === 'blind' ? 'Position filed - waiting for reveal' : 'Challenge or revise'
    }
    cta = { label: 'Enter chamber', href: chamberHref }
  } else if (status === 'synthesis') {
    awaiting = role === 'chair' ? 'Close deliberation and draft options' : 'Awaiting options'
    cta = { label: role === 'chair' ? 'Draft options' : 'View synthesis', href: chamberHref }
  } else if (status === 'voting') {
    if (!input.viewerMemberId) awaiting = 'Sign in to vote'
    else if (!viewerVoted) awaiting = 'Cast your vote'
    else awaiting = 'Vote recorded - awaiting the council'
    cta = { label: viewerVoted ? 'View tally' : 'Cast your vote', href: chamberHref }
  } else if (status === 'ruled') {
    if (approvalsOutstanding > 0 && !viewerApproved) {
      awaiting = `Sign the approval - ${approvalsOutstanding} signature(s) outstanding`
    } else if (viewerApproved) {
      awaiting = 'You have signed - awaiting the second signature'
    } else {
      awaiting = `${approvalsOutstanding} signature(s) outstanding`
    }
    cta = { label: 'Review the ruling', href: chamberHref }
  } else if (status === 'approved') {
    if (!viewerApproved && input.viewerMemberId) awaiting = 'Approve for release'
    cta = { label: 'Release as precedent', href: chamberHref }
  } else if (status === 'released') {
    awaiting = 'Closed - this case is released'
    cta = input.precedentId
      ? { label: 'View precedent', href: `/precedents/${input.precedentId}` }
      : { label: 'View case tree', href: `/cases/${input.clauseId}/tree` }
  }

  // --- What was last decided? ---------------------------
  let lastDecision: string | null = null
  if (status === 'released' || status === 'approved' || status === 'ruled') {
    const parts: string[] = []
    if (input.ruling?.holding) parts.push(input.ruling.holding)
    if (input.ruling?.voteSummary) parts.push(input.ruling.voteSummary)
    if (input.ruling?.approvedBy && input.ruling.approvedBy.length > 0) {
      parts.push(`approved by ${input.ruling.approvedBy.join(' and ')}`)
    } else if (approvalsOutstanding === 0 && approvalsOutstanding !== 0) {
      parts.push('fully approved')
    }
    lastDecision = parts.length > 0 ? parts.join(' - ') : null
  }

  return {
    stage: status,
    stageLabel,
    roundLabel:
      status === 'deliberation' ? (input.round === 'blind' ? 'blind round' : 'open round') : '',
    role,
    chairName: input.chairName,
    silentMembers: silentMembers.map((m) => ({ name: m.name, seat: m.seat })),
    silentCount: silentMembers.length,
    missingRequiredSeats: requiredSeatCheck.missing,
    quorum: { ...quorum, total: quorum.totalSeats, label: quorumLabel },
    deadline,
    awaiting,
    cta,
    lastDecision,
    approvalsOutstanding,
  }
}
