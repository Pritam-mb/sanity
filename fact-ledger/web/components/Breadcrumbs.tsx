'use client'

import Link from 'next/link'
import { Fragment } from 'react'
import { useRole } from './AppShell'

export interface Crumb {
  label: string
  href?: string
}

/**
 * Hierarchical breadcrumb trail. The root crumb is role-aware
 * (Dashboard for officials, Home for employees) and prepended automatically.
 * The final crumb renders as plain text (current location).
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const [role] = useRole()
  const root: Crumb =
    role === 'official' ? { label: 'Dashboard', href: '/dashboard' } : { label: 'Home', href: '/portal' }
  const trail = [root, ...items]

  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      {trail.map((c, i) => {
        const last = i === trail.length - 1
        return (
          <Fragment key={`${c.label}-${i}`}>
            {i > 0 && <span className="crumb-sep">/</span>}
            {c.href && !last ? (
              <Link href={c.href} className="crumb-link">
                {c.label}
              </Link>
            ) : (
              <span className={last ? 'crumb-current' : 'crumb-plain'} aria-current={last ? 'page' : undefined}>
                {c.label}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
