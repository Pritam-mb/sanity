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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Megaphone,
  MessageSquareWarning,
  CircleHelp,
  PencilLine,
  Home,
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
  { href: '/portal', label: 'Home', icon: Home },
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
  const [collapsed, setCollapsed] = useState(false)
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
        <Link href={role === 'official' ? '/dashboard' : '/portal'} className="flex items-center gap-2 font-bold text-sm tracking-tight text-white shrink-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white text-black text-xs font-mono font-black">
            FL
          </span>
          <span className="hidden sm:inline">Fact Ledger</span>
          <span className="text-neutral-700 text-xs hidden sm:inline">/</span>
          <span className="text-neutral-400 text-xs font-medium truncate max-w-[160px] hidden sm:inline">
            {orgName}
          </span>
        </Link>

        {/* Centered Topbar Routing Options */}
        <div className="hidden xl:flex nav-pill-center bg-white/5 border border-white/10 rounded-full px-2 py-0.5 shadow-inner max-w-[calc(100vw-420px)] overflow-x-auto">
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
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap ${
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

        <div className="flex items-center gap-2.5 shrink-0 z-10">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-white bg-white/5 border border-white/15 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {role === 'official' ? 'OFFICIAL CONSOLE' : 'EMPLOYEE PORTAL'}
          </div>
          <RoleSwitcher role={role} setRole={setRole} />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
            title="Return to website"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline font-semibold">Exit</span>
          </Link>
        </div>
      </header>

      {/* ── Body: sidebar + content, no gaps, single page scroll ── */}
      <div className="flex items-stretch pt-14 min-h-screen">
        <aside
          className={`border-r border-white/10 bg-black flex flex-col shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] self-start transition-[width] duration-200 ${
            collapsed ? 'w-16' : 'w-60'
          }`}
        >
          {/* Sidebar header with the single collapse toggle */}
          <div className={`flex items-center h-12 px-2 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center' : 'justify-between px-3'}`}>
            {!collapsed && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                {role === 'official' ? 'Official Console' : 'Employee Portal'}
              </span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto" aria-label="Sidebar">
            {NAV_LINKS.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/portal' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center h-10 px-3 text-[13px] font-semibold rounded-lg transition-colors border ${
                    isActive
                      ? 'bg-white !text-black font-bold border-white hover:bg-neutral-100 hover:!text-black'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'
                  } ${collapsed ? 'justify-center gap-0' : 'gap-3'}`}
                >
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && <span className="truncate leading-none">{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          <div className="p-2 border-t border-white/10 shrink-0">
            {!collapsed ? (
              <div className="px-3 py-2 text-[11px] text-neutral-500 leading-snug">
                {role === 'official'
                  ? 'Every drift metric, complaint and question in one console.'
                  : 'Raise complaints, vote on news, ask about any policy.'}
              </div>
            ) : null}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 bg-black">
          {children}
        </main>
      </div>
    </div>
  )
}
