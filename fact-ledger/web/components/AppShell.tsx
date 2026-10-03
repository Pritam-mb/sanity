'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  GitBranch,
  FileText,
  Database,
  AlertTriangle,
  Megaphone,
  MessageSquareWarning,
  CircleHelp,
  Home,
  Globe,
  ChevronDown,
  LogOut,
  Building2,
} from 'lucide-react'

export type Role = 'official' | 'employee'

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
  const router = useRouter()
  const [orgName, setOrgName] = useState('Acme Technologies')
  const [role, setRole] = useRole()
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null)
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdowns on route changes
  useEffect(() => {
    setActiveDropdown(null)
    setAccountMenuOpen(false)
  }, [pathname])

  const handleSignOut = () => {
    try {
      sessionStorage.removeItem('pg_org')
    } catch {
      // ignore
    }
    router.push('/')
  }

  // Hide on landing page and login page
  if (pathname === '/' || pathname === '/login') {
    return <>{children}</>
  }

  // Governance routes
  const governanceItems = [
    { href: '/findings', label: 'Findings', icon: AlertTriangle, desc: 'Scanner drift output' },
    { href: '/facts', label: 'Facts Registry', icon: Database, desc: 'Canonical truth & editor' },
    { href: '/pages', label: 'Monitored Pages', icon: FileText, desc: 'Scanned corpus docs' },
  ]
  const isGovernanceActive =
    pathname.startsWith('/findings') ||
    pathname.startsWith('/facts') ||
    pathname.startsWith('/policies') ||
    pathname.startsWith('/pages')

  // Voice routes
  const voiceItems = [
    { href: '/updates', label: 'Updates', icon: Megaphone, desc: 'Policy changes & announcements' },
    { href: '/complaints', label: 'Complaints', icon: MessageSquareWarning, desc: 'Employee complaints triage' },
    { href: '/ask', label: 'Questions & Answers', icon: CircleHelp, desc: 'Q&A verified policy sources' },
  ]
  const isVoiceActive =
    pathname.startsWith('/updates') ||
    pathname.startsWith('/complaints') ||
    pathname.startsWith('/ask') ||
    pathname.startsWith('/questions')

  // Employee links (clean and dedicated)
  const employeeLinks = [
    { href: '/portal', label: 'Home', icon: Home },
    { href: '/pages', label: 'Policy Library', icon: FileText },
    { href: '/updates', label: 'Updates', icon: Megaphone },
    { href: '/ask', label: 'Ask a Policy', icon: CircleHelp },
    { href: '/complaints', label: 'My Complaints', icon: MessageSquareWarning },
  ]

  const logoHref = role === 'official' ? '/dashboard' : '/portal'

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-white selection:text-black">
      {/* Fixed Top Bar */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 border-b border-white/10 bg-black/95 backdrop-blur-xl px-4 flex items-center justify-between gap-3">
        {/* Brand logo redirects role-appropriately */}
        <Link
          href={logoHref}
          className="flex items-center gap-2 font-bold text-sm tracking-tight text-white shrink-0 hover:opacity-90 transition-opacity"
          title={`Fact Ledger ${role === 'official' ? 'Control Center' : 'Portal'}`}
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

        {/* Workspace Navigation Links in topbar */}
        <div ref={navRef} className="flex-1 flex justify-center min-w-0 px-2">
          {role === 'official' ? (
            <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-0.5 shadow-inner">
              {/* Dashboard */}
              <Link
                href="/dashboard"
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap shrink-0 ${
                  pathname === '/dashboard'
                    ? 'bg-white !text-black shadow-sm font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Dashboard
              </Link>

              {/* Clause Tree */}
              <Link
                href="/clause-tree"
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap shrink-0 ${
                  pathname === '/clause-tree'
                    ? 'bg-white !text-black shadow-sm font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Clause Tree
              </Link>

              {/* Governance Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'governance' ? null : 'governance')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap ${
                    isGovernanceActive
                      ? 'bg-white !text-black shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                  }`}
                  aria-expanded={activeDropdown === 'governance'}
                >
                  Governance
                  <ChevronDown size={12} className={`transition-transform duration-150 ${activeDropdown === 'governance' ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === 'governance' && (
                  <div className="nav-dropdown-menu">
                    <div className="nav-dropdown-header">Governance &amp; Truth</div>
                    {governanceItems.map((item) => {
                      const Icon = item.icon
                      const active =
                        pathname === item.href ||
                        (item.href === '/facts' && pathname.startsWith('/policies')) ||
                        pathname.startsWith(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`nav-dropdown-item ${active ? 'active' : ''}`}
                          onClick={() => setActiveDropdown(null)}
                        >
                          <div className="nav-dropdown-item-icon">
                            <Icon size={14} />
                          </div>
                          <div>
                            <div className="nav-dropdown-item-title">{item.label}</div>
                            <div className="nav-dropdown-item-desc">{item.desc}</div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Voice Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'voice' ? null : 'voice')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap ${
                    isVoiceActive
                      ? 'bg-white !text-black shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                  }`}
                  aria-expanded={activeDropdown === 'voice'}
                >
                  Voice
                  <ChevronDown size={12} className={`transition-transform duration-150 ${activeDropdown === 'voice' ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === 'voice' && (
                  <div className="nav-dropdown-menu">
                    <div className="nav-dropdown-header">Employee Voice &amp; Q&amp;A</div>
                    {voiceItems.map((item) => {
                      const Icon = item.icon
                      const active = pathname.startsWith(item.href) || (item.href === '/ask' && pathname.startsWith('/questions'))
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`nav-dropdown-item ${active ? 'active' : ''}`}
                          onClick={() => setActiveDropdown(null)}
                        >
                          <div className="nav-dropdown-item-icon">
                            <Icon size={14} />
                          </div>
                          <div>
                            <div className="nav-dropdown-item-title">{item.label}</div>
                            <div className="nav-dropdown-item-desc">{item.desc}</div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Employee Mode: Dedicated Clean Links */
            <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-0.5 shadow-inner overflow-x-auto no-scrollbar max-w-full">
              {employeeLinks.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/portal' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap shrink-0 ${
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
          )}
        </div>

        {/* Right Actions: Role switcher + Account Session Dropdown */}
        <div className="flex items-center gap-2 shrink-0 z-10">
          <RoleSwitcher role={role} setRole={setRole} />

          <div className="h-4 w-px bg-white/15 mx-0.5" />

          {/* Account & Session Pill */}
          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white transition-colors px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 font-semibold shrink-0"
              title="Workspace account &amp; navigation"
              aria-expanded={accountMenuOpen}
            >
              <div className="w-4 h-4 rounded-full bg-white text-black text-[9px] font-bold flex items-center justify-center">
                {orgName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline max-w-[100px] truncate">{orgName}</span>
              <ChevronDown size={11} className={`text-neutral-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {accountMenuOpen && (
              <div className="account-dropdown-menu">
                <div className="account-dropdown-header">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white">
                      <Building2 size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">{orgName}</div>
                      <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                        {role === 'official' ? 'Official Access' : 'Employee Access'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="account-dropdown-body">
                  <Link
                    href="/"
                    className="account-dropdown-link"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <Globe size={14} className="text-neutral-400" />
                    <span>Main Website (Landing)</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="account-dropdown-link text-neutral-300 hover:text-white hover:bg-red-500/10 hover:border-red-500/30"
                  >
                    <LogOut size={14} className="text-neutral-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Body: full width content, sidebar removed ── */}
      <div className="pt-14 min-h-screen flex flex-col bg-black">
        <main className="flex-1 min-w-0 bg-black">
          {children}
        </main>

        {/* ── Persistent Workspace Footer Status Bar ── */}
        <footer className="workspace-footer">
          <div className="workspace-footer-inner">
            <div className="workspace-footer-left">
              <span className="workspace-footer-dot" />
              <span>Sanity Content Lake · dataset: <code>fact-ledger</code> · Live Audit Stream Active</span>
            </div>
            <div className="workspace-footer-right">
              <span>
                Fact Ledger made with love by{' '}
                <a
                  href="https://github.com/t-rexbytes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-white font-medium"
                >
                  T-RexBytes
                </a>{' '}
                &amp;{' '}
                <a
                  href="https://github.com/pritam-mb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-white font-medium"
                >
                  Pritam-mb
                </a>
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
