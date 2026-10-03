'use client'

import { useState } from 'react'

const STATUSES = ['open', 'in-review', 'resolved', 'dismissed'] as const

/** Official triage: respond to a complaint and move its status. */
export function ComplaintTriage({
  complaintId,
  currentStatus,
  currentResponse,
}: {
  complaintId: string
  currentStatus: string
  currentResponse?: string
}) {
  const [response, setResponse] = useState(currentResponse ?? '')
  const [status, setStatus] = useState(currentStatus)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/complaints/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: complaintId, response, status }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => window.location.reload(), 600)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500">Official triage</div>
      <textarea
        value={response}
        onChange={(e) => { setResponse(e.target.value); setSaved(false) }}
        placeholder="Write the official response…"
        rows={2}
        className="w-full bg-[#0a0a0a] border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-white/50"
      />
      <div className="flex gap-2">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setSaved(false) }}
          className="bg-[#0a0a0a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs cursor-pointer"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 cursor-pointer disabled:opacity-50"
        >
          {saved ? 'Saved' : busy ? 'Saving…' : 'Save response'}
        </button>
      </div>
    </div>
  )
}
