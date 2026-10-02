export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity/client'

/** Employee marks an answer helpful. */
export async function POST(req: Request) {
  try {
    const { id } = (await req.json()) as { id?: string }
    if (!id) return NextResponse.json({ error: 'Question id is required' }, { status: 400 })
    const updated = await sanityWriteClient
      .patch(id)
      .setIfMissing({ helpful: 0 })
      .inc({ helpful: 1 })
      .commit({ returnDocuments: true } as any) as unknown as { helpful: number }
    return NextResponse.json({ success: true, helpful: updated?.helpful ?? 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
