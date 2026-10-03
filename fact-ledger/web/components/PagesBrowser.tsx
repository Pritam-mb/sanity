'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, Search, X } from 'lucide-react'

export interface PageRow {
  _id: string
  title: string
  slug: { current: string }
  kind: string
  openFindings: number
}

export function PagesBrowser({ pages }: { pages: PageRow[] }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<string>('all')

  const kinds = useMemo(() => {
    const m = new Map<string, number>()
    pages.forEach((p) => m.set(p.kind || 'other', (m.get(p.kind || 'other') ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [pages])

  const q = query.trim().toLowerCase()
  const visible = pages.filter(
    (p) => (kind === 'all' || (p.kind || 'other') === kind) && (!q || p.title.toLowerCase().includes(q))
  )
  const driftTotal = pages.filter((p) => p.openFindings > 0).length

  return (
    <>
      <div className="pages-toolbar">
        <label className="search-field" htmlFor="pages-search">
          <Search size={14} className="search-field-icon" />
          <input
            id="pages-search"
            type="search"
            placeholder="Search pages by title (e.g. Refund, SLA, Security)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={13} />
            </button>
          )}
        </label>
        {driftTotal > 0 && (
          <span className="drift-summary">
            <span className="drift-dot" /> {driftTotal} page{driftTotal !== 1 ? 's' : ''} with open drift
          </span>
        )}
      </div>

      <div className="filter-tabs" role="tablist" aria-label="Filter pages by kind">
        <button
          id="pages-tab-all"
          role="tab"
          aria-selected={kind === 'all'}
          className={`filter-tab ${kind === 'all' ? 'active' : ''}`}
          onClick={() => setKind('all')}
        >
          All <span className="filter-tab-count">{pages.length}</span>
        </button>
        {kinds.map(([k, n]) => (
          <button
            key={k}
            id={`pages-tab-${k}`}
            role="tab"
            aria-selected={kind === k}
            className={`filter-tab ${kind === k ? 'active' : ''}`}
            onClick={() => setKind(k)}
            style={{ textTransform: 'capitalize' }}
          >
            {k} <span className="filter-tab-count">{n}</span>
          </button>
        ))}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {visible.map((p) => (
          <li key={p._id} className="fade-row">
            <Link href={`/pages/${p.slug?.current}`} style={{ textDecoration: 'none' }}>
              <span className="list-row-card">
                <span
                  style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: '#fff', border: '1px solid #fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
                  }}
                >
                  <FileText size={15} />
                </span>
                <span className="kind-chip kind-chip-white">{p.kind}</span>
                <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{p.title}</span>
                {p.openFindings > 0 && (
                  <span className="drift-pill" title="Open drift findings on this page">
                    {p.openFindings} drift
                  </span>
                )}
                <span style={{ marginLeft: 'auto', color: '#fff', fontWeight: 800 }}>&rarr;</span>
              </span>
            </Link>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="page-card page-card-pad" style={{ color: '#8b8b93', textAlign: 'center' }}>
            {pages.length === 0 ? (
              <>No pages yet. Run <code>npm run seed</code> to create demo data.</>
            ) : (
              <>No pages match &ldquo;{query}&rdquo;{kind !== 'all' ? ` in ${kind}` : ''}.</>
            )}
          </li>
        )}
      </ul>
    </>
  )
}
