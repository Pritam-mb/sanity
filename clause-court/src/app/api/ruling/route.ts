import { NextRequest, NextResponse } from 'next/server'
import { createRuling } from '@/lib/ruling/createRuling'
import { WorkflowViolationError } from '@/sanity/workflow'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// =============================================
// POST /api/ruling
// =============================================
//
// Records a human decision. The judge must be named, and either an
// interpretation must have been adopted or a custom holding written — there
// is no path through this endpoint that produces a ruling nobody authored.

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Request body must be JSON' },
      { status: 400 }
    )
  }

  const {
    clauseId,
    debateId,
    selectedSide,
    customRuling,
    reasoning,
    judgeName,
  } = body

  if (typeof clauseId !== 'string' || !clauseId) {
    return NextResponse.json({ error: 'clauseId is required' }, { status: 400 })
  }

  if (typeof debateId !== 'string' || !debateId) {
    return NextResponse.json(
      {
        error:
          'debateId is required — a ruling must reference the hearing it decides, and the advocates are read back from that document',
      },
      { status: 400 }
    )
  }

  if (typeof judgeName !== 'string' || !judgeName.trim()) {
    return NextResponse.json(
      { error: 'A judge name is required — rulings must be attributable to a person' },
      { status: 400 }
    )
  }

  if (selectedSide !== 'A' && selectedSide !== 'B') {
    if (typeof customRuling !== 'string' || !customRuling.trim()) {
      return NextResponse.json(
        {
          error:
            'Choose interpretation A, interpretation B, or write a custom ruling',
        },
        { status: 400 }
      )
    }
  }

  try {
    const { ruling, precedent, citesPrecedent } = await createRuling({
      clauseId,
      debateId,
      selectedSide:
        selectedSide === 'A' || selectedSide === 'B' ? selectedSide : undefined,
      customRuling: typeof customRuling === 'string' ? customRuling : undefined,
      reasoning: typeof reasoning === 'string' ? reasoning : undefined,
      judgeName,
    })

    return NextResponse.json({
      success: true,
      ruling,
      precedent,
      citesPrecedent,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create ruling'

    // A refused transition is the state machine working as designed, not a
    // server fault, so it must not be reported as one.
    if (error instanceof WorkflowViolationError) {
      return NextResponse.json(
        { error: message, from: error.from, to: error.to },
        { status: 409 }
      )
    }

    // A ruling that names a debate with no stored arguments is a bad request
    // too — the client asked to rule on a hearing that does not exist.
    if (
      error instanceof Error &&
      error.message.includes('does not have both advocate arguments')
    ) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    console.error('Ruling creation error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
