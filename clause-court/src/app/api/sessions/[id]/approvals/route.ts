import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity/client'
import { getActiveMember, getSession, needToken, ruleError } from '@/lib/council/api'
import { approvalsNeeded } from '@/lib/council/sessionFlow'
import { CouncilRuleError } from '@/lib/council/tally'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST /api/sessions/[id]/approvals — sign under the two-person rule.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const blocked = needToken()
  if (blocked) return blocked
  const { id } = await ctx.params
  try {
    const body = (await req.json()) as { approverId?: string; note?: string }
    if (!body.approverId) {
      return NextResponse.json({ error: 'approverId is required.' }, { status: 400 })
    }
    const approver = await getActiveMember(body.approverId)
    const session = await getSession(id)
    if (session.status !== 'ruled') {
      throw new CouncilRuleError(`Signatures are taken once ruled, not ${session.status}.`)
    }
    if (approver._id === session.chairId) {
      throw new CouncilRuleError('The chair holds a procedural role and cannot approve.')
    }
    if (approver.name.trim().toLowerCase() === session.clauseSubmittedBy.trim().toLowerCase()) {
      throw new CouncilRuleError('The author cannot approve their own case.')
    }

    const existing: Array<{ approverId: string }> = await sanityClient.fetch(
      `*[_type == "approval" && session._ref == $id]{"approverId": approver._ref}`,
      { id }
    )
    if (existing.some((a) => a.approverId === approver._id)) {
      throw new CouncilRuleError('This approver has already signed — the two signatures must differ.')
    }

    const created = await sanityClient.create({
      _type: 'approval',
      session: { _type: 'reference', _ref: id },
      approver: { _type: 'reference', _ref: approver._id },
      note: (body.note ?? '').trim() || undefined,
    })
    const remaining = approvalsNeeded({
      approvals: [...existing.map((a) => ({ approverId: a.approverId })), { approverId: approver._id }],
      required: 2,
    })
    return NextResponse.json({ id: created._id, remaining }, { status: 201 })
  } catch (e) {
    return ruleError(e)
  }
}
