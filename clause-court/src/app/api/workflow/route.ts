import { sanityClient } from '@/lib/sanity/client'
import { advanceClauseWorkflow } from '@/lib/ruling/createRuling'
import { recountCitations } from '@/lib/seed/seed'
import {
  availableTransitions,
  isWorkflowState,
  WORKFLOW_STATE_META,
  WorkflowViolationError,
} from '@/sanity/workflow'

export const dynamic = 'force-dynamic'

/**
 * GET /api/workflow?clauseId=…
 * Returns the steps a human is currently allowed to take. The UI renders this
 * rather than hardcoding a list, so the button set can never offer a move the
 * state machine would reject.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const clauseId = searchParams.get('clauseId')

  if (!clauseId) {
    return Response.json(
      { error: 'clauseId is required' },
      { status: 400 }
    )
  }

  const clause = await sanityClient.getDocument(clauseId)
  if (!clause) {
    return Response.json({ error: 'Clause not found' }, { status: 404 })
  }

  const status = clause.status
  if (!isWorkflowState(status)) {
    return Response.json({ error: 'Unknown workflow state' }, { status: 409 })
  }

  return Response.json({
    status,
    meta: WORKFLOW_STATE_META[status],
    transitionLog: clause.transitionLog ?? [],
    transitions: availableTransitions(status, 'human').map((t) => ({
      to: t.to,
      label: t.label,
      description: t.description,
    })),
  })
}

/**
 * POST /api/workflow — perform one human-authorised transition.
 *
 * This is the human approval gate. `ruled → resolved` cannot be reached by any
 * other route in the app: the ruling pipeline stops at `ruled` on purpose.
 */
export async function POST(req: Request) {
  let body: { clauseId?: string; to?: string; actor?: string; note?: string }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Request body must be JSON' }, { status: 400 })
  }

  const { clauseId, to, actor, note } = body
  if (!clauseId || !to) {
    return Response.json(
      { error: 'clauseId and to are required' },
      { status: 400 }
    )
  }

  try {
    const result = await advanceClauseWorkflow(clauseId, to, { actor, note })

    // Publishing a case is the moment its precedent stops being a private note
    // and becomes citable, so the lineage is re-derived here too.
    if (result.to === 'published' || result.to === 'resolved') {
      await recountCitations()
    }

    return Response.json({ success: true, ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Transition failed'

    if (error instanceof WorkflowViolationError) {
      return Response.json(
        { error: message, from: error.from, to: error.to },
        { status: 409 }
      )
    }

    return Response.json({ error: message }, { status: 500 })
  }
}
