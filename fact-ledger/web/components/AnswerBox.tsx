'use client'

import { useState, useEffect } from 'react'
import { ThumbsUp } from 'lucide-react'

/** Official answer box + helpful votes for a policy question. */
export function AnswerBox({
  questionId,
  existingAnswer,
  answeredBy,
  initialHelpful,
  canAnswer,
}: {
  questionId: string
  existingAnswer?: string
  answeredBy?: string
  initialHelpful: number
  canAnswer: boolean
}) {
  const [answer, setAnswer] = useState(existingAnswer ?? '')
  const [name, setName] = useState('Policy Office')
  const [busy, setBusy] = useState(false)
  const [helpful, setHelpful] = useState(initialHelpful)
  const [voted, setVoted] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(`fl_helpful_${questionId}`)) setVoted(true)
    } catch { /* ignore */ }
  }, [questionId])

  const save = async () => {
    if (!answer.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/questions/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: questionId, answer, answeredBy: name }),
      })
      const data = await res.json()
      if (data.success) window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  const markHelpful = async () => {
    if (voted) return
    const res = await fetch('/api/questions/helpful', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: questionId }),
    })
    const data = await res.json()
    if (data.success) {
      setHelpful(data.helpful)
      setVoted(true)
      try { localStorage.setItem(`fl_helpful_${questionId}`, '1') } catch { /* ignore */ }
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
      {existingAnswer ? (
        <div className="bg-white/[0.04] border border-white/15 rounded-lg px-3 py-2.5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Official answer{answeredBy ? ` · ${answeredBy}` : ''}
          </div>
          <p className="text-sm text-neutral-200 leading-relaxed">{existingAnswer}</p>
        </div>
      ) : canAnswer ? (
        <>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500">Write official answer</div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Answer with the canonical rule and where it lives…"
            rows={3}
            className="w-full bg-[#0a0a0a] border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-white/50"
          />
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your team"
              className="bg-[#0a0a0a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs w-40"
            />
            <button onClick={save} disabled={busy || !answer.trim()} className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 cursor-pointer disabled:opacity-50">
              {busy ? 'Posting…' : 'Post answer'}
            </button>
          </div>
        </>
      ) : (
        <div className="text-xs text-neutral-500 italic">Awaiting an official answer.</div>
      )}
      {existingAnswer && (
        <button
          onClick={markHelpful}
          disabled={voted}
          className={`self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:cursor-default ${
            voted ? 'bg-white text-black border-white' : 'text-neutral-300 border-white/15 hover:border-white/40 hover:text-white'
          }`}
        >
          <ThumbsUp size={13} /> Helpful · {helpful}
        </button>
      )}
    </div>
  )
}
