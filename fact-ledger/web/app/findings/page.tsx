import { sanityClient } from '@/lib/sanity/client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

const ruleMeta: Record<string, { bg: string; color: string; border: string }> = {
  R1: { bg: '#ffffff', color: '#000000', border: '#ffffff' },
  R2: { bg: 'rgba(255,255,255,0.08)', color: '#ffffff', border: 'rgba(255,255,255,0.3)' },
  R3: { bg: 'rgba(255,255,255,0.06)', color: '#ffffff', border: 'rgba(255,255,255,0.2)' },
  R4: { bg: 'rgba(255,255,255,0.08)', color: '#ffffff', border: 'rgba(255,255,255,0.3)' },
  R5: { bg: 'rgba(255,255,255,0.06)', color: '#d4d4d8', border: 'rgba(255,255,255,0.2)' },
}

export default async function FindingsPage() {
  const findings = await getFindings()
  const open = findings.filter(f => f.status === 'open')
  const fixed = findings.filter(f => f.status === 'fixed')
  const dismissed = findings.filter(f => f.status === 'dismissed')

  return (
    <div className="page-shell">
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Scanner output · R1–R5</div>
      <h1 className="page-title">Findings</h1>
      <div style={{ display: 'flex', gap: '0.6rem', margin: '12px 0 20px', flexWrap: 'wrap' }}>
        <span className="badge badge-open">{open.length} open</span>
        <span className="badge badge-fixed">{fixed.length} fixed</span>
        <span className="badge badge-dismissed">{dismissed.length} dismissed</span>
      </div>

      <div className="data-table-wrap">
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
            {findings.map((f) => {
              const meta = ruleMeta[f.rule] ?? ruleMeta.R3
              return (
                <tr key={f._id}>
                  <td>
                    <span className="rule-chip" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                      {f.rule}
                    </span>
                  </td>
                  <td style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{f.page?.title ?? 'None'}</td>
                  <td style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{f.fact?.label ?? 'None'}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <code style={{ fontSize: 11 }}>{f.excerpt ?? 'None'}</code>
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {f.foundValue && <span style={{ color: '#fff', fontWeight: 600, textDecoration: 'line-through' }}>&ldquo;{f.foundValue}&rdquo;</span>}
                    {f.foundValue && f.expectedValue && <span style={{ color: '#71717a', margin: '0 4px' }}>→</span>}
                    {f.expectedValue && <span style={{ color: '#fff', fontWeight: 600 }}>&ldquo;{f.expectedValue}&rdquo;</span>}
                    {!f.foundValue && !f.expectedValue && <span style={{ color: '#71717a' }}>—</span>}
                  </td>
                  <td>
                    <span className={`badge badge-${f.status}`}>{f.status}</span>
                  </td>
                  <td style={{ fontSize: 12, color: '#8b8b93', whiteSpace: 'nowrap' }} suppressHydrationWarning>
                    {f.detectedAt ? new Date(f.detectedAt).toISOString().split('T')[0] : '—'}
                  </td>
                </tr>
              )
            })}
            {findings.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No findings yet. Run a scan after seeding data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
