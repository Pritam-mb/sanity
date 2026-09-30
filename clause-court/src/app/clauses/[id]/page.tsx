import { sanityClient, CLAUSE_BY_ID_QUERY, STANDARDS_QUERY } from '@/lib/sanity/client'
import { detectAmbiguity, type CompanyStandard } from '@/lib/ambiguity/detector'
import { findRelevantPrecedent } from '@/lib/precedent/findRelevant'
import ClauseDetailClient, { type ClauseDetailData } from './ClauseDetailClient'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Clause detail.
 *
 * Deliberately read-only. The ambiguity engine is deterministic and pure, so it
 * runs here on every render and its output is shown even when the stored
 * `ambiguitySignals` is stale. Flagging used to be persisted from a page
 * render, which meant a GET could mutate the dataset; now only the seeder and
 * the debate pipeline write.
 */
export default async function ClauseDetailPage({ params }: Props) {
  const { id } = await params

  const clause = await sanityClient
    .fetch<ClauseDetailData | null>(CLAUSE_BY_ID_QUERY, { id })
    .catch(() => null)

  if (!clause) notFound()

  const definitions = (clause.definitions ?? []).map((d) => ({ term: d.term ?? '' }))

  const standards = await sanityClient
    .fetch<CompanyStandard[]>(STANDARDS_QUERY)
    .catch(() => [])

  const ambiguityReport = detectAmbiguity(clause.text ?? '', definitions, standards)

  const relevantPrecedent = await findRelevantPrecedent(
    id,
    clause.text ?? '',
    ambiguityReport.signals
  ).catch(() => [])

  const sessions = await sanityClient
    .fetch<Array<{ _id: string; status: string; round: string | null; deadline: string | null }>>(
      `*[_type == "session" && clause._ref == $id] | order(_createdAt desc) {_id, status, round, deadline}`,
      { id }
    )
    .catch(() => [])

  return (
    <ClauseDetailClient
      clause={clause}
      ambiguityReport={ambiguityReport}
      relevantPrecedent={relevantPrecedent}
      sessions={sessions}
    />
  )
}
