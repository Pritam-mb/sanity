import { sanityClient } from '@/lib/sanity/client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface FactDoc {
  _id: string
  label: string
  value: string
  unit?: string
  status: string
  key?: { current: string }
  aliases?: string[]
  effectiveFrom?: string
  effectiveUntil?: string
  highStakes?: boolean
}

async function getFacts(): Promise<FactDoc[]> {
  return sanityClient.fetch(
    `*[_type == "fact"] | order(label asc){ _id, label, value, unit, status, key, aliases, effectiveFrom, effectiveUntil, highStakes }`
  )
}

export default async function FactsPage() {
  const facts = await getFacts()

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <Link href="/" style={{ fontSize: 14, color: '#6366f1' }}>Back to Dashboard</Link>
      <h1 style={{ marginTop: '1rem', fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Facts
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        {facts.filter(f => f.status === 'active').length} active · {facts.filter(f => f.status === 'deprecated').length} deprecated
      </p>

      <table className="data-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Key</th>
            <th>Value</th>
            <th>Aliases</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {facts.map((f) => (
            <tr key={f._id}>
              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.label}</td>
              <td><code>{f.key?.current ?? 'None'}</code></td>
              <td style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>
                {[f.value, f.unit].filter(Boolean).join(' ')}
              </td>
              <td style={{ maxWidth: 200, overflow: 'hidden' }}>
                {f.aliases?.slice(0, 3).map((a, i) => (
                  <span key={i} style={{
                    display: 'inline-block',
                    marginRight: 4,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    fontSize: 11,
                  }}>
                    {a}
                  </span>
                ))}
                {(f.aliases?.length ?? 0) > 3 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    +{(f.aliases?.length ?? 0) - 3} more
                  </span>
                )}
              </td>
              <td>
                <span className={`badge badge-${f.status === 'active' ? 'fixed' : 'dismissed'}`}>
                  {f.status}
                </span>
              </td>
            </tr>
          ))}
          {facts.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No facts yet. Run <code>npm run seed</code>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
