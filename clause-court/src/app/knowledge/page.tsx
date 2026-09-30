import Link from 'next/link'
import { sanityClient } from '@/lib/sanity/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RegulationRow {
  _id: string
  title: string
  reference: string
  kind: string
  description: string | null
  floorValue: number | null
  floorUnit: string | null
  illustrative: boolean | null
}

interface DefinitionRow {
  _id: string
  term: string
  definition: string
}

interface StandardRow {
  _id: string
  title: string
  description: string | null
  bannedPhrases: string[]
}

// The knowledge base: regulations, benchmarks, definitions, company standards.
export default async function KnowledgePage() {
  const [regulations, definitions, standards] = await Promise.all([
    sanityClient
      .fetch<RegulationRow[]>(
        `*[_type == "regulation"] | order(kind asc, title asc) {_id, title, reference, kind, description, floorValue, floorUnit, illustrative}`
      )
      .catch(() => []),
    sanityClient
      .fetch<DefinitionRow[]>(`*[_type == "definition"] | order(term asc) {_id, term, definition}`)
      .catch(() => []),
    sanityClient
      .fetch<StandardRow[]>(
        `*[_type == "companyStandard"] | order(title asc) {_id, title, description, "bannedPhrases": coalesce(bannedPhrases, [])}`
      )
      .catch(() => []),
  ])

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container container--narrow">
        <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: '8px', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link href="/" style={{ color: 'var(--text-muted)' }}>Dashboard</Link>
          <span aria-hidden="true">›</span>
          <span style={{ color: 'var(--gold-400)' }}>Knowledge</span>
        </nav>

        <div className="court-case-number">KNOWLEDGE BASE</div>
        <h1 style={{ marginBottom: '8px' }}>Regulations <span style={{ color: 'var(--gold-400)' }}>&amp; Standards</span></h1>
        <p style={{ maxWidth: '640px', marginBottom: '24px' }}>
          What the council argues against. Numeric floors are enforced on proposals;
          everything here is editable content in Studio — the detector gets smarter
          by editing data, never code.
        </p>

        <h3 style={{ marginBottom: '12px' }}>📜 Regulations &amp; Benchmarks</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
          {regulations.map((r) => (
            <div key={r._id} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <strong>{r.title}</strong>
                <span style={{ display: 'flex', gap: '6px' }}>
                  <span className="badge badge--debated">{r.reference}</span>
                  <span className={`badge ${r.kind === 'benchmark' ? 'badge--medium' : 'badge--resolved'}`}>{r.kind}</span>
                </span>
              </div>
              {r.description && <p style={{ fontSize: '0.85rem', marginBottom: '4px' }}>{r.description}</p>}
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {r.floorValue !== null && r.floorValue !== undefined
                  ? `floor: ${r.floorValue} ${r.floorUnit ?? ''}`
                  : 'floor: none stated'}
                {r.illustrative ? ' · illustrative demo data — verify against the official source' : ''}
              </p>
            </div>
          ))}
          {regulations.length === 0 && (
            <div className="card"><p style={{ color: 'var(--text-muted)' }}>No regulations yet — reseed the demo.</p></div>
          )}
        </div>

        <h3 style={{ marginBottom: '12px' }}>🏛 Company Standards (Rule E)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
          {standards.map((s) => (
            <div key={s._id} className="card" style={{ padding: '14px 16px' }}>
              <strong>{s.title}</strong>
              {s.description && <p style={{ fontSize: '0.85rem', margin: '4px 0' }}>{s.description}</p>}
              <p style={{ fontSize: '0.78rem', color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
                banned: {s.bannedPhrases.map((p) => `“${p}”`).join(', ') || '—'}
              </p>
            </div>
          ))}
          {standards.length === 0 && (
            <div className="card"><p style={{ color: 'var(--text-muted)' }}>No company standards yet.</p></div>
          )}
        </div>

        <h3 style={{ marginBottom: '12px' }}>📖 Definitions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {definitions.map((d) => (
            <div key={d._id} style={{ padding: '10px 14px', background: 'var(--bg-raised)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <code style={{ color: 'var(--gold-300)' }}>{d.term}</code>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>{d.definition}</p>
            </div>
          ))}
          {definitions.length === 0 && (
            <div className="card"><p style={{ color: 'var(--text-muted)' }}>No definitions yet.</p></div>
          )}
        </div>
      </div>
    </div>
  )
}
