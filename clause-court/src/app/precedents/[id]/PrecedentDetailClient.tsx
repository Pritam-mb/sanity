import Link from 'next/link'
import type { AmbiguitySignal } from '@/types'
import { formatDate } from '../PrecedentLibrary'

// =============================================
// PRECEDENT DETAIL — VIEW LINEAGE
// =============================================
//
// This page is the proof that a ruling is a first-class artifact rather than
// a chat message: it shows what was decided, who decided it, what it inherits,
// and which live clauses currently depend on it.

export interface PrecedentDetail {
  _id: string
  _createdAt: string
  title: string
  holding: string
  reasoning: string
  applicableTerms: string[]
  relevanceScore: number
  citationCount: number
  ruling: {
    _id: string
    judgeName: string
    customRuling: string | null
    reasoning: string | null
    dissent: string | null
    dissentAdvocate: 'A' | 'B' | null
    clauseRevisionSuggested: boolean | null
    suggestedRevision: string | null
    _createdAt: string
    chosenInterpretation: {
      _id: string
      title: string
      side: 'A' | 'B'
      summary: string
      argument: string
      textualEvidence: string[]
      citedPrecedent: Array<{ _id: string; title: string; holding: string }>
    } | null
  } | null
  sourceClause: {
    _id: string
    title: string
    text: string
    category: string
    caseNumber: string
    status: string
    ambiguitySignals: AmbiguitySignal[]
  } | null
  citesPrecedent: Array<{
    _id: string
    title: string
    holding: string
    applicableTerms: string[]
    citationCount: number
  }>
  citedBy: Array<{
    _id: string
    title: string
    text: string
    caseNumber: string
    category: string
    status: string
  }>
}

export default function PrecedentDetailPage({
  precedent,
  ordinal,
}: {
  precedent: PrecedentDetail
  ordinal: number
}) {
  const dissent = precedent.ruling?.dissent

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container container--narrow">
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/" style={{ color: 'var(--text-muted)' }}>
            Dashboard
          </Link>
          <span aria-hidden="true">›</span>
          <Link href="/precedents" style={{ color: 'var(--text-muted)' }}>
            Precedents
          </Link>
          <span aria-hidden="true">›</span>
          <span style={{ color: 'var(--gold-400)' }}>Lineage</span>
        </nav>

        <header style={{ marginBottom: '28px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--gold-400)',
              letterSpacing: '0.14em',
              marginBottom: '8px',
            }}
          >
            PRECEDENT #{String(ordinal).padStart(3, '0')}
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}>
            {precedent.title}
          </h1>
          <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Decided by {precedent.ruling?.judgeName ?? 'unknown judge'} on{' '}
            {formatDate(precedent._createdAt)}
          </p>
        </header>

        {/* ─── The holding ─────────────────────────────────── */}
        <section
          className="card card--gold"
          style={{ marginBottom: '24px', borderColor: 'var(--border-gold)' }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              color: 'var(--gold-400)',
              letterSpacing: '0.12em',
              marginBottom: '12px',
            }}
          >
            HOLDING
          </div>
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.3rem',
              lineHeight: '1.5',
              color: 'var(--text-primary)',
            }}
          >
            {precedent.holding}
          </p>

          {precedent.applicableTerms.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                marginTop: '18px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-gold)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.1em',
                  marginRight: '4px',
                  alignSelf: 'center',
                }}
              >
                SETTLES
              </span>
              {precedent.applicableTerms.map((term) => (
                <span
                  key={term}
                  style={{
                    padding: '2px 9px',
                    borderRadius: '100px',
                    background: 'var(--gold-glow)',
                    border: '1px solid var(--border-gold)',
                    fontSize: '0.72rem',
                    color: 'var(--gold-300)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {term}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ─── Reasoning ───────────────────────────────────── */}
        {precedent.reasoning && (
          <section className="card" style={{ marginBottom: '24px' }}>
            <SectionLabel>Judge&rsquo;s reasoning</SectionLabel>
            <p style={{ lineHeight: '1.8' }}>{precedent.reasoning}</p>
          </section>
        )}

        {/* ─── Dissent ─────────────────────────────────────── */}
        {dissent && (
          <section
            className="card"
            style={{
              marginBottom: '24px',
              borderColor: 'var(--border-default)',
              background: 'var(--bg-panel)',
            }}
          >
            <SectionLabel>
              Dissent — Advocate {precedent.ruling?.dissentAdvocate}
            </SectionLabel>
            <p
              style={{
                fontStyle: 'italic',
                lineHeight: '1.8',
                color: 'var(--text-secondary)',
              }}
            >
              &ldquo;{dissent}&rdquo;
            </p>
            {precedent.ruling?.clauseRevisionSuggested &&
              precedent.ruling?.suggestedRevision && (
                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <SectionLabel>Suggested revision</SectionLabel>
                  <p
                    style={{
                      color: 'var(--gold-300)',
                      fontStyle: 'italic',
                      fontSize: '0.9rem',
                      lineHeight: '1.7',
                    }}
                  >
                    &ldquo;{precedent.ruling.suggestedRevision}&rdquo;
                  </p>
                </div>
              )}
            <p
              style={{
                marginTop: '16px',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontStyle: 'normal',
              }}
            >
              Generated opinion by the losing advocate. Not a legal finding, and
              it does not overturn the holding above.
            </p>
          </section>
        )}

        {/* ─── Source clause ───────────────────────────────── */}
        {precedent.sourceClause && (
          <section className="card" style={{ marginBottom: '24px' }}>
            <SectionLabel>Source clause</SectionLabel>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '12px',
                flexWrap: 'wrap',
              }}
            >
              <Link
                href={`/clauses/${precedent.sourceClause._id}`}
                style={{ fontWeight: '600' }}
              >
                {precedent.sourceClause.caseNumber} ·{' '}
                {precedent.sourceClause.title}
              </Link>
              <span className={`badge badge--${precedent.sourceClause.status}`}>
                {precedent.sourceClause.status}
              </span>
            </div>
            <p
              style={{
                fontStyle: 'italic',
                lineHeight: '1.7',
                color: 'var(--text-secondary)',
              }}
            >
              &ldquo;{precedent.sourceClause.text}&rdquo;
            </p>
          </section>
        )}

        {/* ─── Lineage: what it inherits from ──────────────── */}
        {precedent.citesPrecedent.length > 0 && (
          <section className="card" style={{ marginBottom: '24px' }}>
            <SectionLabel>← Inherits from</SectionLabel>
            <p style={{ fontSize: '0.85rem', marginBottom: '14px' }}>
              This holding was argued against earlier rulings. A reader can
              follow the chain back through the graph.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {precedent.citesPrecedent.map((parent) => (
                <Link
                  key={parent._id}
                  href={`/precedents/${parent._id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="card"
                    style={{ padding: '12px 16px', cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                      {parent.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        marginTop: '4px',
                      }}
                    >
                      {parent.holding}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Lineage: what depends on it ─────────────────── */}
        <section className="card" style={{ marginBottom: '24px' }}>
          <SectionLabel>
            Cited by {precedent.citedBy.length} clause
            {precedent.citedBy.length === 1 ? '' : 's'}
          </SectionLabel>
          {precedent.citedBy.length === 0 ? (
            <p style={{ fontSize: '0.88rem' }}>
              Nothing cites this holding yet. The next debate that uses a
              matching term will pick it up.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {precedent.citedBy.map((clause) => (
                <Link
                  key={clause._id}
                  href={`/clauses/${clause._id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="card"
                    style={{ padding: '12px 16px', cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '10px',
                        alignItems: 'center',
                        marginBottom: '4px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                        {clause.caseNumber} · {clause.title}
                      </span>
                      <span className={`badge badge--${clause.status}`}>
                        {clause.status}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                      }}
                    >
                      &ldquo;{clause.text}&rdquo;
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ─── If the judge adopted an advocate's reading ──── */}
        {precedent.ruling?.chosenInterpretation && (
          <section className="card" style={{ marginBottom: '24px' }}>
            <SectionLabel>
              Adopted reading — Advocate{' '}
              {precedent.ruling.chosenInterpretation.side}
            </SectionLabel>
            <h4
              style={{
                color:
                  precedent.ruling.chosenInterpretation.side === 'A'
                    ? 'var(--advocate-a-light)'
                    : 'var(--advocate-b-light)',
                marginBottom: '8px',
              }}
            >
              {precedent.ruling.chosenInterpretation.title}
            </h4>
            <p style={{ marginBottom: '12px' }}>
              {precedent.ruling.chosenInterpretation.summary}
            </p>
            {precedent.ruling.chosenInterpretation.citedPrecedent.length > 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--gold-400)' }}>
                Relied on:{' '}
                {precedent.ruling.chosenInterpretation.citedPrecedent
                  .map((p) => p.title)
                  .join(', ')}
              </p>
            )}
          </section>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/graph" className="btn btn--primary">
            View Graph
          </Link>
          <Link href="/precedents" className="btn btn--ghost">
            ← Back to Precedents
          </Link>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: '12px',
      }}
    >
      {children}
    </div>
  )
}
