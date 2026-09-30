import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity/client'
import { getActiveMember, needToken, ruleError } from '@/lib/council/api'
import { CouncilRuleError } from '@/lib/council/tally'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/sessions?clauseId= — sessions deliberating a clause.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const clauseId = searchParams.get('clauseId')
  if (!clauseId) {
    return NextResponse.json({ error: 'clauseId is required.' }, { status: 400 })
  }
  try {
    const sessions = await sanityClient.fetch(
      `*[_type == "session" && clause._ref == $clauseId] | order(_createdAt desc) {
        _id, status, round, deadline,
        "councilName": council->name
      }`,
      { clauseId }
    )
    return NextResponse.json({ sessions })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load sessions.' },
      { status: 500 }
    )
  }
}

// POST /api/sessions — open a deliberation: { clauseId, councilId?, chairMemberId }.
// The chair opens the session; it starts in briefing with the AI hearing.
export async function POST(req: Request) {
  const blocked = needToken()
  if (blocked) return blocked
  try {
    const body = (await req.json()) as {
      clauseId?: string
      councilId?: string
      chairMemberId?: string
    }
    if (!body.clauseId || !body.chairMemberId) {
      return NextResponse.json(
        { error: 'clauseId and chairMemberId are required.' },
        { status: 400 }
      )
    }

    const chair = await getActiveMember(body.chairMemberId)
    const clause = await sanityClient.fetch<{ _id: string; status: string } | null>(
      `*[_type == "clause" && _id == $id][0]{_id, status}`,
      { id: body.clauseId }
    )
    if (!clause) {
      return NextResponse.json({ error: 'Clause not found.' }, { status: 404 })
    }

    const open = await sanityClient.fetch<{ _id: string } | null>(
      `*[_type == "session" && clause._ref == $clauseId && status != "released"][0]{_id}`,
      { clauseId: body.clauseId }
    )
    if (open) {
      throw new CouncilRuleError('This clause already has an open session.')
    }

    const councilId =
      body.councilId ??
      (await sanityClient.fetch<string | null>(
        `*[_type == "council"][0]._id`
      ))
    if (!councilId) {
      return NextResponse.json({ error: 'No council configured.' }, { status: 500 })
    }
    const chairOfRecord: string | null = await sanityClient.fetch(
      `*[_type == "council" && _id == $cid][0].chair._ref`,
      { cid: councilId }
    )
    if (chairOfRecord && chairOfRecord !== chair._id) {
      throw new CouncilRuleError('Only the chair can open a session.')
    }

    const session = await sanityClient.create({
      _type: 'session',
      clause: { _type: 'reference', _ref: body.clauseId },
      council: { _type: 'reference', _ref: councilId },
      status: 'briefing',
      round: null,
    })
    await sanityClient.patch(body.clauseId).set({ session: { _type: 'reference', _ref: session._id } }).commit()

    return NextResponse.json({ id: session._id, openedBy: chair.name }, { status: 201 })
  } catch (e) {
    return ruleError(e)
  }
}
