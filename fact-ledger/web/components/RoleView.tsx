'use client'

import type { ReactNode } from 'react'
import { useRole } from './AppShell'

/** Render children only for officials. */
export function OfficialOnly({ children }: { children: ReactNode }) {
  const [role] = useRole()
  if (role !== 'official') return null
  return <>{children}</>
}

/** Render children only for employees. */
export function EmployeeOnly({ children }: { children: ReactNode }) {
  const [role] = useRole()
  if (role !== 'employee') return null
  return <>{children}</>
}
