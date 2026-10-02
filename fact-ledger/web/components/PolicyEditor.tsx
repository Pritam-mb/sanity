'use client'

import { useState } from 'react'

/** Official inline editor for one canonical policy fact. */
export function PolicyEditor({
  fact,
}: {
  fact: { _id: string; label: string; value: string; unit?: string; aliases?: string[]; status: string }
}) {
  const [value, setValue] = useState(fact.value)
  const [unit, setUnit] = useState(fact.unit ?? '')
  const [aliases, setAliases] = useState((fact.aliases ?? []).join(', '))
  const [status, setStatus] = useState(fact.status)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const dirty =
    value !== fact.value ||
    unit !== (fact.unit ?? '') ||
    aliases !== (fact.aliases ?? []).join(', ') ||
    status !== fact.status

  const save = async () => {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/facts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fact._id,
          value,
          unit,
          aliases: aliases.split(',').map((a) => a.trim()).filter(Boolean),
          status,
          editedBy: 'Policy Office',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg('Saved — re-run a scan to propagate drift findings.')
        setTimeout(() => window.location.reload(), 900)
      } else setMsg(data.error || 'Save failed')
    } catch (err: any) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full bg-[#0a0a0a] border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/50 transition-colors'

  return (
    <div className="page-card page-card-pad flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm font-bold text-white">{fact.label}</div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-[#0a0a0a] border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs cursor-pointer">
          <option value="active">active</option>
          <option value="deprecated">deprecated</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          Value
          <input className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          Unit
          <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="days, %, MB…" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
        Aliases (comma separated — the scanner watches these)
        <input className={inputCls} value={aliases} onChange={(e) => setAliases(e.target.value)} />
      </label>
      {msg && <div className="text-xs text-neutral-300 bg-white/5 border border-white/15 rounded-lg px-3 py-2">{msg}</div>}
      <button
        onClick={save}
        disabled={busy || !dirty || !value.trim()}
        className="self-start px-5 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 cursor-pointer disabled:opacity-40"
      >
        {busy ? 'Saving…' : dirty ? 'Save policy value' : 'No changes'}
      </button>
    </div>
  )
}
