'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  'Refund Policy',
  'Service Level Agreement',
  'Support Policy',
  'Data Policy',
  'Billing',
  'Technical',
  'Security',
  'Legal',
  'Compliance',
  'Usage Policy',
]

// In-app case submission. Previously the only way to add a case was Sanity
// Studio; this form posts to POST /api/clauses, which scans the text with the
// deterministic engine and lands the clause in `flagged` or `draft`.
export default function SubmitCaseForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [category, setCategory] = useState('Support Policy')
  const [submittedBy, setSubmittedBy] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setWorking(true)
    setError(null)
    try {
      const res = await fetch('/api/clauses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text, category, submittedBy }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')
      router.push(`/clauses/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
      setWorking(false)
    }
  }

  if (!open) {
    return (
      <button className="btn btn--primary" onClick={() => setOpen(true)}>
        Submit a Case
      </button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="card card--gold animate-fade-in"
      style={{ marginBottom: '24px' }}
      aria-label="Submit a new case"
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          color: 'var(--gold-400)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}
      >
        Submit a Case Before the Court
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--danger-dim)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '14px',
          }}
        >
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label className="input-label" htmlFor="new-case-title">
            Case title
          </label>
          <input
            id="new-case-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Vendor Incident Reporting"
            required
          />
        </div>

        <div>
          <label className="input-label" htmlFor="new-case-text">
            Clause text — the exact wording under review
          </label>
          <textarea
            id="new-case-text"
            className="textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Vendors must report security incidents promptly after discovery."
            rows={3}
            required
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <label className="input-label" htmlFor="new-case-category">
              Category
            </label>
            <select
              id="new-case-category"
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="new-case-author">
              Your name — shown as who put this case forward
            </label>
            <input
              id="new-case-author"
              className="input"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              placeholder="e.g. Priya Raman"
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn--primary" disabled={working}>
            {working ? 'Scanning…' : 'Submit for Review'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={working}
            onClick={() => {
              setOpen(false)
              setError(null)
            }}
          >
            Cancel
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          On submit the deterministic engine scans your text immediately — a vague
          clause lands straight in <strong>flagged</strong>, a clean one in{' '}
          <strong>draft</strong>.
        </p>
      </div>
    </form>
  )
}
