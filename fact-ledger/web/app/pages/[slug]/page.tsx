import { sanityClient } from '@/lib/sanity/client'
import { PortableText } from '@portabletext/react'
import { buildPtComponents, type FactLookup } from '@/components/FactRefInline'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { OfficialOnly } from '@/components/RoleView'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

interface PageFinding {
  _id: string
  rule: string
  foundValue?: string
  expectedValue?: string
  fact?: { label: string }
}

interface PageDoc {
  _id: string
  title: string
  slug: { current: string }
  kind: string
  body: unknown[]
  _updatedAt?: string
  openFindings: PageFinding[]
}

const RULE_NAMES: Record<string, string> = {
  R1: 'Unlinked Match',
  R2: 'Contradiction',
  R3: 'Deprecated Ref',
  R4: 'Orphan Fact',
  R5: 'Temporal Bound',
}

async function getPage(slug: string): Promise<PageDoc | null> {
  return sanityClient.fetch(
    `*[_type == "page" && slug.current == $slug][0]{
      _id, title, slug, kind, body, _updatedAt,
      "openFindings": *[_type == "finding" && status == "open" && references(^._id)]{
        _id, rule, foundValue, expectedValue, "fact": fact->{ label }
      }
    }`,
    { slug }
  )
}

async function getFactsForPage(): Promise<FactLookup[]> {
  return sanityClient.fetch(
    `*[_type == "fact"]{
      _id, label, value, unit
    }`
  )
}

/** Walk Portable Text blocks and collect every referenced fact id (inline or block-level factRef). */
function collectFactRefs(body: unknown[]): string[] {
  const ids = new Set<string>()
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return
    if (node._type === 'factRef' && node.fact?._ref) ids.add(node.fact._ref)
    if (Array.isArray(node.children)) node.children.forEach(visit)
  }
  ;(body || []).forEach(visit)
  return [...ids]
}

export default async function PageDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  const facts = await getFactsForPage()
  const factMap = new Map<string, FactLookup>(facts.map((f) => [f._id, f]))
  const ptComponents = buildPtComponents(factMap)
  const linkedFacts = collectFactRefs(page.body)
    .map((id) => factMap.get(id))
    .filter((f): f is FactLookup => Boolean(f))
  const findings = page.openFindings || []
  const studioUrl = `http://localhost:3333/structure/page;${page._id.replace(/^drafts\./, '')}`

  return (
    <div className="page-shell" style={{ maxWidth: 1180 }}>
      <Breadcrumbs items={[{ label: 'Pages', href: '/pages' }, { label: page.title }]} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <div className="page-eyebrow" style={{ marginBottom: 0 }}><span className="page-eyebrow-dot" /> Live fact-linked document</div>
        <span className="kind-chip">{page.kind}</span>
      </div>
      <h1 className="page-title">{page.title}</h1>

      {findings.length > 0 && (
        <div className="drift-banner" role="alert">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              {findings.length} open drift finding{findings.length !== 1 ? 's' : ''} on this page
            </div>
            <ul className="drift-banner-list">
              {findings.slice(0, 4).map((f) => (
                <li key={f._id}>
                  <span className="rule-chip rule-chip-mono">{f.rule}</span>
                  <span>{RULE_NAMES[f.rule] ?? f.rule}</span>
                  {f.fact?.label && <span style={{ color: '#a1a1aa' }}>on {f.fact.label}</span>}
                  {f.foundValue && f.expectedValue && (
                    <span style={{ color: '#a1a1aa' }}>
                      : <s>{f.foundValue}</s> &rarr; <strong style={{ color: '#fff' }}>{f.expectedValue}</strong>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <Link href="/findings" className="btn-action btn-action-ghost" style={{ flexShrink: 0 }}>
            Review
          </Link>
        </div>
      )}

      <div className="page-detail-grid">
        <div className="page-card page-card-pad">
          <div className="prose">
            {page.body ? (
              <PortableText value={page.body as any} components={ptComponents as any} />
            ) : (
              <p style={{ color: '#8b8b93' }}>This page has no content yet.</p>
            )}
          </div>
        </div>

        <aside className="page-sidebar">
          <section className="sidebar-section">
            <h2 className="sidebar-title">Linked facts</h2>
            {linkedFacts.length > 0 ? (
              <ul className="sidebar-facts">
                {linkedFacts.map((f) => (
                  <li key={f._id}>
                    <span className="sidebar-fact-label">{f.label}</span>
                    <span className="sidebar-fact-value">{[f.value, f.unit].filter(Boolean).join(' ')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sidebar-empty">No canonical facts are linked. Plain-text numbers here are at risk of drift.</p>
            )}
          </section>

          <section className="sidebar-section">
            <h2 className="sidebar-title">Document</h2>
            <dl className="sidebar-meta">
              <dt>Kind</dt>
              <dd style={{ textTransform: 'capitalize' }}>{page.kind}</dd>
              <dt>Drift</dt>
              <dd>{findings.length > 0 ? `${findings.length} open` : 'Clean'}</dd>
              {page._updatedAt && (
                <>
                  <dt>Updated</dt>
                  <dd suppressHydrationWarning>{formatDate(page._updatedAt)}</dd>
                </>
              )}
              <dt>ID</dt>
              <dd><code style={{ fontSize: 10.5 }}>{page._id}</code></dd>
            </dl>
          </section>

          <OfficialOnly>
            <a href={studioUrl} target="_blank" rel="noopener noreferrer" className="btn-action" style={{ width: '100%', justifyContent: 'center' }}>
              <ExternalLink size={14} /> Open in Sanity Studio
            </a>
          </OfficialOnly>
        </aside>
      </div>
    </div>
  )
}
