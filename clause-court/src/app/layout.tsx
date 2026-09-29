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
        <Navigation />
        <main style={{ minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </main>
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.05em',
        }}>
          ⚖ CLAUSE COURT — AI arguments. Structural precedent. Human judgment.
        </footer>
      </body>
    </html>
  )
}
