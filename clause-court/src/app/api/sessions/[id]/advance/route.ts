import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity/client'
import {
  appendClauseLog,
  assertSameActor,
  getSession,
  needToken,
  requireViewer,
  ruleError,
} from '@/lib/council/api'
import {
  assertCanOpenVote,
  assertCanSynthesize,
  assertSessionTransition,
  type SessionStatus,
} from '@/lib/council/sessionFlow'
import {
  evaluateResult,
  validateApprovals,
  CouncilRuleError,
} from '@/lib/council/tally'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ref = (id: string) => ({ _type: 'reference' as const, _ref: id })

// POST /api/sessions/[id]/advance — move the session, with guards.
// { to, actorMemberId, round?, optionId?, note? }
// Reveal is { to: "deliberation", round: "open" } by the chair.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const blocked = needToken()
  if (blocked) return blocked
  const { id } = await ctx.params
  try {
    const body = (await req.json()) as {
      to?: string
      actorMemberId?: string
      round?: string
      optionId?: string
      note?: string
    }
    if (!body.to) {
      return NextResponse.json({ error: 'to is required.' }, { status: 400 })
    }

    // Advancing is the most privileged action in the app - it reveals blind
    // rounds and moves the vote - and every transition below is gated on the
    // actor being the chair. So the actor comes from the verified cookie, and a
    // body-declared actor is only ever checked against it.
    const actor = await requireViewer()
    assertSameActor(body.actorMemberId, actor._id, 'actorMemberId')
    const session = await getSession(id)
    const isChair = actor._id === session.chairId
    // The chair is barred from approval steps; everyone else acts as approver
    // there and as an ordinary member elsewhere.
    const role = isChair ? 'chair' : ['ruled', 'approved'].includes(body.to) ? 'approver' : 'member'
    if (isChair && ['ruled', 'approved'].includes(body.to)) {
      throw new CouncilRuleError('The chair holds a procedural role and cannot approve.')
    }

    // Reveal: same-status round change inside deliberation.
    if (body.to === 'deliberation' && session.status === 'deliberation' && body.round) {
      if (!isChair) throw new CouncilRuleError('Only the chair can reveal the blind round.')
      if (body.round !== 'open') {
        return NextResponse.json({ error: 'round must be "open" to reveal.' }, { status: 400 })
      }
      if (session.round === 'open') {
        throw new CouncilRuleError('Positions are already revealed.')
      }
      await sanityClient.patch(id).set({ round: 'open' }).commit()
      return NextResponse.json({ status: 'deliberation', round: 'open' })
    }

    assertSessionTransition(
      session.status,
      body.to as SessionStatus,
      role as 'chair' | 'member' | 'approver'
    )
    const to = body.to as SessionStatus

    if (to === 'deliberation') {
      await sanityClient.patch(id).set({ status: 'deliberation', round: 'blind' }).commit()
      return NextResponse.json({ status: 'deliberation', round: 'blind' })
    }

    if (to === 'synthesis') {
      const count: number = await sanityClient.fetch(
        `count(*[_type == "position" && session._ref == $id])`,
        { id }
      )
      assertCanSynthesize(count)
      await sanityClient.patch(id).set({ status: 'synthesis' }).commit()
      return NextResponse.json({ status: 'synthesis' })
    }

    if (to === 'voting') {
      const count: number = await sanityClient.fetch(
        `count(*[_type == "councilOption" && session._ref == $id])`,
        { id }
      )
      assertCanOpenVote(count)
      await sanityClient.patch(id).set({ status: 'voting' }).commit()
      return NextResponse.json({ status: 'voting' })
    }

    if (to === 'ruled') {
      return recordCouncilRuling(id, session, actor.name, body.optionId, body.note)
    }

    if (to === 'approved') {
      const approvals: Array<{ approverId: string; approverName: string }> =
        await sanityClient.fetch(
          `*[_type == "approval" && session._ref == $id]{
            "approverId": approver._ref, "approverName": approver->name
          }`,
          { id }
        )
      validateApprovals(approvals, {
        authorName: session.clauseSubmittedBy,
        chairId: session.chairId ?? '',
      })
      await sanityClient.patch(id).set({ status: 'approved' }).commit()
      await setClauseStatus(session.clauseId, 'resolved', actor.name, body.note, 'ruled', 'resolved')
      return NextResponse.json({ status: 'approved' })
    }

    if (to === 'released') {
      await sanityClient.patch(id).set({ status: 'released' }).commit()
      await setClauseStatus(session.clauseId, 'published', actor.name, body.note, 'resolved', 'published')
      return NextResponse.json({ status: 'released' })
    }

    return NextResponse.json({ error: 'Unhandled transition.' }, { status: 400 })
  } catch (e) {
    return ruleError(e)
  }
}

async function setClauseStatus(
  clauseId: string,
  status: string,
  actor: string,
  note: string | undefined,
  from: string,
  to: string
): Promise<void> {
  await sanityClient.patch(clauseId).set({ status }).commit()
  await appendClauseLog(clauseId, {
    from,
    to,
    actor,
    actorType: 'human',
    note: note || `Council session moved the clause ${from} → ${to}.`,
  })
}

async function recordCouncilRuling(
  sessionId: string,
  session: Awaited<ReturnType<typeof getSession>>,
  actorName: string,
  optionId: string | undefined,
  note: string | undefined
): Promise<NextResponse> {
  if (!optionId) {
    return NextResponse.json(
      { error: 'optionId is required — the chair records the winning option.' },
      { status: 400 }
    )
  }

  const [option, votes, members, clause] = await Promise.all([
    sanityClient.fetch<{
      _id: string
      title: string
      wording: string
      value: number | null
      unit: string | null
    } | null>(
      `*[_type == "councilOption" && _id == $oid && session._ref == $sid][0]{
        _id, title, wording, value, unit
      }`,
      { oid: optionId, sid: sessionId }
    ),
    sanityClient.fetch<Array<{ memberId: string; seat: string; optionId: string }>>(
      `*[_type == "vote" && session._ref == $sid]{
        "memberId": member._ref, "seat": member->seat, "optionId": option._ref
      }`,
      { sid: sessionId }
    ),
    sanityClient.fetch<Array<{ _id: string }>>(
      `*[_type == "councilMember" && active == true]{_id}`
    ),
    sanityClient.fetch<{
      _id: string
      title: string
      terms: string[]
      cited: string[]
    } | null>(
      `*[_type == "clause" && _id == $cid][0]{
        _id, title,
        "terms": ambiguitySignals[].term,
        "cited": citedPrecedent[]._ref
      }`,
      { cid: session.clauseId }
    ),
  ])

  if (!option) {
    return NextResponse.json({ error: 'Option not found in this session.' }, { status: 404 })
  }
  if (!clause) {
    return NextResponse.json({ error: 'Clause not found.' }, { status: 404 })
  }

  const optionIds: string[] = await sanityClient.fetch(
    `*[_type == "councilOption" && session._ref == $sid]._id`,
    { sid: sessionId }
  )
  const evaluation = evaluateResult(
    votes,
    optionIds,
    {
      totalSeats: members.length,
      quorumPct: session.quorumPct,
      thresholdPct: session.thresholdPct,
      requiredSeats: session.requiredSeats,
    }
  )
  if (!evaluation.passes || evaluation.winnerId !== optionId) {
    throw new CouncilRuleError(
      `No valid result to record: ${evaluation.reasons.join(' ') || 'the vote does not carry.'}`
    )
  }

  const dissenters = [...new Set(votes.filter((v) => v.optionId !== optionId).map((v) => v.memberId))]
  const ruling = await sanityClient.create({
    _type: 'ruling',
    clause: ref(session.clauseId),
    customRuling: option.wording,
    reasoning:
      note?.trim() ||
      `Decided by council: ${evaluation.tally[optionId]} of ${votes.length} votes (${evaluation.winnerSharePct.toFixed(1)}%). Required seats heard.`,
    judgeName: 'Policy Council',
    session: ref(sessionId),
    tally: {
      winnerOption: option.title,
      votesCast: votes.length,
      winnerSharePct: Math.round(evaluation.winnerSharePct * 10) / 10,
      requiredSeatsMet: evaluation.requiredSeats.met,
    },
    dissentingMembers: dissenters.map(ref),
  })

  const rest = votes.length - evaluation.tally[optionId]
  const precedent = await sanityClient.create({
    _type: 'precedent',
    ruling: ref(ruling._id),
    sourceClause: ref(session.clauseId),
    title: `${clause.title} — ${option.title}`,
    holding: option.wording,
    reasoning: `Council holding carried ${evaluation.tally[optionId]} to ${rest}.`,
    applicableTerms: [...new Set((clause.terms ?? []).map((t) => String(t).toLowerCase()))].slice(0, 8),
    citesPrecedent: (clause.cited ?? []).map(ref),
    relevanceScore: 0,
    citationCount: 0,
    council: ref(session.councilId),
    voteSummary: `decided by council, ${evaluation.tally[optionId]} to ${rest}`,
    status: 'active',
  })
  await sanityClient.patch(ruling._id).set({ precedentId: precedent._id }).commit()

  await sanityClient
    .patch(session.clauseId)
    .set({ status: 'ruled', currentRuling: ref(ruling._id) })
    .commit()
  await appendClauseLog(session.clauseId, {
    from: 'debated',
    to: 'ruled',
    actor: `Policy Council (recorded by ${actorName})`,
    actorType: 'human',
    note: option.wording,
  })
  await sanityClient.patch(sessionId).set({ status: 'ruled' }).commit()

  return NextResponse.json(
    { status: 'ruled', rulingId: ruling._id, precedentId: precedent._id, evaluation },
    { status: 201 }
  )
}
