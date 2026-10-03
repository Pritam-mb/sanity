'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { useRole } from './AppShell'

/**
 * Wraps official-only surfaces (the control center). Employees see a short
 * explanation and a route back to their own portal instead of admin tooling.
 */
export function OfficialGate({ children }: { children: ReactNode }) {
  const [role] = useRole()
  if (role === 'official') return <>{children}</>
  return (
    <div className="page-shell" style={{ maxWidth: 640, paddingTop: '5rem', textAlign: 'center' }}>
      <div className="gate-icon">
        <ShieldCheck size={22} />
      </div>
      <h1 className="page-title" style={{ marginTop: 16 }}>Official control center</h1>
      <p className="page-sub" style={{ maxWidth: 460, margin: '0 auto 24px' }}>
        The scanner, remediation drafts and audit ledger are available to policy officials only.
        Your policy library, updates and questions live in your portal.
      </p>
      <Link href="/portal" className="btn-action" style={{ display: 'inline-flex' }}>
        Go to Home
      </Link>
    </div>
  )
}
