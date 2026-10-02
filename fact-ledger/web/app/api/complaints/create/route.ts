export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity/client'

/** Employee raises a complaint against a specific fact or page. */
export async function POST(req: Request) {
  try {
    const { title, description, category, targetFactId, targetPageId, raisedBy } = (await req.json()) as {
      title?: string
      description?: string
      category?: string
      targetFactId?: string
      targetPageId?: string
      raisedBy?: string
    }
    if (!title?.trim() || !description?.trim() || !raisedBy?.trim()) {
      return NextResponse.json({ error: 'Title, description and your name are required' }, { status: 400 })
    }
    if (!targetFactId && !targetPageId) {
      return NextResponse.json({ error: 'Pick the policy (fact) or page this complaint is about' }, { status: 400 })
    }
    const created = await sanityWriteClient.create({
      _type: 'complaint',
      title: title.trim(),
      description: description.trim(),
      category: category || 'other',
      ...(targetFactId ? { targetFact: { _type: 'reference', _ref: targetFactId } } : {}),
      ...(targetPageId ? { targetPage: { _type: 'reference', _ref: targetPageId } } : {}),
      raisedBy: raisedBy.trim(),
      status: 'open',
      raisedAt: new Date().toISOString(),
    })
    return NextResponse.json({ success: true, id: created._id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
