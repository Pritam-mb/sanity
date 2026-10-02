export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity/client'

/** Official posts a new policy update / news item. */
export async function POST(req: Request) {
  try {
    const { title, kind, summary, author, linkedFactId, linkedPageId } = (await req.json()) as {
      title?: string
      kind?: string
      summary?: string
      author?: string
      linkedFactId?: string
      linkedPageId?: string
    }
    if (!title?.trim() || !summary?.trim()) {
      return NextResponse.json({ error: 'Title and summary are required' }, { status: 400 })
    }
    const now = new Date().toISOString()
    const created = await sanityWriteClient.create({
      _type: 'policyUpdate',
      title: title.trim(),
      kind: kind === 'policy-change' || kind === 'notice' ? kind : 'news',
      summary: summary.trim(),
      author: author?.trim() || 'Policy Office',
      ...(linkedFactId ? { linkedFact: { _type: 'reference', _ref: linkedFactId } } : {}),
      ...(linkedPageId ? { linkedPage: { _type: 'reference', _ref: linkedPageId } } : {}),
      status: 'published',
      upvotes: 0,
      downvotes: 0,
      publishedAt: now,
    })
    return NextResponse.json({ success: true, id: created._id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
