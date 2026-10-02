'use client'

import { useState } from 'react'

/** Employee form: ask about any policy. */
export function QuestionForm({
  facts,
  pages,
}: {
  facts: { _id: string; label: string }[]
  pages: { _id: string; title: string }[]
}) {
  const [name, setName] = useState('')
  const [question, setQuestion] = useState('')
  const [factId, setFactId] = useState('')
  const [pageId, setPageId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/questions/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question, askedBy: name,
          linkedFactId: factId || undefined,
          linkedPageId: pageId || undefined,
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
        <div className="text-white font-bold mb-1">Question posted</div>
        <p className="text-sm text-neutral-400 mb-4">The policy office will answer it here.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg cursor-pointer">
          Ask another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="page-card page-card-pad flex flex-col gap-3">
      <div className="text-sm font-bold text-white">Ask about any policy</div>
      <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
      <textarea className={inputCls} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Does the 60-day refund apply to monthly plans?" rows={3} required />
      <div className="grid grid-cols-2 gap-3">
        <select className={inputCls} value={factId} onChange={(e) => setFactId(e.target.value)}>
          <option value="">About a policy (optional)</option>
          {facts.map((f) => <option key={f._id} value={f._id}>{f.label}</option>)}
        </select>
        <select className={inputCls} value={pageId} onChange={(e) => setPageId(e.target.value)}>
          <option value="">About a page (optional)</option>
          {pages.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
        </select>
      </div>
      {error && <div className="text-xs text-neutral-300 bg-white/5 border border-white/15 rounded-lg px-3 py-2">{error}</div>}
      <button type="submit" disabled={busy} className="py-2.5 bg-white text-black font-bold rounded-xl text-sm hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50">
        {busy ? 'Posting…' : 'Post question'}
      </button>
    </form>
  )
}
