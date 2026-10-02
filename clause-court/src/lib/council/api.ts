import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity/client'
import { CouncilRuleError } from '@/lib/council/tally'
import { getViewerIdentity } from '@/lib/council/viewer'
import { checkActorClaim } from '@/lib/council/identity'
import type { AuthStrength } from '@/lib/council/identity'

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

/**
 * The member the server has decided is acting.
 *
 * Before v3 every write route took `memberId` from the request body and looked
 * it up. That is not an identity, it is a claim: anyone who knew a member's id
 * could POST their vote, their position or their signature as that member, and
 * every rule in `tally.ts` would pass because the rules trust the actor id they
 * are handed. Signing the cookie changes nothing until the write path reads the
 * cookie, so this is the function that closes it.
 *
 * `auth` rides along so the caller can record how the identity was established.
 */
export interface ActingMember extends ActiveMember {
  auth: AuthStrength
}

export async function requireViewer(): Promise<ActingMember> {
  const identity = await getViewerIdentity()
  if (!identity) {
    throw new CouncilRuleError(
      'Sign in as a council member before acting — this request carries no verified identity.'
    )
  }
  const member = await getActiveMember(identity.memberId)
  return { ...member, auth: identity.auth }
}

/**
 * Reconcile a client-declared actor against the verified one, as a refusal.
 *
 * The decision itself is pure and lives in `identity.ts` so it can be tested
 * without a request; this is the throwing wrapper the routes use.
 */
export function assertSameActor(
  claimed: string | undefined | null,
  verifiedId: string,
  field = 'memberId'
): void {
  const claim = checkActorClaim(claimed, verifiedId, field)
  if (!claim.ok) throw new CouncilRuleError(claim.message)
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
