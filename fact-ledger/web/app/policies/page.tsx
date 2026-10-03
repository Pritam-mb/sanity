import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { sanityClient } from '@/lib/sanity/client'
import { PolicyEditor } from '@/components/PolicyEditor'
import { OfficialOnly, EmployeeOnly } from '@/components/RoleView'

export const dynamic = 'force-dynamic'

interface FactDoc {
  _id: string
  label: string
  value: string
  unit?: string
  aliases?: string[]
  status: string
  key?: { current: string }
}

export default async function PoliciesPage() {
  const facts = await sanityClient.fetch<FactDoc[]>(
    `*[_type == "fact"] | order(label asc){ _id, label, value, unit, aliases, status, key }`
  )
  const active = facts.filter((f) => f.status === 'active').length

  return (
    <div className="page-shell">
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>
      <div className="page-eyebrow"><span className="page-eyebrow-dot" /> Canonical registry</div>
      <h1 className="page-title">Edit Policy</h1>
      <p className="page-sub">
        <strong style={{ color: '#fff' }}>{active} active values</strong> · officials edit canonical numbers here: every save is audit-logged, and the next scan flags stale copies.
      </p>

      <OfficialOnly>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          {facts.map((f) => (
            <PolicyEditor key={f._id} fact={f} />
          ))}
        </div>
      </OfficialOnly>

      <EmployeeOnly>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {facts.map((f) => (
            <div key={f._id} className="page-card page-card-pad">
              <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', letterSpacing: '0.08em', color: '#8b8b93', textTransform: 'uppercase', marginBottom: 6 }}>
                {f.key?.current ?? f.label}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{f.label}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: '4px 0' }}>
                {[f.value, f.unit].filter(Boolean).join(' ')}
              </div>
              <span className={`badge ${f.status === 'active' ? 'badge-fixed' : 'badge-dismissed'}`}>{f.status}</span>
            </div>
          ))}
        </div>
      </EmployeeOnly>
    </div>
  )
}
