import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClauseImpactTree } from '@/components/ClauseImpactTree'
import { getTreeSessionsData } from '@/lib/treeData'

export const dynamic = 'force-dynamic'

export default async function ClauseTreePage() {
  const sessions = await getTreeSessionsData()

  return (
    <div className="page-shell">
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Organization clause explorer</div>
      <h1 className="page-title">Document &amp; Clause Change Impact Tree</h1>
      <p className="page-sub">
        Full-screen workspace mapping how a single fact change cascades across dependent policies, contracts and help guides.
      </p>

      <ClauseImpactTree initialSessions={sessions} />
    </div>
  )
}
