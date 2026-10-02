import { NextResponse } from 'next/server'
import { getTreeSessionsData } from '@/lib/treeData'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sessions = await getTreeSessionsData()
    return NextResponse.json({
      success: true,
      sessions,
    })
  } catch (error: any) {
    console.error('Failed to generate tree data:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
