'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export interface FindingRow {
  _id: string
  rule: string
  status: string
  excerpt?: string
  foundValue?: string
  expectedValue?: string
  detectedAt: string
  page?: { _id: string; title: string; slug?: string }
  fact?: { _id: string; label: string }
}

type Filter = 'all' | 'open' | 'fixed' | 'dismissed'

const ruleMeta: Record<string, { bg: string; color: string; border: string }> = {
  R1: { bg: '#ffffff', color: '#000000', border: '#ffffff' },
  R2: { bg: 'rgba(255,255,255,0.08)', color: '#ffffff', border: 'rgba(255,255,255,0.3)' },
  R3: { bg: 'rgba(255,255,255,0.06)', color: '#ffffff', border: 'rgba(255,255,255,0.2)' },
  R4: { bg: 'rgba(255,255,255,0.08)', color: '#ffffff', border: 'rgba(255,255,255,0.3)' },
  R5: { bg: 'rgba(255,255,255,0.06)', color: '#d4d4d8', border: 'rgba(255,255,255,0.2)' },
}

/** `resolved` and `fixed` describe the same terminal state: display both as FIXED. */
export const normalizeStatus = (s: string) => (s === 'resolved' ? 'fixed' : s)

export function FindingsTable({ findings }: { findings: FindingRow[] }) {
  const rows = useMemo(() => findings.map((f) => ({ ...f, status: normalizeStatus(f.status) })), [findings])
  const counts = useMemo(
    () => ({
      all: rows.length,
      open: rows.filter((f) => f.status === 'open').length,
      fixed: rows.filter((f) => f.status === 'fixed').length,
      dismissed: rows.filter((f) => f.status === 'dismissed').length,
    }),
    [rows]
  )
  const [filter, setFilter] = useState<Filter>(counts.open > 0 ? 'open' : 'all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const visible = filter === 'all' ? rows : rows.filter((f) => f.status === filter)

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'fixed', label: 'Fixed' },
    { key: 'dismissed', label: 'Dismissed' },
  ]

  return (
    <>
      <div className="filter-tabs" role="tablist" aria-label="Filter findings by status">
        {tabs.map((t) => (
          <button
            key={t.key}
            id={`findings-tab-${t.key}`}
            role="tab"
            aria-selected={filter === t.key}
            className={`filter-tab ${filter === t.key ? 'active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
            <span className="filter-tab-count">{counts[t.key]}</span>
          </button>
        ))}
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
            {visible.map((f) => {
              const meta = ruleMeta[f.rule] ?? ruleMeta.R3
              const isOpen = expanded.has(f._id)
              return (
                <tr key={f._id} className="fade-row">
                  <td>
                    <span className="rule-chip" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                      {f.rule}
                    </span>
                  </td>
                  <td style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {f.page?.slug ? (
                      <Link href={`/pages/${f.page.slug}`} className="table-link">{f.page.title}</Link>
                    ) : (
                      f.page?.title ?? 'None'
                    )}
                  </td>
                  <td style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{f.fact?.label ?? 'None'}</td>
                  <td
                    className={`excerpt-cell ${isOpen ? 'expanded' : ''}`}
                    title={isOpen ? 'Click to collapse' : f.excerpt ?? ''}
                    onClick={() => f.excerpt && toggle(f._id)}
                  >
                    <code style={{ fontSize: 11 }}>{f.excerpt ?? 'None'}</code>
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {f.foundValue && <span style={{ color: '#fff', fontWeight: 600, textDecoration: 'line-through' }}>&ldquo;{f.foundValue}&rdquo;</span>}
                    {f.foundValue && f.expectedValue && <span style={{ color: '#71717a', margin: '0 4px' }}>&rarr;</span>}
                    {f.expectedValue && <span style={{ color: '#fff', fontWeight: 600 }}>&ldquo;{f.expectedValue}&rdquo;</span>}
                    {!f.foundValue && !f.expectedValue && <span style={{ color: '#71717a' }}>-</span>}
                  </td>
                  <td>
                    <span className={`badge badge-${f.status}`}>{f.status}</span>
                  </td>
                  <td style={{ fontSize: 12, color: '#8b8b93', whiteSpace: 'nowrap' }} suppressHydrationWarning>
                    {f.detectedAt ? new Date(f.detectedAt).toISOString().split('T')[0] : '-'}
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  {rows.length === 0 ? 'No findings yet. Run a scan after seeding data.' : `No ${filter} findings.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
