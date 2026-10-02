import { sanityClient } from '@/lib/sanity/client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface FindingDoc {
  _id: string
  rule: string
  status: string
  excerpt?: string
  foundValue?: string
  expectedValue?: string
  detectedAt: string
  page?: { _id: string; title: string }
  fact?: { _id: string; label: string }
}

async function getFindings(): Promise<FindingDoc[]> {
  return sanityClient.fetch(
    `*[_type == "finding"] | order(detectedAt desc)[0...100]{
      _id, rule, status, excerpt, foundValue, expectedValue, detectedAt,
      "page": page->{ _id, title },
      "fact": fact->{ _id, label }
    }`
  )
}

const ruleColors: Record<string, string> = {
  R1: '#7c3aed',
  R2: '#dc2626',
  R3: '#b45309',
  R4: '#0284c7',
  R5: '#059669',
}

export default async function FindingsPage() {
  const findings = await getFindings()
  const open = findings.filter(f => f.status === 'open')
  const fixed = findings.filter(f => f.status === 'fixed')
  const dismissed = findings.filter(f => f.status === 'dismissed')

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <Link href="/" style={{ fontSize: 14, color: '#6366f1' }}>Back to Dashboard</Link>
      <h1 style={{ marginTop: '1rem', fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Findings
      </h1>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <span className="badge badge-open">{open.length} open</span>
        <span className="badge badge-fixed">{fixed.length} fixed</span>
        <span className="badge badge-dismissed">{dismissed.length} dismissed</span>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Rule</th>
            <th>Page</th>
            <th>Fact</th>
            <th>Excerpt</th>
            <th>Found / Expected</th>
            <th>Status</th>
            <th>Detected</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => (
            <tr key={f._id}>
              <td>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: ruleColors[f.rule] ?? '#334155',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {f.rule}
                </span>
              </td>
              <td style={{ color: 'var(--text-primary)' }}>{f.page?.title ?? 'None'}</td>
              <td style={{ color: 'var(--accent-secondary)' }}>{f.fact?.label ?? 'None'}</td>
              <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <code style={{ fontSize: 11 }}>{f.excerpt ?? 'None'}</code>
              </td>
              <td style={{ fontSize: 12 }}>
                {f.foundValue && <span style={{ color: 'var(--danger)' }}>"{f.foundValue}"</span>}
                {f.foundValue && f.expectedValue && <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>to</span>}
                {f.expectedValue && <span style={{ color: 'var(--success)' }}>"{f.expectedValue}"</span>}
              </td>
              <td>
                <span className={`badge badge-${f.status}`}>{f.status}</span>
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }} suppressHydrationWarning>
                {new Date(f.detectedAt).toISOString().split('T')[0]}
              </td>
            </tr>
          ))}
          {findings.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No findings yet. Run a scan after seeding data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
