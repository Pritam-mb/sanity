import { sanityClient } from '@/lib/sanity/client'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { FindingsTable, type FindingRow } from '@/components/FindingsTable'

export const dynamic = 'force-dynamic'

async function getFindings(): Promise<FindingRow[]> {
  return sanityClient.fetch(
    `*[_type == "finding"] | order(detectedAt desc)[0...100]{
      _id, rule, status, excerpt, foundValue, expectedValue, detectedAt,
      "page": page->{ _id, title, "slug": slug.current },
      "fact": fact->{ _id, label }
    }`
  )
}

export default async function FindingsPage() {
  const findings = await getFindings()

  return (
    <div className="page-shell">
      <Breadcrumbs items={[{ label: 'Governance' }, { label: 'Findings' }]} />
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Scanner output · R1-R5</div>
      <h1 className="page-title">Findings</h1>
      <p className="page-sub">Every drift the scanner detected. Click an excerpt to read the full matched text.</p>
      <FindingsTable findings={findings} />
    </div>
  )
}
