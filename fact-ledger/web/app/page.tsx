import { sanityClient } from '@/lib/sanity/client'
import Link from 'next/link'

interface DashboardData {
  driftScore: number
  totalFacts: number
  totalPages: number
  coveragePct: number
  recentScanRun: {
    startedAt: string
    trigger: string
    metrics: { open: number }
  } | null
  recentAuditLogs: {
    _id: string
    action: string
    actor: string
    at: string
    releaseId?: string
  }[]
}

export const dynamic = 'force-dynamic'

async function getDashboardData(): Promise<DashboardData> {
  const [driftScore, totalFacts, totalPages, recentScanRun, recentAuditLogs] = await Promise.all([
    sanityClient.fetch<number>('count(*[_type=="finding" && status=="open"])'),
    sanityClient.fetch<number>('count(*[_type=="fact" && status=="active"])'),
    sanityClient.fetch<number>('count(*[_type=="page"])'),
    sanityClient.fetch<DashboardData['recentScanRun']>(
      `*[_type=="scanRun"] | order(startedAt desc)[0]{ startedAt, trigger, metrics }`
    ),
    sanityClient.fetch<DashboardData['recentAuditLogs']>(
      `*[_type=="changeEvent"] | order(at desc)[0...5]{ _id, action, actor, at, releaseId }`
    ),
  ])

  const coveragePct = recentScanRun?.metrics
    ? (recentScanRun as any)?.metrics?.coveragePct ?? 0
    : 0

  return { driftScore, totalFacts, totalPages, coveragePct, recentScanRun, recentAuditLogs }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const kpis = [
    {
      label: 'Drift Score',
      value: data.driftScore,
      color: data.driftScore === 0 ? 'var(--success)' : 'var(--danger)',
      description: 'Open findings',
      icon: data.driftScore === 0 ? '✅' : '🔴',
    },
    {
      label: 'Active Facts',
      value: data.totalFacts,
      color: 'var(--accent-secondary)',
      description: 'Canonical fact documents',
      icon: '📌',
    },
    {
      label: 'Pages',
      value: data.totalPages,
      color: 'var(--accent-secondary)',
      description: 'Content pages scanned',
      icon: '📄',
    },
    {
      label: 'Reference Coverage',
      value: `${Math.round(data.coveragePct)}%`,
      color: data.coveragePct >= 80 ? 'var(--success)' : 'var(--warning)',
      description: 'Linked vs total fact mentions',
      icon: '🔗',
    },
  ]

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* ── Hero ─────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Drift Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Change one fact, find every stale copy, fix them in one reviewed release, and verify drift is zero.
        </p>
        {data.recentScanRun && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Last scan: {new Date(data.recentScanRun.startedAt).toLocaleString()} · trigger: {data.recentScanRun.trigger}
          </p>
        )}
      </div>

      {/* ── KPI Row (P1) ─────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <span className="kpi-label">{kpi.icon} {kpi.label}</span>
            <span className="kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
            <span className="kpi-delta">{kpi.description}</span>
          </div>
        ))}
      </div>

      {/* ── Quick Links ───────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {[
          { href: '/findings', label: 'Open Findings', icon: '🔍', count: data.driftScore },
          { href: '/pages', label: 'Browse Pages', icon: '📄', count: data.totalPages },
          { href: '/facts', label: 'Manage Facts', icon: '📌', count: data.totalFacts },
          { href: '/benchmark', label: 'Benchmark Results', icon: '📊', count: null },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              color: 'var(--text-primary)',
              fontWeight: 500,
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{item.label}</div>
              {item.count !== null && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {item.count} document{item.count !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Audit Log ───────────────────────────────── */}
      {data.recentAuditLogs && data.recentAuditLogs.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Ledger Activity</h2>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {data.recentAuditLogs.map((log, i) => (
              <div
                key={log._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderBottom: i < data.recentAuditLogs.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    background: log.action === 'release_published' ? 'var(--success)' : 'var(--accent)' 
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {log.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      by {log.actor} {log.releaseId ? `(Release: ${log.releaseId.substring(0, 8)}...)` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(log.at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state notice ────────────────────────── */}
      {data.totalFacts === 0 && data.totalPages === 0 && (
        <div style={{
          padding: '2rem',
          background: 'rgba(99,102,241,0.08)',
          border: '1px dashed rgba(99,102,241,0.3)',
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No data yet
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Run <code>npm run seed</code> from the monorepo root to populate demo facts and pages.
          </p>
        </div>
      )}

      {/* ── Source tooltip note ───────────────────────── */}
      <p style={{
        marginTop: '3rem',
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        borderTop: '1px solid var(--border)',
        paddingTop: '1rem',
      }}>
        All numbers sourced from Sanity GROQ queries against{' '}
        <code>finding</code>, <code>fact</code>, <code>page</code>, and{' '}
        <code>scanRun</code> documents. No hard-coded values.
      </p>
    </main>
  )
}
