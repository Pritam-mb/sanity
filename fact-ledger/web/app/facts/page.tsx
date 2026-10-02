import { sanityClient } from '@/lib/sanity/client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
  const active = facts.filter(f => f.status === 'active').length
  const deprecated = facts.filter(f => f.status === 'deprecated').length

  return (
    <div className="page-shell">
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Canonical registry</div>
      <h1 className="page-title">Facts</h1>
      <p className="page-sub">
        <strong style={{ color: '#fff' }}>{active} active</strong> · {deprecated} deprecated · single source of truth for every policy value
      </p>

      <div className="data-table-wrap">
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
                <td style={{ fontWeight: 700, color: '#fff' }}>
                  {f.highStakes && <span style={{ color: '#fff', marginRight: 6 }}>◆</span>}
                  {f.label}
                </td>
                <td><code>{f.key?.current ?? 'None'}</code></td>
                <td style={{ color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {[f.value, f.unit].filter(Boolean).join(' ')}
                </td>
                <td style={{ maxWidth: 220 }}>
                  {f.aliases?.slice(0, 3).map((a, i) => (
                    <span key={i} style={{
                      display: 'inline-block',
                      marginRight: 4,
                      marginBottom: 4,
                      padding: '1px 8px',
                      borderRadius: 100,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontSize: 11,
                      color: '#d4d4d8',
                    }}>
                      {a}
                    </span>
                  ))}
                  {(f.aliases?.length ?? 0) > 3 && (
                    <span style={{ color: '#8b8b93', fontSize: 11 }}>
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
      </div>
    </div>
  )
}
