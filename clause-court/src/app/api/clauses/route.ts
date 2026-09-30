import { NextResponse } from 'next/server'
import { sanityClient, STANDARDS_QUERY } from '@/lib/sanity/client'
import { detectAmbiguity, type CompanyStandard } from '@/lib/ambiguity/detector'

// POST /api/clauses — submit a new case from the app.
//
// Anyone can put a case forward; no Studio needed. The deterministic engine
// scans the text at creation time, so the clause lands in the correct state
// (`flagged` with signals, or `draft`) exactly as the seeder would place it.
export async function POST(req: Request) {
  if (!process.env.SANITY_API_TOKEN) {
    return NextResponse.json(
      { error: 'Case submission is unavailable — the server has no Sanity write token.' },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { title, text, category, submittedBy } = (body ?? {}) as Record<string, unknown>

  if (typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'A case title is required.' }, { status: 400 })
  }
  if (typeof text !== 'string' || text.trim().length < 20) {
    return NextResponse.json(
      { error: 'Clause text is required (at least 20 characters so the scan has something to inspect).' },
      { status: 400 }
    )
  }
  if (typeof submittedBy !== 'string' || submittedBy.trim().length === 0) {
    return NextResponse.json(
      { error: 'Your name is required — every case must show who put it forward.' },
      { status: 400 }
    )
  }

  const cleanTitle = title.trim()
  const cleanText = text.trim()
  const cleanAuthor = submittedBy.trim()
  const cleanCategory =
    typeof category === 'string' && category.trim().length > 0 ? category.trim() : 'General'

  const report = detectAmbiguity(
    cleanText,
    [],
    await sanityClient.fetch<CompanyStandard[]>(STANDARDS_QUERY).catch(() => [])
  )
  const status = report.flagged ? 'flagged' : 'draft'
  const now = new Date().toISOString()
  const slug = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'case'

  try {
    const created = await sanityClient.create({
      _type: 'clause',
      _id: `clause-${slug}-${Date.now().toString(36)}`,
      title: cleanTitle,
      text: cleanText,
      category: cleanCategory,
      caseNumber: `#${String(Math.floor(1000 + Math.random() * 9000))}`,
      submittedBy: cleanAuthor,
      status,
      ambiguitySignals: report.signals,
      definitions: [],
      debates: [],
      currentRuling: null,
      transitionLog: [
        {
          _key: `tl-submit-${Date.now()}`,
          from: 'created',
          to: 'draft',
          actor: cleanAuthor,
          actorType: 'human',
          timestamp: now,
          note: 'Case submitted for review.',
        },
        ...(status === 'flagged'
          ? [
              {
                _key: `tl-flag-${Date.now()}`,
                from: 'draft',
                to: 'flagged',
                actor: 'Deterministic Ambiguity Engine',
                actorType: 'deterministic',
                timestamp: now,
                note: `Flagged with ${report.signals.length} inspectable ambiguity signal${report.signals.length === 1 ? '' : 's'}.`,
              },
            ]
          : []),
      ],
    })

    return NextResponse.json(
      { id: created._id, status, flagged: report.flagged, signals: report.signals.length },
      { status: 201 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to submit the case.' },
      { status: 500 }
    )
  }
}
