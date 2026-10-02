export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity/client'

/** Employee upvote / downvote on an official policy update. */
export async function POST(req: Request) {
  try {
    const { id, dir } = (await req.json()) as { id?: string; dir?: 'up' | 'down' }
    if (!id || (dir !== 'up' && dir !== 'down')) {
      return NextResponse.json({ error: 'Provide id and dir ("up" | "down")' }, { status: 400 })
    }
    const field = dir === 'up' ? 'upvotes' : 'downvotes'
    const updated = await sanityWriteClient
      .patch(id)
      .setIfMissing({ upvotes: 0, downvotes: 0 })
      .inc({ [field]: 1 })
      .commit({ returnDocuments: true } as any) as unknown as { upvotes: number; downvotes: number }

    return NextResponse.json({ success: true, upvotes: updated?.upvotes ?? 0, downvotes: updated?.downvotes ?? 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
