'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clause, ClauseStatus } from '@/types'

const STATUS_ORDER: ClauseStatus[] = ['flagged', 'debated', 'ruled', 'draft', 'resolved', 'published']

interface Props {
  clauses: Clause[]
  error: string | null
}

export default function ClauseListClient({ clauses, error }: Props) {
  const [filter, setFilter] = useState<ClauseStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return clauses
      .filter((c) => filter === 'all' || c.status === filter)
      .filter((c) =>
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.text.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const ai = STATUS_ORDER.indexOf(a.status as ClauseStatus)
        const bi = STATUS_ORDER.indexOf(b.status as ClauseStatus)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
  }, [clauses, filter, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: clauses.length }
    for (const clause of clauses) {
      c[clause.status] = (c[clause.status] || 0) + 1
    }
    return c
  }, [clauses])

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div className="court-case-number">POLICY CLAUSES</div>
          <h1 style={{ marginBottom: '12px' }}>
            Clause <span style={{ color: 'var(--gold-400)' }}>Registry</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {counts.flagged || 0} clause{counts.flagged !== 1 ? 's' : ''} need review · {counts.all} total
          </p>
        </div>

        {error && (
          <div className="card" style={{ borderColor: 'var(--danger)', background: 'var(--danger-dim)', marginBottom: '24px' }}>
            <p style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}

        {/* Filters + Search */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            style={{ maxWidth: '320px' }}
            placeholder="Search clauses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="clause-search"
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['all', 'flagged', 'debated', 'ruled', 'draft', 'resolved', 'published'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                id={`filter-${s}`}
                className="btn btn--sm"
                style={{
                  background: filter === s ? (s === 'flagged' ? 'var(--danger)' : 'var(--gold-400)') : 'var(--bg-raised)',
                  color: filter === s ? (s === 'flagged' ? 'white' : 'var(--bg-void)') : 'var(--text-secondary)',
                  borderColor: filter === s ? 'transparent' : 'var(--border-subtle)',
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
                {counts[s] !== undefined && (
                  <span style={{
                    marginLeft: '4px',
                    padding: '1px 6px',
                    borderRadius: '100px',
                    background: 'rgba(0,0,0,0.2)',
                    fontSize: '0.7rem',
                  }}>
                    {counts[s]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Clause Grid */}
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              {search ? `No clauses match "${search}"` : 'No clauses found. Try seeding demo data.'}
            </p>
            <SeedButton />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {filtered.map((clause) => (
              <ClauseCard key={clause._id} clause={clause} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Seed Button ────────────────────────────────────────────

/**
 * Seeding is destructive — it wipes and rebuilds the dataset — so it cannot be
 * a plain link. `/api/seed` is POST-only, which is why this posts rather than
 * navigating; an earlier `<Link href="/api/seed">` produced a 405 with no
 * explanation.
 */
function SeedButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const seed = async () => {
    if (
      !window.confirm(
        'Seed demo data?\n\nThis deletes all existing clauses, debates, rulings and precedents, then rebuilds the demo dataset.'
      )
    ) {
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Seeding failed (${res.status})`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seeding failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        className="btn btn--ghost"
        style={{ marginTop: '16px', display: 'inline-flex' }}
        onClick={seed}
        disabled={busy}
        id="seed-demo-btn"
      >
        {busy ? 'Seeding…' : 'Seed Demo Data'}
      </button>
      {error && (
        <p
          role="alert"
          style={{
            marginTop: '10px',
            fontSize: '0.8rem',
            color: 'var(--danger)',
          }}
        >
          {error}
        </p>
      )}
    </>
  )
}

// ─── Clause Card ─────────────────────────────────────────────

function ClauseCard({ clause }: { clause: Clause }) {
  const isFlagged = clause.status === 'flagged'
  const signals = clause.ambiguitySignals || []

  return (
    <Link href={`/clauses/${clause._id}`} style={{ textDecoration: 'none' }}>
      <div className={`card ${isFlagged ? 'card--gold' : ''}`} style={{
        cursor: 'pointer',
        height: '100%',
        transition: 'all 220ms ease',
        ...(isFlagged ? {
          borderColor: 'var(--danger)',
          boxShadow: '0 0 16px rgba(239, 68, 68, 0.1)',
        } : {}),
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.1em' }}>
              {clause.caseNumber} · {clause.category}
            </div>
            <h4 style={{ fontFamily: 'var(--font-heading)', color: isFlagged ? 'var(--text-primary)' : 'var(--text-primary)' }}>
              {clause.title}
            </h4>
          </div>
          <StatusBadge status={clause.status as ClauseStatus} />
        </div>

        {/* Text preview */}
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          marginBottom: '16px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          &ldquo;{clause.text}&rdquo;
        </p>

        {/* Ambiguity signals */}
        {isFlagged && signals.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {signals.slice(0, 3).map((sig, i) => (
              <span key={i} style={{
                padding: '2px 8px',
                borderRadius: '100px',
                background: 'var(--danger-dim)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: '0.7rem',
                color: 'var(--danger)',
                fontWeight: '600',
              }}>
                &ldquo;{sig.term}&rdquo;
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
        }}>
          <span>{signals.length > 0 ? `${signals.length} signal${signals.length > 1 ? 's' : ''}` : 'No signals'}</span>
          <span style={{ color: isFlagged ? 'var(--danger)' : 'var(--text-muted)' }}>
            {isFlagged ? '→ Needs review' : '→ View'}
          </span>
        </div>
      </div>
    </Link>
  )
}

function StatusBadge({ status }: { status: ClauseStatus }) {
  return <span className={`badge badge--${status}`}>{status}</span>
}
