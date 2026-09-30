import { NextResponse } from 'next/server'
import { getSessionBundle } from '@/lib/council/chamber'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/sessions/[id]?viewer=memberId — full chamber bundle with
// blind-round filtering applied for the viewer.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const { searchParams } = new URL(_req.url)
  const viewer = searchParams.get('viewer')
  try {
    const bundle = await getSessionBundle(id, viewer)
    if (!bundle) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }
    return NextResponse.json(bundle)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load session.' },
      { status: 500 }
    )
  }
}
