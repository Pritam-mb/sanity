import { NextResponse } from 'next/server'
import { seedDemoData } from '@/lib/seed/seed'

// Seeding is a write against every document type, so it must never be cached
// and must never run on a plain page load.
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/seed — one-click demo reset.
 *
 * Wipes the dataset and rebuilds the demo from source, including running the
 * deterministic ambiguity engine so the dashboard reports real signal counts
 * the moment the page reloads.
 */
export async function POST() {
  if (!process.env.SANITY_API_TOKEN) {
    return NextResponse.json(
      {
        error:
          'SANITY_API_TOKEN is not set. Seeding requires a write token — add it to .env.local.',
      },
      { status: 503 }
    )
  }

  try {
    const result = await seedDemoData()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown seed error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
