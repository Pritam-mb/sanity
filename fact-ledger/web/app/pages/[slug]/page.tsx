import { sanityClient } from '@/lib/sanity/client'
import { PortableText } from '@portabletext/react'
import { buildPtComponents, type FactLookup } from '@/components/FactRefInline'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface PageDoc {
  _id: string
  title: string
  slug: { current: string }
  kind: string
  body: unknown[]
}

async function getPage(slug: string): Promise<PageDoc | null> {
  return sanityClient.fetch(
    `*[_type == "page" && slug.current == $slug][0]{
      _id, title, slug, kind, body
    }`,
    { slug }
  )
}

async function getFactsForPage(pageId: string): Promise<FactLookup[]> {
  // Fetch all facts referenced in this page's body via factRef
  return sanityClient.fetch(
    `*[_type == "fact"]{
      _id, label, value, unit
    }`
  )
}

export default async function PageDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  const facts = await getFactsForPage(page._id)
  const factMap = new Map<string, FactLookup>(facts.map((f) => [f._id, f]))
  const ptComponents = buildPtComponents(factMap)

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/pages" style={{ fontSize: 14, color: '#6366f1' }}>
        ← All Pages
      </Link>
      <div
        style={{
          display: 'inline-block',
          marginLeft: '1rem',
          padding: '2px 8px',
          borderRadius: 4,
          background: '#1e1b4b',
          color: '#a5b4fc',
          fontSize: 12,
        }}
      >
        {page.kind}
      </div>
      <h1 style={{ marginTop: '1rem', fontSize: '1.8rem', fontWeight: 700 }}>
        {page.title}
      </h1>
      <hr style={{ margin: '1.5rem 0', borderColor: '#334155' }} />
      <div className="prose">
        {page.body ? (
          <PortableText value={page.body as any} components={ptComponents as any} />
        ) : (
          <p style={{ color: '#64748b' }}>This page has no content yet.</p>
        )}
      </div>
    </main>
  )
}

export async function generateStaticParams() {
  const slugs: { slug: { current: string } }[] = await sanityClient.fetch(
    `*[_type == "page"]{ slug }`
  )
  return slugs.map((p) => ({ slug: p.slug.current }))
}
