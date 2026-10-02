export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/lib/sanity/client'

const ALLOWED = new Set(['open', 'in-review', 'resolved', 'dismissed'])

/** Official responds to / triages a complaint. */
export async function POST(req: Request) {
  try {
    const { id, response, status } = (await req.json()) as {
      id?: string
      response?: string
      status?: string
    }
    if (!id) return NextResponse.json({ error: 'Complaint id is required' }, { status: 400 })
    if (status && !ALLOWED.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const patch: Record<string, unknown> = {}
    if (typeof response === 'string') patch.response = response
    if (status) {
      patch.status = status
      if (status === 'resolved') patch.resolvedAt = new Date().toISOString()
    }
    await sanityWriteClient.patch(id).set(patch).commit()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
