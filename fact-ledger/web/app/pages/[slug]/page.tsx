import { sanityClient } from '@/lib/sanity/client'
import { PortableText } from '@portabletext/react'
import { buildPtComponents, type FactLookup } from '@/components/FactRefInline'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

async function getFactsForPage(): Promise<FactLookup[]> {
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

  const facts = await getFactsForPage()
  const factMap = new Map<string, FactLookup>(facts.map((f) => [f._id, f]))
  const ptComponents = buildPtComponents(factMap)

  return (
    <div className="page-shell" style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <Link href="/pages" className="back-link" style={{ marginBottom: 0 }}>
          <ArrowLeft size={14} /> All Pages
        </Link>
        <span className="kind-chip">{page.kind}</span>
      </div>
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Live fact-linked document</div>
      <h1 className="page-title">{page.title}</h1>
      <div className="page-card page-card-pad" style={{ marginTop: 18 }}>
        <div className="prose">
          {page.body ? (
            <PortableText value={page.body as any} components={ptComponents as any} />
          ) : (
            <p style={{ color: '#8b8b93' }}>This page has no content yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export async function generateStaticParams() {
  const slugs: { slug: { current: string } }[] = await sanityClient.fetch(
    `*[_type == "page"]{ slug }`
  )
  return slugs.map((p) => ({ slug: p.slug.current }))
}
