export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity/client'

/** Official answers an employee question. */
export async function POST(req: Request) {
  try {
    const { id, answer, answeredBy } = (await req.json()) as {
      id?: string
      answer?: string
      answeredBy?: string
    }
    if (!id || !answer?.trim()) {
      return NextResponse.json({ error: 'Question id and answer are required' }, { status: 400 })
    }
    await sanityWriteClient
      .patch(id)
      .set({
        answer: answer.trim(),
        answeredBy: answeredBy?.trim() || 'Policy Office',
        status: 'answered',
        answeredAt: new Date().toISOString(),
      })
      .commit()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
