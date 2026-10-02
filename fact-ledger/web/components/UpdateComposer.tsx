'use client'

import { useState } from 'react'

/** Official composer: publish a policy update / news item. */
export function UpdateComposer({
  facts,
  pages,
}: {
  facts: { _id: string; label: string }[]
  pages: { _id: string; title: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('news')
  const [summary, setSummary] = useState('')
  const [author, setAuthor] = useState('Policy Office')
  const [factId, setFactId] = useState('')
  const [pageId, setPageId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/updates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, kind, summary, author,
          linkedFactId: factId || undefined,
          linkedPageId: pageId || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) window.location.reload()
      else setError(data.error || 'Failed to publish')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 px-4 bg-white text-black hover:bg-neutral-200 font-bold rounded-xl text-sm transition-colors cursor-pointer"
      >
        + Post official update / news
      </button>
    )
  }

  const inputCls =
    'w-full bg-[#0a0a0a] border border-white/15 rounded-lg px-3 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-white/50 transition-colors'

  return (
    <form onSubmit={submit} className="page-card page-card-pad flex flex-col gap-3">
      <div className="text-sm font-bold text-white">New official update</div>
      <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline" required />
      <div className="grid grid-cols-2 gap-3">
        <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="news">News</option>
          <option value="policy-change">Policy change</option>
          <option value="notice">Notice</option>
        </select>
        <input className={inputCls} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author team" />
      </div>
      <textarea className={inputCls} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What changed, what it means for employees…" rows={3} required />
      <div className="grid grid-cols-2 gap-3">
        <select className={inputCls} value={factId} onChange={(e) => setFactId(e.target.value)}>
          <option value="">Link a fact (optional)</option>
          {facts.map((f) => <option key={f._id} value={f._id}>{f.label}</option>)}
        </select>
        <select className={inputCls} value={pageId} onChange={(e) => setPageId(e.target.value)}>
          <option value="">Link a page (optional)</option>
          {pages.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
        </select>
      </div>
      {error && <div className="text-xs text-neutral-300 bg-white/5 border border-white/15 rounded-lg px-3 py-2">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-white text-black font-bold rounded-xl text-sm hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50">
          {busy ? 'Publishing…' : 'Publish update'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 bg-transparent border border-white/15 text-neutral-300 rounded-xl text-sm hover:text-white cursor-pointer">
          Cancel
        </button>
      </div>
    </form>
  )
}
