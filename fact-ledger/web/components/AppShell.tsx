'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  GitBranch,
  FileText,
  Database,
  AlertTriangle,
  Megaphone,
  MessageSquareWarning,
  CircleHelp,
  PencilLine,
  Home,
  Globe,
} from 'lucide-react'

export type Role = 'official' | 'employee'

const OFFICIAL_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal', label: 'Employee View', icon: Home },
  { href: '/updates', label: 'Updates', icon: Megaphone },
  { href: '/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { href: '/ask', label: 'Questions', icon: CircleHelp },
  { href: '/policies', label: 'Edit Policy', icon: PencilLine },
  { href: '/clause-tree', label: 'Clause Tree', icon: GitBranch },
  { href: '/pages', label: 'Pages', icon: FileText },
  { href: '/facts', label: 'Facts', icon: Database },
  { href: '/findings', label: 'Findings', icon: AlertTriangle },
]

const EMPLOYEE_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal', label: 'Employee View', icon: Home },
  { href: '/updates', label: 'Updates & News', icon: Megaphone },
  { href: '/ask', label: 'Ask a Policy', icon: CircleHelp },
  { href: '/complaints', label: 'My Complaints', icon: MessageSquareWarning },
  { href: '/pages', label: 'Policy Library', icon: FileText },
]

export function useRole(): [Role, (r: Role) => void] {
  const [role, setRoleState] = useState<Role>('official')
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fl_role')
      if (saved === 'employee' || saved === 'official') setRoleState(saved)
    } catch { /* ignore */ }
  }, [])
  const setRole = (r: Role) => {
    setRoleState(r)
    try { localStorage.setItem('fl_role', r) } catch { /* ignore */ }
  }
  return [role, setRole]
}

export function RoleSwitcher({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  return (
    <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 gap-1 space-x-1" role="tablist" aria-label="Interface role">
      {(['employee', 'official'] as Role[]).map((r) => (
        <button
          key={r}
          role="tab"
          aria-selected={role === r}
          onClick={() => setRole(r)}
          className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
            role === r ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
          }`}
        >
          {r === 'employee' ? 'Employee' : 'Official'}
        </button>
      ))}
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [orgName, setOrgName] = useState('Acme Technologies')
  const [role, setRole] = useRole()

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pg_org')
      if (raw) {
        const data = JSON.parse(raw)
        if (data.name) setOrgName(data.name)
      }
    } catch {
      // ignore
    }
  }, [])

  // Hide on landing page and login page
  if (pathname === '/' || pathname === '/login') {
    return <>{children}</>
  }

  const NAV_LINKS = role === 'official' ? OFFICIAL_LINKS : EMPLOYEE_LINKS

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-white selection:text-black">
      {/* Fixed Top Bar */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 border-b border-white/10 bg-black/95 backdrop-blur-xl px-4 flex items-center justify-between gap-3">
        {/* Brand logo redirects to dashboard */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-sm tracking-tight text-white shrink-0 hover:opacity-90 transition-opacity"
          title="Fact Ledger Dashboard"
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white text-black text-xs font-mono font-black">
            FL
          </span>
          <span className="hidden sm:inline">Fact Ledger</span>
          <span className="text-neutral-700 text-xs hidden sm:inline">/</span>
          <span className="text-neutral-400 text-xs font-medium truncate max-w-[150px] hidden sm:inline">
            {orgName}
          </span>
        </Link>

        {/* Workspace Navigation Links in topbar (natural flex, never overlaps left or right) */}
        <div className="flex-1 flex justify-center min-w-0 px-2 overflow-hidden">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-0.5 shadow-inner overflow-x-auto no-scrollbar max-w-full">
            {NAV_LINKS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' &&
                  item.href !== '/portal' &&
                  pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white !text-black shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right Actions: Role switcher + Main Website section */}
        <div className="flex items-center gap-2 shrink-0 z-10">
          <div className="hidden 2xl:flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-white bg-white/5 border border-white/15 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {role === 'official' ? 'OFFICIAL' : 'EMPLOYEE'}
          </div>
          <RoleSwitcher role={role} setRole={setRole} />

          <div className="h-4 w-px bg-white/15 mx-0.5" />

          {/* Dedicated separate section for the website home path */}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white transition-colors px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 font-semibold shrink-0"
            title="Go to main website (home)"
          >
            <Globe size={13} className="text-neutral-400" />
            <span className="hidden sm:inline">Main Website</span>
            <span className="sm:hidden">Site</span>
          </Link>
        </div>
      </header>

      {/* ── Body: full width content, sidebar removed ── */}
      <div className="pt-14 min-h-screen flex flex-col bg-black">
        <main className="flex-1 min-w-0 bg-black">
          {children}
        </main>
      </div>
    </div>
  )
}
