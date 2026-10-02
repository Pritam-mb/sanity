import { sanityClient } from '@/lib/sanity/client'
import Link from 'next/link'

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

const kindColors: Record<string, string> = {
  policy: '#7c3aed',
  help: '#0284c7',
  pricing: '#059669',
  faq: '#b45309',
}

export default async function PagesIndex() {
  const pages = await getPages()

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/" style={{ fontSize: 14, color: '#6366f1' }}>← Dashboard</Link>
      <h1 style={{ marginTop: '1rem', fontSize: '1.8rem', fontWeight: 700 }}>Pages</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        {pages.length} page{pages.length !== 1 ? 's' : ''} in the system
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {pages.map((p) => (
          <li key={p._id}>
            <Link
              href={`/pages/${p.slug?.current}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                border: '1px solid #1e293b',
                borderRadius: 8,
                background: '#0f172a',
                color: '#e2e8f0',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: kindColors[p.kind] ?? '#334155',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {p.kind}
              </span>
              <span style={{ fontWeight: 500 }}>{p.title}</span>
            </Link>
          </li>
        ))}
        {pages.length === 0 && (
          <li style={{ color: '#64748b', padding: '1rem 0' }}>
            No pages yet — run <code>npm run seed</code> to create demo data.
          </li>
        )}
      </ul>
    </main>
  )
}
