import { sanityClient } from '@/lib/sanity/client'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageListItem {
  _id: string
  title: string
  slug: { current: string }
  kind: string
}

async function getPages(): Promise<PageListItem[]> {
  return sanityClient.fetch(
    `*[_type == "page"] | order(title asc){ _id, title, slug, kind }`
  )
}

export default async function PagesIndex() {
  const pages = await getPages()

  return (
    <div className="page-shell" style={{ maxWidth: 900 }}>
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Content corpus</div>
      <h1 className="page-title">Pages</h1>
      <p className="page-sub">
        <strong style={{ color: '#fff' }}>{pages.length} page{pages.length !== 1 ? 's' : ''}</strong> actively monitored for drift
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {pages.map((p) => (
          <li key={p._id}>
            <Link href={`/pages/${p.slug?.current}`} style={{ textDecoration: 'none' }}>
              <span className="list-row-card">
                <span style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: '#fff', border: '1px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
                }}>
                  <FileText size={15} />
                </span>
                <span className="kind-chip kind-chip-white">
                  {p.kind}
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{p.title}</span>
                <span style={{ marginLeft: 'auto', color: '#fff', fontWeight: 800 }}>→</span>
              </span>
            </Link>
          </li>
        ))}
        {pages.length === 0 && (
          <li className="page-card page-card-pad" style={{ color: '#8b8b93' }}>
            No pages yet. Run <code>npm run seed</code> to create demo data.
          </li>
        )}
      </ul>
    </div>
  )
}
