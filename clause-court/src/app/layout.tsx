import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Clause Court — AI Debate Chamber for Ambiguous Policy Clauses',
  description:
    'Clause Court is an AI courtroom for structured policies. Two AI advocates argue ambiguous clauses, a human judge rules, and every ruling becomes persistent precedent that shapes future debates.',
  keywords: ['policy review', 'contract analysis', 'AI debate', 'legal tech', 'clause analysis'],
  authors: [{ name: 'Clause Court' }],
  openGraph: {
    title: 'Clause Court — AI Debate Chamber',
    description: 'AI courtroom for ambiguous structured clauses. Debate. Rule. Build Precedent.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Navigation />
        <main id="main-content" style={{ minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </main>
        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '36px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            background: 'var(--bg-void)',
          }}
        >
          <div
            style={{
              maxWidth: '760px',
              margin: '0 auto 16px',
              padding: '14px 18px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              lineHeight: '1.6',
              fontSize: '0.75rem',
            }}
          >
            <div
              style={{
                color: 'var(--gold-400)',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em',
                marginBottom: '4px',
              }}
            >
              PROTOTYPE NOTICE · NOT LEGAL ADVICE (PRD §31)
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>
              Clause Court is a structured policy review prototype developed for the Sanity Challenge 2026.
              Generated interpretations and advocate arguments are synthetic structured reviews produced by AI,
              not legal conclusions, binding determinations, or professional legal counsel. Precedents reflect
              simulated organizational decisions within this application.
            </p>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
            }}
          >
            CLAUSE COURT — AI arguments. Structural precedent. Human judgment.
          </div>
        </footer>
      </body>
    </html>
  )
}
