'use client'

import { useState, useEffect } from 'react'
import { ArrowBigUp, ArrowBigDown } from 'lucide-react'

/** Upvote / downvote buttons for an official policy update. One vote per browser. */
export function VoteButtons({
  updateId,
  initialUp,
  initialDown,
}: {
  updateId: string
  initialUp: number
  initialDown: number
}) {
  const [up, setUp] = useState(initialUp)
  const [down, setDown] = useState(initialDown)
  const [voted, setVoted] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem(`fl_voted_${updateId}`)
      if (v) setVoted(v)
    } catch { /* ignore */ }
  }, [updateId])

  const vote = async (dir: 'up' | 'down') => {
    if (voted || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/updates/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: updateId, dir }),
      })
      const data = await res.json()
      if (data.success) {
        setUp(data.upvotes)
        setDown(data.downvotes)
        setVoted(dir)
        try { localStorage.setItem(`fl_voted_${updateId}`, dir) } catch { /* ignore */ }
      }
    } finally {
      setBusy(false)
    }
  }

  const btn = (dir: 'up' | 'down', count: number, active: boolean) => (
    <button
      onClick={() => vote(dir)}
      disabled={!!voted || busy}
      title={voted ? `You voted ${voted === 'up' ? 'up' : 'down'}` : dir === 'up' ? 'Upvote: this looks right' : 'Downvote: I have a concern'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:cursor-default ${
        active
          ? 'bg-white text-black border-white'
          : 'bg-white/[0.04] text-neutral-300 border-white/15 hover:border-white/40 hover:text-white disabled:opacity-60'
      }`}
    >
      {dir === 'up' ? <ArrowBigUp size={15} /> : <ArrowBigDown size={15} />}
      {count}
    </button>
  )

  return (
    <div className="flex items-center gap-2">
      {btn('up', up, voted === 'up')}
      {btn('down', down, voted === 'down')}
      <span className="text-[11px] text-neutral-500 font-mono">net {up - down >= 0 ? '+' : ''}{up - down}</span>
    </div>
  )
}
