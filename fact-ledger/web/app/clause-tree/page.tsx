import Link from 'next/link'
import { ClauseImpactTree } from '@/components/ClauseImpactTree'
import { getTreeSessionsData } from '@/lib/treeData'

export const dynamic = 'force-dynamic'

export default async function ClauseTreePage() {
  const sessions = await getTreeSessionsData()

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/"
          style={{
            fontSize: '0.85rem',
            color: 'var(--accent-secondary)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Back to Dashboard
        </Link>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent-secondary)', textTransform: 'uppercase' }}>
            ORGANIZATION CLAUSE EXPLORER
          </span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.15 }}>
          Document & Clause Change Impact Tree
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.35rem' }}>
          Full-screen workspace mapping how an individual organizer member change cascades across dependent policies, contracts, and help guides.
        </p>
      </div>

      <ClauseImpactTree initialSessions={sessions} />
    </main>
  )
}
