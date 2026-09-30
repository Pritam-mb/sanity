import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity/client'
import { CouncilRuleError } from '@/lib/council/tally'

export function needToken(): NextResponse | null {
  if (!process.env.SANITY_API_TOKEN) {
    return NextResponse.json(
      { error: 'Write token missing — the server cannot record council actions.' },
      { status: 503 }
    )
  }
  return null
}

export interface ActiveMember {
  _id: string
  name: string
  seat: string
}

export async function getActiveMember(memberId: string): Promise<ActiveMember> {
  const member = await sanityClient.fetch<ActiveMember | null>(
    `*[_type == "councilMember" && _id == $id && active == true][0]{_id, name, seat}`,
    { id: memberId }
  )
  if (!member) {
    throw new CouncilRuleError('Unknown or inactive council member — a vote from someone without a seat is refused.')
  }
  return member
}

export interface SessionDoc {
  _id: string
  status: string
  round: string | null
  clauseId: string
  councilId: string
  chairId: string | null
  quorumPct: number
  thresholdPct: number
  requiredSeats: string[]
  clauseSubmittedBy: string
}

export async function getSession(sessionId: string): Promise<SessionDoc> {
  const session = await sanityClient.fetch<{
    _id: string
    status: string
    round: string | null
    clauseId: string
    councilId: string
    chairId: string | null
    quorumPct: number
    thresholdPct: number
    requiredSeats: string[]
    clauseSubmittedBy: string | null
  } | null>(
    `*[_type == "session" && _id == $id][0]{
      _id, status, round,
      "clauseId": clause._ref,
      "councilId": council._ref,
      "chairId": council->chair._ref,
      "quorumPct": coalesce(council->quorumPct, 60),
      "thresholdPct": coalesce(council->thresholdPct, 50),
      "requiredSeats": coalesce(council->requiredSeats, []),
      "clauseSubmittedBy": clause->submittedBy
    }`,
    { id: sessionId }
  )
  if (!session) throw new CouncilRuleError('Session not found.')
  return { ...session, clauseSubmittedBy: session.clauseSubmittedBy ?? '' }
}

export function ruleError(e: unknown): NextResponse {
  if (e instanceof CouncilRuleError) {
    return NextResponse.json({ error: e.message }, { status: 409 })
  }
  return NextResponse.json(
    { error: e instanceof Error ? e.message : 'Request failed.' },
    { status: 500 }
  )
}

export function appendClauseLog(
  clauseId: string,
  entry: { from: string; to: string; actor: string; actorType: 'human' | 'deterministic' | 'system'; note?: string }
): Promise<unknown> {
  return sanityClient
    .patch(clauseId)
    .setIfMissing({ transitionLog: [] })
    .append('transitionLog', [{ ...entry, _key: `tl-${Date.now()}`, timestamp: new Date().toISOString() }])
    .commit()
}
