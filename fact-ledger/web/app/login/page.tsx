'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck,
  Building2,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Scale,
  Sparkles,
  ArrowLeft,
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [companyName, setCompanyName] = useState('Acme Technologies')
  const [email, setEmail] = useState('compliance@acme.com')
  const [framework, setFramework] = useState('SOC2 Type II')
  const [enforcement, setEnforcement] = useState('staged')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const orgData = {
      name: companyName || 'Acme Technologies',
      email: email || 'compliance@acme.com',
      framework,
      enforcement,
      isNew: mode === 'register',
      loggedInAt: new Date().toISOString(),
    }

    try {
      sessionStorage.setItem('pg_org', JSON.stringify(orgData))
    } catch (err) {
      // storage unavailable in some sandboxes
    }

    setTimeout(() => {
      router.push('/dashboard')
    }, 600)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-black/90 backdrop-blur-md px-6 py-4 flex items-center justify-between fixed top-0 inset-x-0 z-50">
        <Link href="/" className="flex items-center gap-2.5 text-base font-bold text-white tracking-tight">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white text-black text-xs font-mono font-black">
            FL
          </span>
          <span>Fact Ledger</span>
        </Link>
        <Link
          href="/"
          className="text-xs font-medium text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Overview
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black" style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 40px rgba(255,255,255,0.05)' }}>
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/25 flex items-center justify-center text-white mx-auto mb-3">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              {mode === 'signin' ? 'Sign in to Company Workspace' : 'Create Company Workspace'}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Enter your corporate credentials to access continuous policy drift telemetry.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-white/[0.04] border border-white/10 rounded-xl mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Register Workspace
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1.5">
                Organization / Company Name
              </label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-3 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Stripe, Acme Corp"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-300 font-semibold mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-3 text-neutral-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="compliance@yourcompany.com"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1.5">
                    Primary Compliance Framework
                  </label>
                  <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-neutral-500 transition-colors cursor-pointer"
                  >
                    <option value="SOC2 Type II">SOC2 Type II</option>
                    <option value="ISO 27001">ISO 27001</option>
                    <option value="GDPR / CCPA">GDPR / CCPA Data Standard</option>
                    <option value="HIPAA Security Rule">HIPAA Security Rule</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1.5">
                    Enforcement Policy Mode
                  </label>
                  <select
                    value={enforcement}
                    onChange={(e) => setEnforcement(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-neutral-500 transition-colors cursor-pointer"
                  >
                    <option value="advisory">Advisory — Scan & report findings only</option>
                    <option value="staged">Staged Release — Batch reconcile before publish</option>
                    <option value="strict">Strict Blocking — Block unverified publish</option>
                  </select>
                </div>
              </>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-white text-black hover:bg-neutral-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Entering Workspace...</span>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Access Control Dashboard' : 'Provision & Enter'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Pre-seed Button */}
          <div className="mt-6 pt-5 border-t border-neutral-800/80 text-center">
            <span className="text-[11px] text-neutral-500 block mb-2 font-mono">
              DEMO WORKSPACE PREVIEW
            </span>
            <button
              type="button"
              onClick={() => {
                setCompanyName('Acme Global Governance')
                setEmail('legal@acme.corp')
                setFramework('SOC2 Type II')
                handleSubmit({ preventDefault: () => {} } as any)
              }}
              className="text-xs text-neutral-300 hover:text-white underline underline-offset-4 cursor-pointer font-medium"
            >
              Instant 1-Click Launch with Benchmark Data
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-4 text-center text-neutral-600 text-xs font-mono">
        Fact Ledger Autonomous Policy Lake · Protected by Cryptographic Releases
      </footer>
    </div>
  )
}
