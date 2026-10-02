import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity/client'
import { assertSameActor, getSession, needToken, requireViewer, ruleError } from '@/lib/council/api'
import { CouncilRuleError } from '@/lib/council/tally'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const KINDS = ['support', 'challenge', 'question']

// POST /api/sessions/[id]/comments — threaded reply, optionally on a position.
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
      kind?: string
      body?: string
      targetPositionId?: string
    }
    const member = await requireViewer()
    assertSameActor(body.memberId, member._id)
    const session = await getSession(id)
    if (!['deliberation', 'synthesis'].includes(session.status)) {
      throw new CouncilRuleError(`Replies are taken during deliberation, not ${session.status}.`)
    }
    if (!body.kind || !KINDS.includes(body.kind)) {
      return NextResponse.json({ error: 'kind must be support, challenge or question.' }, { status: 400 })
    }
    if (!body.body || body.body.trim().length === 0) {
      return NextResponse.json({ error: 'A reply body is required.' }, { status: 400 })
    }
    if (body.targetPositionId) {
      const target = await sanityClient.fetch<{ _id: string } | null>(
        `*[_type == "position" && _id == $rid && session._ref == $sid][0]{_id}`,
        { rid: body.targetPositionId, sid: id }
      )
      if (!target) {
        return NextResponse.json({ error: 'Reply target is outside this session.' }, { status: 400 })
      }
    }

    const created = await sanityClient.create({
      _type: 'comment',
      session: { _type: 'reference', _ref: id },
      author: { _type: 'reference', _ref: member._id },
      targetPosition: body.targetPositionId
        ? { _type: 'reference', _ref: body.targetPositionId }
        : undefined,
      kind: body.kind,
      body: body.body.trim(),
      actorAuth: member.auth,
    })
    return NextResponse.json({ id: created._id }, { status: 201 })
  } catch (e) {
    return ruleError(e)
  }
}
