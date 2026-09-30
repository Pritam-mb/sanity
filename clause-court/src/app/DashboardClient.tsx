'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DashboardStats, RecentRuling } from '@/types'

type StatsData = DashboardStats

interface Props {
  stats: StatsData | null
  error: string | null
  viewerName: string | null
  queue: Array<{ sessionId: string; clauseTitle: string; caseNumber: string; action: string; detail: string; deadline: string | null }>
  openSessionCount: number
}

export default function DashboardClient({ stats, error, viewerName, queue, openSessionCount }: Props) {
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState('')

  const handleReset = async () => {
    if (!confirm('Reset all demo data? This will clear all debates and rulings.')) return
    setResetting(true)
    setResetMessage('')
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setResetMessage('✓ Demo reset! Refreshing...')
        setTimeout(() => window.location.reload(), 1200)
      } else {
        setResetMessage('✗ Reset failed: ' + data.error)
      }
    } catch (e) {
      setResetMessage(
        '✗ ' + (e instanceof Error ? e.message : 'Reset failed')
      )
    } finally {
      setResetting(false)
    }
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">

        {/* ─── Header ─────────────────────────────── */}
        <div className="court-header" style={{ textAlign: 'left', padding: '40px 0 32px' }}>
          <div className="court-case-number">THE DEBATE CHAMBER</div>
          <h1 style={{ marginBottom: '12px' }}>
            Clause <span style={{ color: 'var(--gold-400)' }}>Court</span>
          </h1>
          <p style={{ maxWidth: '560px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
            AI courtroom for structured policies. Two AI advocates argue ambiguous clauses.
            A human judge rules. Every ruling becomes persistent precedent.
          </p>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
            <Link href="/clauses" className="btn btn--primary btn--lg">
              ⚖ Open Flagged Clauses
            </Link>
            <button
              className="btn btn--ghost"
              onClick={handleReset}
              disabled={resetting}
              id="demo-reset-btn"
            >
              {resetting ? '⟳ Resetting...' : '⟳ Reset Demo'}
            </button>
          </div>
          {resetMessage && (
            <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--success)' }}>
              {resetMessage}
            </p>
          )}
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, var(--border-gold), transparent)', margin: '8px 0 40px' }} />

        {/* ─── Your move ─────────────────────────────── */}
        <section aria-label="Your move" style={{ marginBottom: '40px' }}>
          <h3 style={{ marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
            Your move{viewerName ? `, ${viewerName}` : ''}
          </h3>
          {!viewerName ? (
            <div className="card">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                🪪 Pick an identity in the navigation bar to see the sessions waiting on you.
                {openSessionCount > 0 && ` ${openSessionCount} session${openSessionCount === 1 ? '' : 's'} open right now.`}
              </p>
            </div>
          ) : queue.length === 0 ? (
            <div className="card">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                ✅ Nothing waiting on you. {openSessionCount > 0 && `${openSessionCount} session${openSessionCount === 1 ? '' : 's'} still open.`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {queue.map((item) => (
                <Link key={`${item.sessionId}-${item.action}`} href={`/chamber/${item.sessionId}`} style={{ textDecoration: 'none' }}>
                  <div className="card card--gold" style={{ cursor: 'pointer' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--gold-400)', marginBottom: '4px' }}>
                      {item.caseNumber} · {item.action.toUpperCase()}
                    </div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{item.clauseTitle}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.detail}</div>
                    {item.deadline && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }} suppressHydrationWarning>
                        Due {new Date(item.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ─── Error State ─────────────────────────── */}
        {error && (
          <div className="card" style={{ borderColor: 'var(--danger)', background: 'var(--danger-dim)', marginBottom: '32px' }}>
            <h4 style={{ color: 'var(--danger)', marginBottom: '8px' }}>⚠ Sanity Connection Error</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{error}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
              Make sure your <code>.env.local</code> has <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> and <code>SANITY_API_TOKEN</code> set.
            </p>
          </div>
        )}

        {/* ─── Stats Grid ──────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '48px',
        }}>
          <StatCard
            value={stats?.totalClauses ?? '—'}
            label="Total Clauses"
            icon="📋"
            color="var(--text-primary)"
          />
          <StatCard
            value={stats?.flaggedClauses ?? '—'}
            label="Need Review"
            icon="⚠"
            color="var(--danger)"
            highlight={stats?.flaggedClauses ? stats.flaggedClauses > 0 : false}
          />
          <StatCard
            value={stats?.activeDebates ?? '—'}
            label="Active Debates"
            icon="⚡"
            color="var(--advocate-a)"
          />
          <StatCard
            value={stats?.totalRulings ?? '—'}
            label="Rulings Issued"
            icon="🔨"
            color="var(--gold-400)"
          />
          <StatCard
            value={stats?.totalPrecedents ?? '—'}
            label="Precedents"
            icon="⚖"
            color="var(--success)"
          />
          <StatCard
            value={stats?.resolvedClauses ?? '—'}
            label="Resolved"
            icon="✓"
            color="var(--success)"
          />
        </div>

        {/* ─── Two-Column: Recent Rulings + Quick Actions ─ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>

          {/* Recent Rulings */}
          <div>
            <h3 style={{ marginBottom: '20px', fontFamily: 'var(--font-heading)' }}>
              Recent Rulings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats?.recentRulings?.length ? (
                stats.recentRulings.map((ruling) => (
                  <RulingCard key={ruling._id} ruling={ruling} />
                ))
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚖</div>
                  <p style={{ color: 'var(--text-muted)' }}>
                    No rulings yet. Start a debate to create the first ruling.
                  </p>
                  <Link href="/clauses" className="btn btn--primary" style={{ marginTop: '16px', display: 'inline-flex' }}>
                    Open Clauses
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 style={{ marginBottom: '20px', fontFamily: 'var(--font-heading)' }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ActionCard
                href="/clauses?filter=flagged"
                icon="⚠"
                title="Review Flagged Clauses"
                description="Open clauses with detected ambiguity signals"
                color="var(--danger)"
              />
              <ActionCard
                href="/precedents"
                icon="📚"
                title="Browse Precedents"
                description="View all human-approved rulings and their citations"
                color="var(--gold-400)"
              />
              <ActionCard
                href="/graph"
                icon="🕸"
                title="Precedent Graph"
                description="Visualize how rulings connect to future clauses"
                color="var(--success)"
              />
            </div>

            {/* Process Diagram */}
            <div className="card card--gold" style={{ marginTop: '24px' }}>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--gold-400)', marginBottom: '12px', textTransform: 'uppercase' }}>
                The Court Process
              </div>
              {[
                'AMBIGUOUS CLAUSE',
                'AI vs AI DEBATE',
                'HUMAN JUDGE',
                'STRUCTURED PRECEDENT',
                'FUTURE CITATIONS',
              ].map((step, i, arr) => (
                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{
                    padding: '6px 12px',
                    background: i === 2 ? 'var(--gold-glow)' : 'var(--bg-raised)',
                    border: `1px solid ${i === 2 ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: i === 2 ? 'var(--gold-400)' : 'var(--text-secondary)',
                    letterSpacing: '0.05em',
                  }}>
                    {step}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: '1px', height: '12px', background: 'var(--border-gold)', margin: '0 0 0 24px' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function StatCard({ value, label, icon, color, highlight = false }: {
  value: number | string
  label: string
  icon: string
  color: string
  highlight?: boolean
}) {
  return (
    <div className={`card ${highlight ? 'card--gold' : ''}`} style={{
      textAlign: 'center',
      boxShadow: highlight ? '0 0 20px rgba(239, 68, 68, 0.1)' : undefined,
    }}>
      <div style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '2.2rem',
        fontWeight: '700',
        color,
        lineHeight: 1,
        marginBottom: '6px',
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

function RulingCard({ ruling }: { ruling: RecentRuling }) {
  const chosen = ruling.chosenInterpretation
  const rulingText = ruling.customRuling || (chosen ? `Adopted: ${chosen.title}` : 'Ruling issued')

  return (
    <Link href={`/clauses/${ruling.clause?._id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ cursor: 'pointer', transition: 'all 220ms ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              {ruling.clause?.caseNumber || '#—'}
            </div>
            <h5 style={{ marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
              {ruling.clause?.title || 'Untitled Clause'}
            </h5>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              &ldquo;{rulingText.substring(0, 90)}{rulingText.length > 90 ? '...' : ''}&rdquo;
            </p>
          </div>
          <span className="badge badge--ruled" style={{ flexShrink: 0 }}>Ruled</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Judge: {ruling.judgeName}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} suppressHydrationWarning>
            {new Date(ruling._createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  )
}

function ActionCard({ href, icon, title, description, color }: {
  href: string
  icon: string
  title: string
  description: string
  color: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card" style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
        cursor: 'pointer',
        padding: '16px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px', color: 'var(--text-primary)' }}>
            {title}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {description}
          </div>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem', alignSelf: 'center' }}>→</span>
      </div>
    </Link>
  )
}
