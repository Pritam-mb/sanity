'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import MemberSwitcher from './MemberSwitcher'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/clauses', label: 'Clauses' },
  { href: '/council', label: 'Council' },
  { href: '/precedents', label: 'Precedents' },
  { href: '/knowledge', label: 'Knowledge' },
  { href: '/graph', label: 'Graph' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="nav">
      <div className="nav__inner">
        <Link href="/" className="nav__logo">
          <span className="nav__logo-text">CLAUSE COURT</span>
        </Link>

        <ul className="nav__links">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`nav__link ${isActive ? 'nav__link--active' : ''}`}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MemberSwitcher />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
            }}
          >
            AI Arguments. Human Judgment.
          </span>
        </div>
      </div>
    </nav>
  )
}
