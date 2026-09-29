import { sanityClient, CLAUSE_BY_ID_QUERY, DEBATE_BY_CLAUSE_QUERY } from '@/lib/sanity/client'
import { detectAmbiguity } from '@/lib/ambiguity/detector'
import { findRelevantPrecedent } from '@/lib/precedent/findRelevant'
import DebateChamber, {
  type ChamberClause,
  type ChamberDebate,
} from '@/components/DebateChamber'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: Promise<{ id: string }>
}

/**
 * The debate chamber, deep-linkable by clause id.
 *
 * An existing debate and its ruling are loaded on the server, so a refresh — or
 * a link pasted to someone else — shows the recorded case instead of an empty
 * room with a Begin Debate button. The transcript is content, not transient
 * component state.
 */
export default async function DebatePage({ params }: Props) {
  const { id } = await params

  const [clause, debate] = await Promise.all([
    sanityClient.fetch<ChamberClause | null>(CLAUSE_BY_ID_QUERY, { id }).catch(() => null),
    sanityClient
      .fetch<ChamberDebate | null>(DEBATE_BY_CLAUSE_QUERY, { clauseId: id })
      .catch(() => null),
  ])

  if (!clause) notFound()

  const signals = detectAmbiguity(clause.text ?? '', []).signals
  const precedents = await findRelevantPrecedent(
    id,
    clause.text ?? '',
    signals
  ).catch(() => [])

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        style={{
          padding: '12px 24px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
        }}
      >
        <Link href="/" style={{ color: 'var(--text-muted)' }}>
          Dashboard
        </Link>
        <span aria-hidden="true">›</span>
        <Link href="/clauses" style={{ color: 'var(--text-muted)' }}>
          Clauses
        </Link>
        <span aria-hidden="true">›</span>
        <Link href={`/clauses/${id}`} style={{ color: 'var(--text-muted)' }}>
          {clause.title}
        </Link>
        <span aria-hidden="true">›</span>
        <span style={{ color: 'var(--gold-400)' }}>Debate Chamber</span>
      </nav>

      <DebateChamber
        clause={clause}
        precedents={precedents}
        initialDebate={debate}
      />
    </div>
  )
}
