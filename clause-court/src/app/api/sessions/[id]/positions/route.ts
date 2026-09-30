import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity/client'
import { getActiveMember, getSession, needToken, ruleError } from '@/lib/council/api'
import { assertPositionAllowed } from '@/lib/council/sessionFlow'
import { CouncilRuleError } from '@/lib/council/tally'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const STANCES = ['support-A', 'support-B', 'custom']

// POST /api/sessions/[id]/positions — submit (or revise) a structured position.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const blocked = needToken()
  if (blocked) return blocked
  const { id } = await ctx.params
  try {
    const body = (await req.json()) as {
      memberId?: string
      stance?: string
      proposedValue?: number
      unit?: string
      rationale?: string
      confidence?: number
      basisNote?: string
      respondsTo?: string
      revisionOf?: string
    }
    if (!body.memberId) {
      return NextResponse.json({ error: 'memberId is required — pick an identity first.' }, { status: 400 })
    }
    const member = await getActiveMember(body.memberId)
    const session = await getSession(id)
    if (session.status !== 'deliberation') {
      throw new CouncilRuleError(`Positions are taken during deliberation, not ${session.status}.`)
    }
    if (!body.stance || !STANCES.includes(body.stance)) {
      return NextResponse.json({ error: 'stance must be support-A, support-B or custom.' }, { status: 400 })
    }
    if (typeof body.proposedValue !== 'number' || Number.isNaN(body.proposedValue)) {
      return NextResponse.json({ error: 'proposedValue must be a number.' }, { status: 400 })
    }
    if (!body.unit || body.unit.trim().length === 0) {
      return NextResponse.json({ error: 'unit is required (e.g. business_hours).' }, { status: 400 })
    }
    const confidence = body.confidence ?? 3
    if (!Number.isInteger(confidence) || confidence < 1 || confidence > 5) {
      return NextResponse.json({ error: 'confidence must be an integer 1–5.' }, { status: 400 })
    }

    const round = session.round ?? 'blind'
    const existing: Array<{ _id: string; memberId: string; revised: boolean }> =
      await sanityClient.fetch(
        `*[_type == "position" && session._ref == $id && round == $round]{
          _id,
          "memberId": member._ref,
          "revised": count(*[_type == "position" && revisionOf._ref == ^._id]) > 0
        }`,
        { id, round }
      )
    const live = existing.filter((p) => !p.revised)
    assertPositionAllowed({
      memberId: member._id,
      round: round === 'open' ? 'open' : 'blind',
      positionedMemberIds: live.map((p) => p.memberId),
      revisionOf: body.revisionOf ?? null,
    })

    if (body.revisionOf) {
      const original = live.find((p) => p._id === body.revisionOf)
      if (!original || original.memberId !== member._id) {
        throw new CouncilRuleError('A revision must point at your own live position.')
      }
    }
    if (body.respondsTo) {
      const target = await sanityClient.fetch<{ _id: string } | null>(
        `*[_type == "position" && _id == $rid && session._ref == $sid][0]{_id}`,
        { rid: body.respondsTo, sid: id }
      )
      if (!target) {
        return NextResponse.json({ error: 'respondsTo names a position outside this session.' }, { status: 400 })
      }
    }

    const created = await sanityClient.create({
      _type: 'position',
      member: { _type: 'reference', _ref: member._id },
      clause: { _type: 'reference', _ref: session.clauseId },
      session: { _type: 'reference', _ref: id },
      stance: body.stance,
      proposedValue: body.proposedValue,
      unit: body.unit.trim(),
      rationale: (body.rationale ?? '').trim(),
      confidence,
      basisPrecedent: [],
      basisNote: (body.basisNote ?? '').trim() || null,
      respondsTo: body.respondsTo ? { _type: 'reference', _ref: body.respondsTo } : undefined,
      revisionOf: body.revisionOf ? { _type: 'reference', _ref: body.revisionOf } : undefined,
      round,
    })
    return NextResponse.json({ id: created._id, round }, { status: 201 })
  } catch (e) {
    return ruleError(e)
  }
}
