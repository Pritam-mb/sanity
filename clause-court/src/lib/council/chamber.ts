// =============================================
// CHAMBER DATA — session bundle + your-move queue
// =============================================
//
// Server-side reads for the deliberation chamber and the dashboard.
// Blind-round integrity lives here: in a blind round a position is visible
// only to its author and to the chair. The summary is computed over exactly
// what the viewer may see — never over hidden positions.

import { sanityClient } from '@/lib/sanity/client'
import {
  evaluateResult,
  summarizePositions,
  type CastVote,
  type CouncilRules,
  type PositionPoint,
} from './tally'
import { yourMoveQueue, type OpenSessionRow, type YourMove } from './queue.ts'

export type { OpenSessionRow, YourMove }
export { yourMoveQueue }

export interface ChamberMember {
  _id: string
  name: string
  seat: string
}

export interface ChamberPosition {
  _id: string
  memberId: string
  memberName: string
  memberSeat: string
  stance: string
  proposedValue: number
  unit: string
  rationale: string
  confidence: number
  basisNote: string | null
  round: string
  _createdAt: string
}

export interface ChamberComment {
  _id: string
  authorId: string
  authorName: string
  authorSeat: string
  kind: string
  body: string
  targetPositionId: string | null
  _createdAt: string
}

export interface ChamberOption {
  _id: string
  title: string
  wording: string
  value: number | null
  unit: string | null
  source: string
  draftedByName: string | null
  modelInfo: string | null
  votes: number
}

export interface ChamberBundle {
  session: {
    _id: string
    status: string
    round: string | null
    deadline: string | null
    clause: { _id: string; title: string; caseNumber: string; text: string; status: string; submittedBy: string | null }
    council: { _id: string; name: string; chairId: string | null; quorumPct: number; thresholdPct: number; requiredSeats: string[] }
  }
  members: ChamberMember[]
  positions: ChamberPosition[]
  hiddenPositionCount: number
  comments: ChamberComment[]
  options: ChamberOption[]
  votes: Array<CastVote & { memberName: string }>
  approvals: Array<{ _id: string; approverId: string; approverName: string; note: string | null }>
  summary: ReturnType<typeof summarizePositions>
  summaryScope: 'visible' | 'full'
  evaluation: ReturnType<typeof evaluateResult> | null
  viewerIsChair: boolean
}

const BUNDLE_QUERY = `{
  "session": *[_type == "session" && _id == $id][0]{
    _id, status, round, deadline,
    "clause": clause->{
      _id, title, caseNumber, text, status, submittedBy,
      "signals": coalesce(ambiguitySignals, [])
    },
    "council": council->{
      _id, name,
      "chairId": chair._ref,
      "quorumPct": coalesce(quorumPct, 60),
      "thresholdPct": coalesce(thresholdPct, 50),
      "requiredSeats": coalesce(requiredSeats, [])
    }
  },
  "members": *[_type == "councilMember" && active == true] | order(name asc) {
    _id, name, seat
  },
  "positions": *[_type == "position" && session._ref == $id] | order(_createdAt asc) {
    _id, stance, proposedValue, unit, rationale, confidence, basisNote, round, _createdAt,
    "memberId": member._ref,
    "memberName": member->name,
    "memberSeat": member->seat
  },
  "comments": *[_type == "comment" && session._ref == $id] | order(_createdAt asc) {
    _id, kind, body, _createdAt,
    "authorId": author._ref,
    "authorName": author->name,
    "authorSeat": author->seat,
    "targetPositionId": targetPosition._ref
  },
  "options": *[_type == "councilOption" && session._ref == $id] | order(_createdAt asc) {
    _id, title, wording, value, unit, source, modelInfo,
    "draftedByName": draftedBy->name
  },
  "votes": *[_type == "vote" && session._ref == $id] {
    "memberId": member._ref,
    "memberName": member->name,
    "seat": member->seat,
    "optionId": option._ref
  },
  "approvals": *[_type == "approval" && session._ref == $id] | order(_createdAt asc) {
    _id, note,
    "approverId": approver._ref,
    "approverName": approver->name
  }
}`

interface BundleRows {
  session: ChamberBundle['session'] | null
  members: ChamberMember[]
  positions: ChamberPosition[]
  comments: ChamberComment[]
  options: Array<Omit<ChamberOption, 'votes'>>
  votes: Array<CastVote & { memberName: string }>
  approvals: ChamberBundle['approvals']
}

export async function getSessionBundle(
  sessionId: string,
  viewerMemberId: string | null
): Promise<ChamberBundle | null> {
  const rows = await sanityClient.fetch<BundleRows>(BUNDLE_QUERY, { id: sessionId })
  if (!rows?.session) return null

  const chairId = rows.session.council.chairId
  const viewerIsChair = viewerMemberId !== null && viewerMemberId === chairId
  const blind = (rows.session.round ?? 'blind') === 'blind'

  let visible = rows.positions
  let hiddenPositionCount = 0
  if (blind) {
    visible = rows.positions.filter(
      (p) => viewerIsChair || (viewerMemberId !== null && p.memberId === viewerMemberId)
    )
    hiddenPositionCount = rows.positions.length - visible.length
  }

  const points: PositionPoint[] = visible.map((p) => ({
    memberId: p.memberId,
    seat: p.memberSeat,
    value: p.proposedValue,
    confidence: p.confidence,
  }))

  const rules: CouncilRules = {
    totalSeats: rows.members.length,
    quorumPct: rows.session.council.quorumPct,
    thresholdPct: rows.session.council.thresholdPct,
    requiredSeats: rows.session.council.requiredSeats,
  }
  const optionIds = rows.options.map((o) => o._id)
  const tallyByOption: Record<string, number> = {}
  for (const v of rows.votes) tallyByOption[v.optionId] = (tallyByOption[v.optionId] ?? 0) + 1

  return {
    session: rows.session,
    members: rows.members,
    positions: visible,
    hiddenPositionCount,
    comments: rows.comments,
    options: rows.options.map((o) => ({ ...o, votes: tallyByOption[o._id] ?? 0 })),
    votes: rows.votes,
    approvals: rows.approvals,
    summary: summarizePositions(points),
    summaryScope: blind && !viewerIsChair ? 'visible' : 'full',
    evaluation:
      rows.votes.length > 0 && optionIds.length > 0
        ? evaluateResult(rows.votes, optionIds, rules)
        : null,
    viewerIsChair,
  }
}

export async function getOpenSessions(): Promise<OpenSessionRow[]> {
  return sanityClient
    .fetch<OpenSessionRow[]>(
      `*[_type == "session" && status != "released"] | order(_createdAt desc) [0...50] {
        _id, status, round, deadline,
        "clause": clause->{_id, title, caseNumber, submittedBy},
        "chairId": council->chair._ref,
        "positioned": *[_type == "position" && session._ref == ^._id].member._ref,
        "voters": *[_type == "vote" && session._ref == ^._id].member._ref,
        "approverIds": *[_type == "approval" && session._ref == ^._id].approver._ref
      }`
    )
    .then((res) => (Array.isArray(res) ? res : []))
    .catch(() => [])
}
