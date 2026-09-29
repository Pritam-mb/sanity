import { sanityClient, CLAUSE_BY_ID_QUERY } from '@/lib/sanity/client'
import { detectAmbiguity } from '@/lib/ambiguity/detector'
import { runDebate } from '@/lib/debate/runDebate'
import { DebateQualityError } from '@/lib/debate/quality'
import type { AmbiguitySignal } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Non-streaming hearing.
 *
 * The browser uses `/api/debate/stream` instead; this endpoint exists for
 * scripted use and for environments where SSE is awkward. Both routes share
 * `runDebate`, so the two paths cannot disagree about what happened.
 */
export async function POST(request: Request) {
  let body: { clauseId?: string; ambiguitySignals?: AmbiguitySignal[] } = {}

  try {
    body = (await request.json()) as typeof body
  } catch {
    // A body is not strictly required if clauseId can come from elsewhere, but
    // it is the only place the id can be supplied at this static path.
    return Response.json(
      { error: 'Request body must be JSON containing clauseId' },
      { status: 400 }
    )
  }

  const { clauseId, ambiguitySignals } = body
  if (typeof clauseId !== 'string' || !clauseId) {
    return Response.json({ error: 'clauseId is required' }, { status: 400 })
  }

  const clause = await sanityClient
    .fetch<{ _id: string; text: string } | null>(CLAUSE_BY_ID_QUERY, { id: clauseId })
    .catch(() => null)

  if (!clause) {
    return Response.json({ error: 'Clause not found' }, { status: 404 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: 'GEMINI_API_KEY is not configured on this server.' },
      { status: 503 }
    )
  }

  // The detector is deterministic, so the server does not trust a supplied
  // signal list unless the caller explicitly provides one.
  const signals: AmbiguitySignal[] =
    Array.isArray(ambiguitySignals) && ambiguitySignals.length > 0
      ? ambiguitySignals
      : detectAmbiguity(clause.text ?? '', []).signals

  try {
    const result = await runDebate(clause._id, clause.text ?? '', signals)

    const citedPrecedent =
      result.citedPrecedentIds.length > 0
        ? await sanityClient.fetch<
            Array<{ _id: string; title: string; holding: string; applicableTerms?: string[] }>
          >(
            `*[_id in $ids]{_id, title, holding, applicableTerms}`,
            { ids: result.citedPrecedentIds }
          )
        : []

    return Response.json({
      debateId: result.debateId,
      clauseId: clause._id,
      status: 'completed',
      interpretationA: {
        _id: result.interpretationAId,
        side: 'A',
        title: result.interpretationA.title,
        summary: result.interpretationA.summary,
        argument: result.interpretationA.argument,
        textualEvidence: result.interpretationA.textualEvidence,
        citedPrecedent: result.interpretationA.precedentUsed,
      },
      interpretationB: {
        _id: result.interpretationBId,
        side: 'B',
        title: result.interpretationB.title,
        summary: result.interpretationB.summary,
        argument: result.interpretationB.argument,
        textualEvidence: result.interpretationB.textualEvidence,
        citedPrecedent: result.interpretationB.precedentUsed,
      },
      citedPrecedentIds: result.citedPrecedentIds,
      citedPrecedent,
      relevantPrecedents: result.relevantPrecedents,
    })
  } catch (error) {
    if (error instanceof DebateQualityError) {
      return Response.json(
        {
          error: 'The advocates did not produce a usable hearing.',
          details: error.report.errors,
          warnings: error.report.warnings,
          droppedQuotes: error.report.droppedQuotes,
          droppedPrecedent: error.report.droppedPrecedent,
        },
        { status: 422 }
      )
    }

    return Response.json(
      {
        error: error instanceof Error ? error.message : 'The hearing failed.',
      },
      { status: 500 }
    )
  }
}
