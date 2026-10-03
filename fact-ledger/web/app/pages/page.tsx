import { sanityClient } from '@/lib/sanity/client'
import { BackLink } from '@/components/BackLink'
import { PagesBrowser, type PageRow } from '@/components/PagesBrowser'

export const dynamic = 'force-dynamic'

async function getPages(): Promise<PageRow[]> {
  return sanityClient.fetch(
    `*[_type == "page"] | order(title asc){
      _id, title, slug, kind,
      "openFindings": count(*[_type == "finding" && status == "open" && references(^._id)])
    }`
  )
}

export default async function PagesIndex() {
  const pages = await getPages()

  return (
    <div className="page-shell" style={{ maxWidth: 960 }}>
      <BackLink />
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Content corpus</div>
      <h1 className="page-title">Pages</h1>
      <p className="page-sub">
        <strong style={{ color: '#fff' }}>{pages.length} page{pages.length !== 1 ? 's' : ''}</strong> actively monitored for drift
      </p>
      <PagesBrowser pages={pages} />
    </div>
  )
}
