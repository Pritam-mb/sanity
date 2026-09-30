import { NextResponse } from 'next/server'
import { sanityClient } from '@/lib/sanity/client'

// GET /api/members — active council members for the identity switcher.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const members = await sanityClient.fetch(
      `*[_type == "councilMember" && active == true] | order(name asc) {_id, name, seat}`
    )
    return NextResponse.json({ members })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load members.' },
      { status: 500 }
    )
  }
}
