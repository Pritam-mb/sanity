'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ChamberBundle } from '@/lib/council/chamber'
import type { ViewerMember } from '@/lib/council/viewer'

const SEAT_COLORS: Record<string, string> = {
  Legal: '#a78bfa',
  Security: '#f87171',
  Operations: '#60a5fa',
  'Vendor Management': '#fbbf24',
  Finance: '#c9a84c',
}

function seatColor(seat: string): string {
  return SEAT_COLORS[seat] ?? '#9aa0b8'
}

interface Props {
  initial: ChamberBundle
  viewer: ViewerMember | null
}

export default function ChamberClient({ initial, viewer }: Props) {
  const router = useRouter()
  const [bundle, setBundle] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { session, members, positions, comments, votes, approvals } = bundle
  const viewerId = viewer?._id ?? null
  const isChair = viewerId !== null && viewerId === session.council.chairId
  const myPositioned = viewerId !== null && positions.some((p) => p.memberId === viewerId)
  const myVoted = viewerId !== null && votes.some((v) => v.memberId === viewerId)
  const myApproved = viewerId !== null && approvals.some((a) => a.approverId === viewerId)

  async function call(url: string, body: unknown): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      await reload()
      router.refresh()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function reload() {
    const res = await fetch(
      `/api/sessions/${session._id}${viewerId ? `?viewer=${encodeURIComponent(viewerId)}` : ''}`
    )
    if (res.ok) setBundle(await res.json())
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container container--wide">
        <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: '8px', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link href="/clauses" style={{ color: 'var(--text-muted)' }}>Clauses</Link>
          <span aria-hidden="true">›</span>
          <Link href={`/clauses/${session.clause._id}`} style={{ color: 'var(--text-muted)' }}>
            {session.clause.title}
          </Link>
          <span aria-hidden="true">›</span>
          <span style={{ color: 'var(--gold-400)' }}>Deliberation Chamber</span>
        </nav>

        <header style={{ marginBottom: '24px' }}>
          <div className="court-case-number">
            {session.clause.caseNumber} · {session.council.name} · SESSION {session.status.toUpperCase()}
            {session.round ? ` · ${session.round.toUpperCase()} ROUND` : ''}
          </div>
          <h1 style={{ marginBottom: '8px' }}>{session.clause.title}</h1>
          <p style={{ maxWidth: '720px' }}>
            &ldquo;{session.clause.text}&rdquo;
          </p>
        </header>

        {!viewer && (
          <div className="card" style={{ borderColor: 'var(--border-gold)', marginBottom: '20px' }}>
            <p style={{ fontSize: '0.9rem' }}>
              🪪 <strong>Pick an identity</strong> in the navigation bar to submit positions,
              vote, or approve. You can read everything meanwhile.
            </p>
          </div>
        )}

        {error && (
          <div role="alert" className="card" style={{ borderColor: 'var(--danger)', background: 'var(--danger-dim)', marginBottom: '20px' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>⚠ {error}</p>
          </div>
        )}

        <SummaryCard bundle={bundle} members={members} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            <SpectrumView bundle={bundle} />
            <PositionList
              bundle={bundle}
              viewerId={viewerId}
              busy={busy}
              onReply={(body) => call(`/api/sessions/${session._id}/comments`, { memberId: viewerId, ...body })}
            />
            {session.status === 'deliberation' && (
              <PositionForm
                viewerId={viewerId}
                positions={positions}
                busy={busy}
                onSubmit={(body) => call(`/api/sessions/${session._id}/positions`, { memberId: viewerId, ...body })}
              />
            )}
            <CommentFloor
              comments={comments}
              viewerId={viewerId}
              enabled={['deliberation', 'synthesis'].includes(session.status)}
              busy={busy}
              onSubmit={(body) => call(`/api/sessions/${session._id}/comments`, { memberId: viewerId, ...body })}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ChairPanel
              bundle={bundle}
              isChair={isChair}
              busy={busy}
              onAdvance={(body) => call(`/api/sessions/${session._id}/advance`, { actorMemberId: viewerId, ...body })}
            />
            <OptionsPanel
              bundle={bundle}
              viewerId={viewerId}
              busy={busy}
              onDraft={(body) => call(`/api/sessions/${session._id}/options`, { memberId: viewerId, ...body })}
              onVote={(optionId) => call(`/api/sessions/${session._id}/votes`, { memberId: viewerId, optionId })}
              voted={myVoted}
            />
            <ApprovalsPanel
              bundle={bundle}
              viewerId={viewerId}
              busy={busy}
              signed={myApproved}
              positioned={myPositioned}
              onSign={(note) => call(`/api/sessions/${session._id}/approvals`, { approverId: viewerId, note })}
              onAdvance={(body) => call(`/api/sessions/${session._id}/advance`, { actorMemberId: viewerId, ...body })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Deterministic summary ───────────────────────────────

function SummaryCard({ bundle, members }: { bundle: ChamberBundle; members: ChamberBundle['members'] }) {
  const { summary, positions, hiddenPositionCount, summaryScope } = bundle
  const silent = members.filter((m) => !positions.some((p) => p.memberId === m._id))

  return (
    <section className="card card--gold animate-fade-in" style={{ marginBottom: '20px' }} aria-label="Computed council summary">
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--gold-400)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
        Σ Computed summary — no model involved
        {summaryScope === 'visible' && ' · over positions visible to you'}
      </div>
      {summary.count === 0 && hiddenPositionCount === 0 ? (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          No positions yet. The summary fills in as members submit.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <SummaryStat label="Positions" value={`${summary.count} / ${members.length}`} />
          {summary.count > 0 && (
            <>
              <SummaryStat label="Min" value={String(summary.min)} />
              <SummaryStat label="Median" value={String(summary.median)} />
              <SummaryStat label="Max" value={String(summary.max)} />
              <SummaryStat label="Consensus" value={summary.consensus.toFixed(2)} />
            </>
          )}
          {hiddenPositionCount > 0 && (
            <span className="badge badge--ruled">+{hiddenPositionCount} hidden blind</span>
          )}
        </div>
      )}
      {summary.clusters.length > 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
          Clusters: {summary.clusters.map((c) => (c.lo === c.hi ? `${c.lo} ×${c.count}` : `${c.lo}–${c.hi} ×${c.count}`)).join(' · ')}
        </p>
      )}
      {silent.length > 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          Silent: {silent.map((m) => `${m.name} (${m.seat})`).join(', ')}
        </p>
      )}
    </section>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

// ─── Spectrum view ───────────────────────────────────────

function SpectrumView({ bundle }: { bundle: ChamberBundle }) {
  const { positions, summary, hiddenPositionCount } = bundle
  if (positions.length === 0) {
    return (
      <section className="card" aria-label="Opinion spectrum">
        <SpectrumLabel />
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          {hiddenPositionCount > 0
            ? `${hiddenPositionCount} blind position${hiddenPositionCount === 1 ? '' : 's'} are sealed. The spectrum opens when the chair reveals them.`
            : 'No positions yet — the spectrum appears with the first submission.'}
        </p>
      </section>
    )
  }
  const min = summary.min
  const max = summary.max
  const span = Math.max(max - min, 1)
  const left = (v: number) => (positions.length > 1 ? ((v - min) / span) * 88 + 6 : 50)

  return (
    <section className="card" aria-label="Opinion spectrum">
      <SpectrumLabel />
      <div style={{ position: 'relative', height: '150px', margin: '8px 0 4px' }}>
        <div style={{ position: 'absolute', left: '4%', right: '4%', top: '64px', height: '2px', background: 'linear-gradient(90deg, var(--advocate-a), var(--gold-400), var(--success))' }} />
        <div style={{ position: 'absolute', left: '4%', top: '84px', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{min}</div>
        <div style={{ position: 'absolute', right: '4%', top: '84px', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{max}</div>
        {positions.map((p) => (
          <div
            key={p._id}
            title={`${p.memberName} (${p.memberSeat}): ${p.proposedValue} ${p.unit}, confidence ${p.confidence}`}
            style={{
              position: 'absolute',
              left: `${left(p.proposedValue)}%`,
              top: '64px',
              transform: 'translate(-50%, -50%)',
              width: `${12 + p.confidence * 5}px`,
              height: `${12 + p.confidence * 5}px`,
              borderRadius: '50%',
              background: seatColor(p.memberSeat),
              border: p.basisNote ? '2px solid var(--gold-100)' : '2px solid rgba(0,0,0,0.4)',
              boxShadow: `0 0 12px ${seatColor(p.memberSeat)}66`,
            }}
          />
        ))}
        {positions.map((p) => (
          <div
            key={`label-${p._id}`}
            style={{
              position: 'absolute',
              left: `${left(p.proposedValue)}%`,
              top: '104px',
              transform: 'translateX(-50%)',
              fontSize: '0.68rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}
          >
            {p.memberName.split(' ')[0]} · {p.proposedValue}
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Dot size = confidence · gold ring = cites a regulation or precedent
        {hiddenPositionCount > 0 && ` · +${hiddenPositionCount} sealed blind`}
      </p>
    </section>
  )
}

function SpectrumLabel() {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
      ◉ Opinion spectrum — proposed values
    </div>
  )
}

// ─── Positions + replies ─────────────────────────────────

function PositionList({
  bundle,
  viewerId,
  busy,
  onReply,
}: {
  bundle: ChamberBundle
  viewerId: string | null
  busy: boolean
  onReply: (body: { kind: string; body: string; targetPositionId: string }) => Promise<boolean>
}) {
  const { positions, comments } = bundle
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyKind, setReplyKind] = useState('question')
  const [replyBody, setReplyBody] = useState('')

  if (positions.length === 0) return null

  return (
    <section aria-label="Council positions" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {positions.map((p) => {
        const replies = comments.filter((c) => c.targetPositionId === p._id)
        return (
          <article key={p._id} className="card" style={{ borderLeft: `3px solid ${seatColor(p.memberSeat)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <div>
                <strong>{p.memberName}</strong>{' '}
                <span style={{ fontSize: '0.72rem', color: seatColor(p.memberSeat), fontWeight: '700' }}>{p.memberSeat}</span>{' '}
                <span className="badge badge--debated" style={{ marginLeft: '6px' }}>{p.stance}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--gold-300)' }}>
                {p.proposedValue} {p.unit} · {'★'.repeat(p.confidence)}{'☆'.repeat(5 - p.confidence)}
              </span>
            </div>
            {p.rationale && <p style={{ fontSize: '0.88rem', marginBottom: '6px' }}>{p.rationale}</p>}
            {p.basisNote && (
              <p style={{ fontSize: '0.76rem', color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
                ⚓ {p.basisNote}
              </p>
            )}
            {replies.map((r) => (
              <div key={r._id} style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-raised)', borderRadius: '6px', fontSize: '0.82rem' }}>
                <span style={{ fontWeight: '700', color: r.kind === 'challenge' ? 'var(--danger)' : r.kind === 'support' ? 'var(--success)' : 'var(--advocate-a-light)' }}>
                  [{r.kind}]
                </span>{' '}
                <strong>{r.authorName}</strong> <span style={{ color: 'var(--text-muted)' }}>({r.authorSeat})</span>
                <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{r.body}</p>
              </div>
            ))}
            {viewerId && (
              replyTo === p._id ? (
                <form
                  style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const ok = await onReply({ kind: replyKind, body: replyBody, targetPositionId: p._id })
                    if (ok) {
                      setReplyTo(null)
                      setReplyBody('')
                    }
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select aria-label="Reply kind" className="input" value={replyKind} onChange={(e) => setReplyKind(e.target.value)} style={{ maxWidth: '150px' }}>
                      <option value="support">Support</option>
                      <option value="challenge">Challenge</option>
                      <option value="question">Question</option>
                    </select>
                    <input aria-label="Reply" className="input" value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Reply to this position…" required />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn--ghost btn--sm" disabled={busy}>Send</button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReplyTo(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button className="btn btn--ghost btn--sm" style={{ marginTop: '8px' }} onClick={() => setReplyTo(p._id)}>
                  Reply
                </button>
              )
            )}
          </article>
        )
      })}
    </section>
  )
}

function PositionForm({
  viewerId,
  positions,
  busy,
  onSubmit,
}: {
  viewerId: string | null
  positions: ChamberBundle['positions']
  busy: boolean
  onSubmit: (body: Record<string, unknown>) => Promise<boolean>
}) {
  const [stance, setStance] = useState('custom')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('business_hours')
  const [rationale, setRationale] = useState('')
  const [confidence, setConfidence] = useState(3)
  const [basisNote, setBasisNote] = useState('')
  const mine = viewerId ? positions.find((p) => p.memberId === viewerId) : undefined

  if (!viewerId) return null

  return (
    <form
      className="card card--gold"
      aria-label="Submit position"
      onSubmit={async (e) => {
        e.preventDefault()
        const ok = await onSubmit({
          stance,
          proposedValue: Number(value),
          unit,
          rationale,
          confidence,
          basisNote,
          revisionOf: mine?._id,
        })
        if (ok) {
          setValue('')
          setRationale('')
          setBasisNote('')
        }
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--gold-400)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
        {mine ? '↻ Revise your position (the original stays on record)' : '📍 Submit your position'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '10px' }}>
        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Stance
          <select className="input" value={stance} onChange={(e) => setStance(e.target.value)} style={{ marginTop: '4px' }}>
            <option value="support-A">Support A</option>
            <option value="support-B">Support B</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Value
          <input className="input" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} required style={{ marginTop: '4px' }} />
        </label>
        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Unit
          <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} required style={{ marginTop: '4px' }} />
        </label>
        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Confidence (1–5)
          <input className="input" type="number" min={1} max={5} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} style={{ marginTop: '4px' }} />
        </label>
      </div>
      <textarea aria-label="Rationale" className="textarea" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Why — in one or two sentences…" rows={2} style={{ marginBottom: '10px' }} />
      <input aria-label="Regulation or benchmark basis" className="input" value={basisNote} onChange={(e) => setBasisNote(e.target.value)} placeholder="Basis, e.g. GDPR Art. 33 — 72h (optional)" style={{ marginBottom: '10px' }} />
      <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>
        {mine ? 'Submit revision' : 'Submit position'}
      </button>
    </form>
  )
}

function CommentFloor({
  comments,
  viewerId,
  enabled,
  busy,
  onSubmit,
}: {
  comments: ChamberBundle['comments']
  viewerId: string | null
  enabled: boolean
  busy: boolean
  onSubmit: (body: { kind: string; body: string }) => Promise<boolean>
}) {
  const floor = comments.filter((c) => !c.targetPositionId)
  const [kind, setKind] = useState('question')
  const [body, setBody] = useState('')

  return (
    <section className="card" aria-label="Open floor">
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
        💬 Open floor
      </div>
      {floor.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>No open-floor remarks yet.</p>
      )}
      {floor.map((c) => (
        <p key={c._id} style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
          <span style={{ fontWeight: '700', color: c.kind === 'challenge' ? 'var(--danger)' : c.kind === 'support' ? 'var(--success)' : 'var(--advocate-a-light)' }}>
            [{c.kind}]
          </span>{' '}
          <strong>{c.authorName}</strong>: <span style={{ color: 'var(--text-secondary)' }}>{c.body}</span>
        </p>
      ))}
      {viewerId && enabled && (
        <form
          style={{ display: 'flex', gap: '8px', marginTop: '10px' }}
          onSubmit={async (e) => {
            e.preventDefault()
            const ok = await onSubmit({ kind, body })
            if (ok) setBody('')
          }}
        >
          <select aria-label="Remark kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)} style={{ maxWidth: '140px' }}>
            <option value="support">Support</option>
            <option value="challenge">Challenge</option>
            <option value="question">Question</option>
          </select>
          <input aria-label="Open floor remark" className="input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Address the room…" required />
          <button type="submit" className="btn btn--ghost btn--sm" disabled={busy}>Post</button>
        </form>
      )}
    </section>
  )
}

// ─── Chair controls ────────────────────────────────────────

function ChairPanel({
  bundle,
  isChair,
  busy,
  onAdvance,
}: {
  bundle: ChamberBundle
  isChair: boolean
  busy: boolean
  onAdvance: (body: Record<string, unknown>) => Promise<boolean>
}) {
  const { session, positions, options } = bundle
  const [winner, setWinner] = useState('')

  if (!isChair) return null

  return (
    <section className="card" style={{ borderColor: 'var(--border-gold)' }} aria-label="Chair controls">
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--gold-400)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
        🔨 Chair — procedure only
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {session.status === 'briefing' && (
          <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => onAdvance({ to: 'deliberation' })}>
            Open deliberation (blind round)
          </button>
        )}
        {session.status === 'deliberation' && session.round === 'blind' && (
          <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => onAdvance({ to: 'deliberation', round: 'open' })}>
            Reveal positions ({positions.length} sealed)
          </button>
        )}
        {session.status === 'deliberation' && (
          <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => onAdvance({ to: 'synthesis' })}>
            Close to synthesis
          </button>
        )}
        {session.status === 'synthesis' && (
          <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => onAdvance({ to: 'voting' })}>
            Open the vote ({options.length} options)
          </button>
        )}
        {session.status === 'voting' && (
          <>
            <select aria-label="Winning option" className="input" value={winner} onChange={(e) => setWinner(e.target.value)}>
              <option value="">Winning option…</option>
              {options.map((o) => (
                <option key={o._id} value={o._id}>{o.title} ({o.votes})</option>
              ))}
            </select>
            <button className="btn btn--primary btn--sm" disabled={busy || !winner} onClick={() => onAdvance({ to: 'ruled', optionId: winner })}>
              Record the result
            </button>
          </>
        )}
      </div>
    </section>
  )
}

// ─── Options + vote ────────────────────────────────────────

function OptionsPanel({
  bundle,
  viewerId,
  busy,
  onDraft,
  onVote,
  voted,
}: {
  bundle: ChamberBundle
  viewerId: string | null
  busy: boolean
  onDraft: (body: Record<string, unknown>) => Promise<boolean>
  onVote: (optionId: string) => Promise<boolean>
  voted: boolean
}) {
  const { session, options, evaluation } = bundle
  const [title, setTitle] = useState('')
  const [wording, setWording] = useState('')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('business_hours')
  const [source, setSource] = useState('member')

  const showDraft = session.status === 'synthesis' && viewerId !== null
  const showVote = session.status === 'voting' && viewerId !== null && !voted

  if (options.length === 0 && !showDraft) return null

  return (
    <section className="card" aria-label="Options and vote">
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
        🗳 Options {evaluation ? `· ${evaluation.tally ? Object.values(evaluation.tally).reduce((a, b) => a + b, 0) : 0} votes cast` : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: showDraft ? '12px' : '0' }}>
        {options.map((o) => (
          <div key={o._id} style={{ padding: '10px 12px', background: 'var(--bg-raised)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.88rem' }}>{o.title}</strong>
              <span className={`badge ${o.source === 'ai' ? 'badge--debated' : 'badge--resolved'}`}>
                {o.source === 'ai' ? 'AI-drafted' : 'member'}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0' }}>&ldquo;{o.wording}&rdquo;</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {o.value ?? '—'} {o.unit ?? ''} · {o.votes} vote{o.votes === 1 ? '' : 's'}
                {o.draftedByName ? ` · by ${o.draftedByName}` : ''}
                {o.modelInfo ? ` · ${o.modelInfo}` : ''}
              </span>
              {showVote && (
                <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => onVote(o._id)}>
                  Vote
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {evaluation && (
        <EvaluationView evaluation={evaluation} />
      )}
      {showDraft && (
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}
          onSubmit={async (e) => {
            e.preventDefault()
            const ok = await onDraft({
              title,
              wording,
              value: value === '' ? undefined : Number(value),
              unit,
              source,
              modelInfo: source === 'ai' ? 'gemini-2.5-flash / opts-v1' : undefined,
            })
            if (ok) {
              setTitle('')
              setWording('')
              setValue('')
            }
          }}
        >
          <input aria-label="Option title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Option title, e.g. 8-hour standard" required />
          <textarea aria-label="Option wording" className="textarea" value={wording} onChange={(e) => setWording(e.target.value)} placeholder="Exact holding wording…" rows={2} required />
          <div style={{ display: 'flex', gap: '8px' }}>
            <input aria-label="Option value" className="input" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" />
            <input aria-label="Option unit" className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" />
            <select aria-label="Option source" className="input" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="member">Member-drafted</option>
              <option value="ai">AI-drafted</option>
            </select>
          </div>
          <button type="submit" className="btn btn--ghost btn--sm" disabled={busy}>Draft option</button>
        </form>
      )}
    </section>
  )
}

function EvaluationView({ evaluation }: { evaluation: NonNullable<ChamberBundle['evaluation']> }) {
  const rows = [
    { ok: evaluation.quorum.met, text: `Quorum ${evaluation.quorum.cast}/${evaluation.quorum.totalSeats} (need ${evaluation.quorum.needed})` },
    { ok: evaluation.requiredSeats.met, text: evaluation.requiredSeats.met ? 'Required seats heard' : `Missing: ${evaluation.requiredSeats.missing.join(', ')}` },
    { ok: evaluation.thresholdMet, text: `Threshold ${evaluation.winnerSharePct.toFixed(1)}%` },
  ]
  return (
    <div style={{ padding: '10px 12px', background: evaluation.passes ? 'var(--success-dim)' : 'var(--bg-raised)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
      {rows.map((r) => (
        <div key={r.text} style={{ fontSize: '0.8rem', color: r.ok ? 'var(--success)' : 'var(--danger)' }}>
          {r.ok ? '✓' : '✗'} {r.text}
        </div>
      ))}
      {evaluation.winnerId && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '4px' }}>
          {evaluation.passes ? 'Carries.' : 'Does not carry.'}
        </div>
      )}
      {evaluation.reasons.map((r) => (
        <div key={r} style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>{r}</div>
      ))}
    </div>
  )
}

// ─── Approvals ─────────────────────────────────────────────

function ApprovalsPanel({
  bundle,
  viewerId,
  busy,
  signed,
  positioned,
  onSign,
  onAdvance,
}: {
  bundle: ChamberBundle
  viewerId: string | null
  busy: boolean
  signed: boolean
  positioned: boolean
  onSign: (note: string) => Promise<boolean>
  onAdvance: (body: Record<string, unknown>) => Promise<boolean>
}) {
  const { session, approvals } = bundle
  const [note, setNote] = useState('')
  void positioned

  if (!['ruled', 'approved', 'released'].includes(session.status)) return null

  const remaining = Math.max(2 - new Set(approvals.map((a) => a.approverId)).size, 0)
  const canSign = viewerId !== null && !signed && session.status === 'ruled'
  const canRelease = viewerId !== null && session.status === 'approved'

  return (
    <section className="card" style={{ borderColor: 'var(--border-gold)' }} aria-label="Two-person approval">
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--gold-400)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
        ✍ Two-person rule {remaining > 0 && session.status === 'ruled' ? `· ${remaining} signature${remaining === 1 ? '' : 's'} left` : '· complete'}
      </div>
      {approvals.map((a) => (
        <p key={a._id} style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
          ✓ <strong>{a.approverName}</strong>
          {a.note && <span style={{ color: 'var(--text-secondary)' }}> — &ldquo;{a.note}&rdquo;</span>}
        </p>
      ))}
      {approvals.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>No signatures yet.</p>
      )}
      {canSign && (
        <form
          style={{ display: 'flex', gap: '8px', marginTop: '8px' }}
          onSubmit={async (e) => {
            e.preventDefault()
            const ok = await onSign(note)
            if (ok) setNote('')
          }}
        >
          <input aria-label="Approval note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Approval note (optional)" />
          <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>Sign</button>
        </form>
      )}
      {session.status === 'approved' && (
        <button className="btn btn--primary btn--sm" style={{ marginTop: '8px' }} disabled={busy || !canRelease} onClick={() => onAdvance({ to: 'released' })} title={!canRelease ? 'The chair cannot release' : 'Release as precedent'}>
          Release as precedent
        </button>
      )}
      {session.status === 'ruled' && viewerId !== null && (
        <button className="btn btn--ghost btn--sm" style={{ marginTop: '8px' }} disabled={busy} onClick={() => onAdvance({ to: 'approved' })} title="Moves to approved once two valid signatures exist">
          Advance to approved
        </button>
      )}
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
        Neither the author nor the chair may sign. The server refuses duplicates.
      </p>
    </section>
  )
}
