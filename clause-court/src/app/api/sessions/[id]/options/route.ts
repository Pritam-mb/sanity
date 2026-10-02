import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity/client'
import { assertSameActor, getSession, needToken, requireViewer, ruleError } from '@/lib/council/api'
import { CouncilRuleError } from '@/lib/council/tally'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST /api/sessions/[id]/options — draft a votable option (member or AI).
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
      title?: string
      wording?: string
      value?: number
      unit?: string
      source?: string
      modelInfo?: string
    }
    const member = await requireViewer()
    assertSameActor(body.memberId, member._id)
    const session = await getSession(id)
    if (session.status !== 'synthesis') {
      throw new CouncilRuleError(`Options are drafted during synthesis, not ${session.status}.`)
    }
    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json({ error: 'A title is required.' }, { status: 400 })
    }
    if (!body.wording || body.wording.trim().length === 0) {
      return NextResponse.json({ error: 'The exact holding wording is required.' }, { status: 400 })
    }
    const source = body.source === 'ai' ? 'ai' : 'member'
    if (source === 'ai' && (!body.modelInfo || body.modelInfo.trim().length === 0)) {
      return NextResponse.json(
        { error: 'AI drafts must record modelInfo (model + prompt version).' },
        { status: 400 }
      )
    }

    const created = await sanityClient.create({
      _type: 'councilOption',
      session: { _type: 'reference', _ref: id },
      title: body.title.trim(),
      wording: body.wording.trim(),
      value: typeof body.value === 'number' ? body.value : null,
      unit: (body.unit ?? '').trim() || null,
      source,
      draftedBy: source === 'member' ? { _type: 'reference', _ref: member._id } : undefined,
      modelInfo: source === 'ai' ? body.modelInfo!.trim() : undefined,
      actorAuth: member.auth,
    })
    return NextResponse.json({ id: created._id }, { status: 201 })
  } catch (e) {
    return ruleError(e)
  }
}
