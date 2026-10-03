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
    <div className="login-page-root selection:bg-white selection:text-black">
      {/* Top Header */}
      <header className="login-page-header">
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
      <main className="login-card-container">
        <div className="login-card">
          {/* Header */}
          <div className="login-card-header">
            <div className="login-card-icon-wrap">
              <ShieldCheck size={22} />
            </div>
            <h1 className="login-card-title">
              {mode === 'signin' ? 'Sign in to Company Workspace' : 'Create Company Workspace'}
            </h1>
            <p className="login-card-sub">
              Enter your corporate credentials to access continuous policy drift telemetry.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="login-mode-tabs">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`login-mode-tab ${mode === 'signin' ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`login-mode-tab ${mode === 'register' ? 'active' : ''}`}
            >
              Register Workspace
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label className="login-label">
                Organization / Company Name
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <Building2 size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Stripe, Acme Corp"
                  className="login-input"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label">
                Work Email Address
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="compliance@yourcompany.com"
                  className="login-input"
                />
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div className="login-field">
                  <label className="login-label">
                    Primary Compliance Framework
                  </label>
                  <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className="login-select"
                  >
                    <option value="SOC2 Type II">SOC2 Type II</option>
                    <option value="ISO 27001">ISO 27001</option>
                    <option value="GDPR / CCPA">GDPR / CCPA Data Standard</option>
                    <option value="HIPAA Security Rule">HIPAA Security Rule</option>
                  </select>
                </div>

                <div className="login-field">
                  <label className="login-label">
                    Enforcement Policy Mode
                  </label>
                  <select
                    value={enforcement}
                    onChange={(e) => setEnforcement(e.target.value)}
                    className="login-select"
                  >
                    <option value="advisory">Advisory: Scan & report findings only</option>
                    <option value="staged">Staged Release: Batch reconcile before publish</option>
                    <option value="strict">Strict Blocking: Block unverified publish</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="login-submit-btn"
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
          </form>

          {/* Quick Demo Pre-seed Button */}
          <div className="login-demo-box">
            <span className="login-demo-pill">
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
              className="login-demo-btn"
            >
              Instant 1-Click Launch with Benchmark Data
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        Fact Ledger Autonomous Policy Lake · Protected by Cryptographic Releases
      </footer>
    </div>
  )
}
