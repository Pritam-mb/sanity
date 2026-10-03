'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useRole } from './AppShell'

/**
 * Role-aware back link: officials return to the control center,
 * employees return to their portal home.
 */
export function BackLink() {
  const [role] = useRole()
  const isOfficial = role === 'official'
  return (
    <Link href={isOfficial ? '/dashboard' : '/portal'} className="back-link">
      <ArrowLeft size={14} /> Back to {isOfficial ? 'Dashboard' : 'Home'}
    </Link>
  )
}
