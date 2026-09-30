import { sanityClient, DASHBOARD_QUERY } from '@/lib/sanity/client'
import { getOpenSessions, yourMoveQueue } from '@/lib/council/chamber'
import { getViewerMember } from '@/lib/council/viewer'
import DashboardClient from './DashboardClient'
import type { DashboardStats } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  let stats: DashboardStats | null = null
  let error: string | null = null

  try {
    stats = await sanityClient.fetch<DashboardStats>(DASHBOARD_QUERY)
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load dashboard data'
  }

  const viewer = await getViewerMember().catch(() => null)
  const openSessions = await getOpenSessions()
  const queue = viewer ? yourMoveQueue(openSessions, viewer._id) : []

  return (
    <DashboardClient
      stats={stats}
      error={error}
      viewerName={viewer?.name ?? null}
      queue={queue}
      openSessionCount={openSessions.length}
    />
  )
}
