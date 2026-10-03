'use client'

import { useState } from 'react'

const CATEGORIES = [
  { value: 'contradiction', label: 'Contradiction' },
  { value: 'unclear', label: 'Unclear wording' },
  { value: 'outdated', label: 'Outdated value' },
  { value: 'unfair', label: 'Unfair policy' },
  { value: 'other', label: 'Other' },
]

/** Employee form: raise a complaint against a specific fact or page. */
export function ComplaintForm({
  facts,
  pages,
}: {
  facts: { _id: string; label: string; value: string; unit?: string }[]
  pages: { _id: string; title: string }[]
}) {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('unclear')
  const [targetType, setTargetType] = useState<'fact' | 'page'>('fact')
  const [targetId, setTargetId] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/complaints/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, category, raisedBy: name,
          targetFactId: targetType === 'fact' ? targetId || undefined : undefined,
          targetPageId: targetType === 'page' ? targetId || undefined : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) setDone(true)
      else setError(data.error || 'Failed to submit')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full bg-[#0a0a0a] border border-white/15 rounded-lg px-3 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-white/50 transition-colors'

  if (done) {
    return (
      <div className="page-card page-card-pad text-center">
        <div className="text-white font-bold mb-1">Complaint received</div>
        <p className="text-sm text-neutral-400 mb-4">The policy office will triage it. Track status below.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg cursor-pointer">
          Raise another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="page-card page-card-pad flex flex-col gap-3">
      <div className="text-sm font-bold text-white">Raise a complaint about a policy</div>
      <div className="grid grid-cols-2 gap-3">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
        <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short title: e.g. Refund page still says 30 days" required />
      <div className="flex gap-2">
        {(['fact', 'page'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTargetType(t); setTargetId('') }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              targetType === t ? 'bg-white text-black border-white' : 'text-neutral-400 border-white/15 hover:text-white'
            }`}
          >
            {t === 'fact' ? 'Against a policy value' : 'Against a page'}
          </button>
        ))}
      </div>
      {targetType === 'fact' ? (
        <select className={inputCls} value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
          <option value="">Select policy…</option>
          {facts.map((f) => <option key={f._id} value={f._id}>{f.label} : {[f.value, f.unit].filter(Boolean).join(' ')}</option>)}
        </select>
      ) : (
        <select className={inputCls} value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
          <option value="">Select page…</option>
          {pages.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
        </select>
      )}
      <textarea className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the problem with specifics…" rows={4} required />
      {error && <div className="text-xs text-neutral-300 bg-white/5 border border-white/15 rounded-lg px-3 py-2">{error}</div>}
      <button type="submit" disabled={busy} className="py-2.5 bg-white text-black font-bold rounded-xl text-sm hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50">
        {busy ? 'Submitting…' : 'Submit complaint'}
      </button>
    </form>
  )
}
