import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getComplaints, getFactOptions, getPageOptions } from '@/lib/voice'
import { ComplaintForm } from '@/components/ComplaintForm'
import { ComplaintTriage } from '@/components/ComplaintTriage'
import { VoiceAnalytics, type VoiceStats } from '@/components/VoiceAnalytics'
import { OfficialOnly } from '@/components/RoleView'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<string, string> = {
  open: 'badge-open',
  'in-review': 'badge-fixed',
  resolved: 'badge-fixed',
  dismissed: 'badge-dismissed',
}

export default async function ComplaintsPage() {
  const [complaints, facts, pages] = await Promise.all([getComplaints(), getFactOptions(), getPageOptions()])

  const open = complaints.filter((c) => c.status === 'open').length
  const inReview = complaints.filter((c) => c.status === 'in-review').length
  const resolved = complaints.filter((c) => c.status === 'resolved').length

  const byStatus = ['open', 'in-review', 'resolved', 'dismissed'].map((s) => ({
    name: s,
    value: complaints.filter((c) => c.status === s).length,
  }))
  const factCount = new Map<string, number>()
  complaints.forEach((c) => {
    const label = c.targetFact?.label ?? c.targetPage?.title ?? 'General'
    factCount.set(label, (factCount.get(label) ?? 0) + 1)
  })
  const stats: VoiceStats = {
    complaintsByStatus: byStatus,
    complaintsByFact: [...factCount.entries()].map(([name, value]) => ({ name: name.length > 18 ? `${name.slice(0, 18)}…` : name, value })),
  }

  return (
    <div className="page-shell">
      <Link href="/portal" className="back-link">
        <ArrowLeft size={14} /> Back to Portal
      </Link>
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Employee voice</div>
      <h1 className="page-title">Policy Complaints</h1>
      <p className="page-sub">
        <strong style={{ color: '#fff' }}>{open} open</strong> · {inReview} in review · {resolved} resolved: every complaint names the exact policy or page.
      </p>

      <OfficialOnly>
        <VoiceAnalytics stats={stats} />
      </OfficialOnly>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        <div>
          <ComplaintForm facts={facts} pages={pages} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {complaints.map((c) => (
            <article key={c._id} className="page-card page-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-dismissed'}`}>{c.status}</span>
                <span className="kind-chip kind-chip-white">{c.category}</span>
                <span style={{ fontSize: '0.75rem', color: '#8b8b93', marginLeft: 'auto' }} suppressHydrationWarning>
                  {formatDate(c.raisedAt)}
                </span>
              </div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '0.3rem' }}>{c.title}</h2>
              <p style={{ fontSize: '0.87rem', color: '#d4d4d8', lineHeight: 1.6, marginBottom: '0.5rem' }}>{c.description}</p>
              <div style={{ fontSize: '0.75rem', color: '#8b8b93' }}>
                Against: <strong style={{ color: '#fff' }}>{c.targetFact?.label ?? c.targetPage?.title ?? '-'}</strong>
                {' · '}by {c.raisedBy}
              </div>
              {c.response && (
                <div style={{ marginTop: '0.6rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.08em', color: '#a1a1aa', marginBottom: 4 }}>
                    OFFICIAL RESPONSE
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#fff' }}>{c.response}</p>
                </div>
              )}
              <OfficialOnly>
                <ComplaintTriage complaintId={c._id} currentStatus={c.status} currentResponse={c.response} />
              </OfficialOnly>
            </article>
          ))}
          {complaints.length === 0 && (
            <div className="page-card page-card-pad" style={{ textAlign: 'center', color: '#8b8b93' }}>
              No complaints yet: be the first to raise one.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
