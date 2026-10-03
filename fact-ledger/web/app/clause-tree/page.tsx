import { ClauseImpactTree } from '@/components/ClauseImpactTree'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { getTreeSessionsData } from '@/lib/treeData'

export const dynamic = 'force-dynamic'

export default async function ClauseTreePage() {
  const sessions = await getTreeSessionsData()

  return (
    <div className="page-shell">
      <Breadcrumbs items={[{ label: 'Governance' }, { label: 'Clause Tree' }]} />
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Organization clause explorer</div>
      <h1 className="page-title">Document &amp; Clause Change Impact Tree</h1>
      <p className="page-sub">
        Trace who changed what, which clause moved, and every downstream policy, contract and help guide affected.
      </p>

      <ClauseImpactTree initialSessions={sessions} hideHeader />
    </div>
  )
}
