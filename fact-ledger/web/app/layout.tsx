import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Fact Ledger: Drift Dashboard',
  description: 'Change one fact, find every stale copy, fix them in one reviewed release, and verify drift is zero.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header style={{
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1e293b',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <nav style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 1.5rem',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
          }}>
            <Link href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: '#f1f5f9',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.02em',
            }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.5)',
                  color: '#a5b4fc',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                }}
              >
                FL
              </span>
              Fact Ledger
            </Link>
            <div style={{ display: 'flex', gap: '1.25rem', marginLeft: '1rem' }}>
              {[
                { href: '/', label: 'Dashboard' },
                { href: '/clause-tree', label: 'Clause Tree' },
                { href: '/pages', label: 'Pages' },
                { href: '/facts', label: 'Facts' },
                { href: '/findings', label: 'Findings' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    padding: '0.25rem 0',
                    transition: 'color 0.15s',
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{
                padding: '3px 10px',
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 100,
                color: '#a5b4fc',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}>
                SEEDED BENCHMARK
              </span>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}
