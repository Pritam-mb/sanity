import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity/client'
import { getActiveMember, getSession, needToken, ruleError } from '@/lib/council/api'
import { assertVote, evaluateResult, CouncilRuleError } from '@/lib/council/tally'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST /api/sessions/[id]/votes — cast one vote, get the live evaluation back.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const blocked = needToken()
  if (blocked) return blocked
  const { id } = await ctx.params
  try {
    const body = (await req.json()) as { memberId?: string; optionId?: string }
    if (!body.memberId || !body.optionId) {
      return NextResponse.json({ error: 'memberId and optionId are required.' }, { status: 400 })
    }
    const member = await getActiveMember(body.memberId)
    const session = await getSession(id)
    if (session.status !== 'voting') {
      throw new CouncilRuleError(`Votes are taken while voting, not ${session.status}.`)
    }

    const [optionIds, existing] = await Promise.all([
      sanityClient.fetch<string[]>(
        `*[_type == "councilOption" && session._ref == $id]._id`,
        { id }
      ),
      sanityClient.fetch<Array<{ memberId: string; seat: string; optionId: string }>>(
        `*[_type == "vote" && session._ref == $id]{
          "memberId": member._ref, "seat": member->seat, "optionId": option._ref
        }`,
        { id }
      ),
    ])

    assertVote(
      { memberId: member._id, seat: member.seat, optionId: body.optionId },
      existing,
      optionIds
    )

    await sanityClient.create({
      _type: 'vote',
      session: { _type: 'reference', _ref: id },
      member: { _type: 'reference', _ref: member._id },
      option: { _type: 'reference', _ref: body.optionId },
    })

    const after = [
      ...existing,
      { memberId: member._id, seat: member.seat, optionId: body.optionId },
    ]
    const members = await sanityClient.fetch<Array<{ _id: string }>>(
      `*[_type == "councilMember" && active == true]{_id}`
    )
    const evaluation = evaluateResult(
      after,
      optionIds,
      {
        totalSeats: members.length,
        quorumPct: session.quorumPct,
        thresholdPct: session.thresholdPct,
        requiredSeats: session.requiredSeats,
      }
    )
    return NextResponse.json({ evaluation }, { status: 201 })
  } catch (e) {
    return ruleError(e)
  }
}
