import type { Metadata } from 'next'
import './globals.css'
import { AppShell } from '@/components/AppShell'
import { SmoothScroll } from '@/components/SmoothScroll'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Fact Ledger: Policy Drift Control',
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-white antialiased">
        <SmoothScroll>
          <AppShell>
            {children}
          </AppShell>
        </SmoothScroll>
      </body>
    </html>
  )
}
