import { notFound } from 'next/navigation'
import { getSessionBundle } from '@/lib/council/chamber'
import { getViewerMember } from '@/lib/council/viewer'
import ChamberClient from './ChamberClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: Promise<{ id: string }>
}

// The deliberation chamber: spectrum, positions, replies, summary, vote.
export default async function ChamberPage({ params }: Props) {
  const { id } = await params
  const viewer = await getViewerMember()
  const bundle = await getSessionBundle(id, viewer?._id ?? null).catch(() => null)

  if (!bundle) notFound()

  return <ChamberClient initial={bundle} viewer={viewer} />
}
