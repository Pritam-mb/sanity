import Link from 'next/link'

// =============================================
// PRECEDENT LIBRARY
// =============================================
//
// Every entry here was written by a person. That is the whole point of the
// page: this is institutional memory, not model output.

export interface PrecedentListItem {
  _id: string
  _createdAt: string
  title: string
  holding: string
  reasoning: string
  applicableTerms: string[]
  relevanceScore: number
  citationCount: number
  ruling: { _id: string; judgeName: string; _createdAt: string } | null
  sourceClause: {
    _id: string
    title: string
    category: string
    caseNumber: string
    status: string
  } | null
  citesPrecedent: Array<{ _id: string; title: string; holding: string }>
  citedBy: Array<{
    _id: string
    title: string
    caseNumber: string
    category: string
  }>
}

export default function PrecedentLibrary({
  precedents,
  error,
}: {
  precedents: PrecedentListItem[]
  error: string | null
}) {
  const totalCitations = precedents.reduce(
    (sum, p) => sum + (p.citationCount ?? 0),
    0
  )
  const mostCited = precedents.reduce(
    (best, p) => (p.citationCount > (best?.citationCount ?? -1) ? p : best),
    null as PrecedentListItem | null
  )

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        <Breadcrumb trail={[{ label: 'Precedent Library' }]} />

        <header style={{ marginBottom: '32px' }}>
          <div className="court-case-number">THE PRECEDENT LIBRARY</div>
          <h1 style={{ marginBottom: '12px' }}>
            Holdings that <span style={{ color: 'var(--gold-400)' }}>persist</span>
          </h1>
          <p style={{ maxWidth: '640px' }}>
            Each entry is a ruling a person actually made. Later debates cite
            these holdings directly, so interpretation accumulates instead of
            restarting.
          </p>
        </header>

        {error && (
          <div
            className="card"
            style={{
              borderColor: 'var(--danger)',
              background: 'var(--danger-dim)',
              marginBottom: '24px',
            }}
          >
            <p style={{ color: 'var(--danger)' }}>⚠ {error}</p>
          </div>
        )}

        {precedents.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '40px',
            }}
          >
            <SummaryTile
              value={precedents.length}
              label="Precedents on record"
              color="var(--gold-400)"
            />
            <SummaryTile
              value={totalCitations}
              label="Clauses citing precedent"
              color="var(--advocate-a)"
            />
            <SummaryTile
              value={mostCited?.citationCount ?? 0}
              label="Most cited holding"
              color="var(--success)"
            />
            <SummaryTile
              value={new Set(precedents.flatMap((p) => p.applicableTerms ?? [])).size}
              label="Terms settled"
              color="var(--advocate-b)"
            />
          </div>
        )}

        {precedents.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📚</div>
            <h4 style={{ marginBottom: '8px' }}>No precedent on record</h4>
            <p style={{ color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 20px' }}>
              Precedent is created by a human ruling. Debate a flagged clause
              and issue a ruling, and the holding will appear here.
            </p>
            <Link href="/clauses?filter=flagged" className="btn btn--primary" style={{ display: 'inline-flex' }}>
              ⚖ Enter a Debate
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '18px',
            }}
          >
            {precedents.map((precedent, index) => (
              <PrecedentCard
                key={precedent._id}
                precedent={precedent}
                ordinal={index + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Breadcrumb({ trail }: { trail: Array<{ label: string; href?: string }> }) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
      }}
    >
      <Link href="/" style={{ color: 'var(--text-muted)' }}>
        Dashboard
      </Link>
      {trail.map((crumb) => (
        <span key={crumb.label} style={{ display: 'contents' }}>
          <span aria-hidden="true">›</span>
          {crumb.href ? (
            <Link href={crumb.href} style={{ color: 'var(--text-muted)' }}>
              {crumb.label}
            </Link>
          ) : (
            <span style={{ color: 'var(--gold-400)' }}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

function SummaryTile({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) {
  return (
    <div className="card card--gold">
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '2rem',
          fontWeight: '700',
          color,
          lineHeight: 1,
          marginBottom: '6px',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          fontWeight: '600',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  )
}

function PrecedentCard({
  precedent,
  ordinal,
}: {
  precedent: PrecedentListItem
  ordinal: number
}) {
  const citations = precedent.citationCount ?? 0
  const citedBy = precedent.citedBy ?? []

  return (
    <article
      className="card"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: 'var(--gold-400)',
              letterSpacing: '0.12em',
              marginBottom: '4px',
            }}
          >
            PRECEDENT #{String(ordinal).padStart(3, '0')}
          </div>
          <h4 style={{ fontFamily: 'var(--font-heading)' }}>{precedent.title}</h4>
        </div>
        <span
          className={`badge ${
            citations > 0 ? 'badge--high' : 'badge--low'
          }`}
          style={{ flexShrink: 0 }}
        >
          {citations > 0
            ? `CITED ${citations}×`
            : 'NOT YET CITED'}
        </span>
      </div>

      <div
        style={{
          background: 'var(--bg-raised)',
          borderLeft: '3px solid var(--gold-400)',
          borderRadius: '0 8px 8px 0',
          padding: '12px 14px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            color: 'var(--gold-400)',
            letterSpacing: '0.1em',
            marginBottom: '6px',
          }}
        >
          HOLDING
        </div>
        <p
          style={{
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            fontWeight: '600',
            lineHeight: '1.5',
          }}
        >
          {precedent.holding}
        </p>
      </div>

      {(precedent.applicableTerms ?? []).length > 0 && (
        <div
          style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}
        >
          {precedent.applicableTerms.map((term) => (
            <span
              key={term}
              style={{
                padding: '2px 9px',
                borderRadius: '100px',
                background: 'var(--gold-glow)',
                border: '1px solid var(--border-gold)',
                fontSize: '0.7rem',
                color: 'var(--gold-300)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {term}
            </span>
          ))}
        </div>
      )}

      {citedBy.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}
          >
            CITED BY
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {citedBy.map((clause) => (
              <Link
                key={clause._id}
                href={`/clauses/${clause._id}`}
                className="badge badge--flagged"
                style={{ textDecoration: 'none' }}
              >
                {clause.caseNumber} {clause.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginTop: 'auto',
          paddingTop: '14px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
        }}
      >
        <span>
          Judge: {precedent.ruling?.judgeName ?? 'unknown'} ·{' '}
          {formatDate(precedent._createdAt)}
        </span>
        <span style={{ display: 'flex', gap: '8px' }}>
          {precedent.sourceClause && (
            <Link
              href={`/clauses/${precedent.sourceClause._id}`}
              className="btn btn--sm btn--ghost"
            >
              Source Clause
            </Link>
          )}
          <Link href={`/precedents/${precedent._id}`} className="btn btn--sm btn--primary">
            View Lineage
          </Link>
        </span>
      </div>
    </article>
  )
}

export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
