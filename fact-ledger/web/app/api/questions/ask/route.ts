export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity/client'

/** Employee asks a question about a policy. */
export async function POST(req: Request) {
  try {
    const { question, askedBy, linkedFactId, linkedPageId } = (await req.json()) as {
      question?: string
      askedBy?: string
      linkedFactId?: string
      linkedPageId?: string
    }
    if (!question?.trim() || !askedBy?.trim()) {
      return NextResponse.json({ error: 'Question and your name are required' }, { status: 400 })
    }
    const created = await sanityWriteClient.create({
      _type: 'policyQuestion',
      question: question.trim(),
      askedBy: askedBy.trim(),
      ...(linkedFactId ? { linkedFact: { _type: 'reference', _ref: linkedFactId } } : {}),
      ...(linkedPageId ? { linkedPage: { _type: 'reference', _ref: linkedPageId } } : {}),
      status: 'open',
      helpful: 0,
      askedAt: new Date().toISOString(),
    })
    return NextResponse.json({ success: true, id: created._id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
