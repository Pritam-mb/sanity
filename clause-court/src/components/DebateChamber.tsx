'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  AmbiguitySignal,
  AdvocateSide,
  PrecedentWithRelevance,
} from '@/types'
import { getSignalTypeLabel } from '@/lib/ambiguity/detector'

// =============================================
// THE DEBATE CHAMBER
// =============================================

/** The clause fields the chamber needs. */
export interface ChamberClause {
  _id: string
  title: string
  text: string
  caseNumber?: string
  status?: string
  category?: string
  ambiguitySignals?: AmbiguitySignal[]
}

/** One advocate's stored position. */
export interface ChamberInterpretation {
  _id?: string
  side: 'A' | 'B'
  title: string
  summary: string
  argument: string
  textualEvidence: string[]
  precedentUsed?: string[]
  citedPrecedent?: Array<{ _id: string; title: string; holding: string }>
}

export interface ChamberRuling {
  _id: string
  judgeName: string
  customRuling?: string | null
  reasoning?: string | null
  dissent?: string | null
  dissentAdvocate?: 'A' | 'B' | null
  clauseRevisionSuggested?: boolean | null
  suggestedRevision?: string | null
  _createdAt?: string
  chosenInterpretation?: { _id: string; title: string; side: 'A' | 'B' } | null
  precedent?: {
    _id: string
    title: string
    holding: string
    applicableTerms?: string[]
    relevanceScore?: number
    citationCount?: number
  } | null
}

/** A debate loaded from Sanity by `DEBATE_BY_CLAUSE_QUERY`. */
export interface ChamberDebate {
  _id: string
  status: string
  startedAt?: string
  completedAt?: string
  interpretationA: ChamberInterpretation
  interpretationB: ChamberInterpretation
  ruling?: ChamberRuling | null
}

type DebatePhase = 'pre' | 'live' | 'debating' | 'judging' | 'ruling' | 'done'

/** The payload the `done` SSE event carries. */
interface CompletedDebate {
  debateId: string
  interpretationA: ChamberInterpretation
  interpretationB: ChamberInterpretation
  citedPrecedent: Array<{ _id: string; title: string; holding: string }>
}

interface Props {
  clause: ChamberClause
  precedents: PrecedentWithRelevance[]
  initialDebate?: ChamberDebate | null
}

export default function DebateChamber({ clause, precedents, initialDebate }: Props) {
  const router = useRouter()
  const signals = clause.ambiguitySignals ?? []

  // A debate that has already been ruled on is a record, not a live hearing.
  // Restoring it means the page opens on the finished case, so a refresh or a
  // shared link does not silently discard the transcript.
  const restored: ChamberDebate | null =
    initialDebate &&
    initialDebate.interpretationA &&
    initialDebate.interpretationB
      ? initialDebate
      : null

  const [phase, setPhase] = useState<DebatePhase>(
    restored ? (restored.ruling ? 'done' : 'debating') : 'pre'
  )
  const [debate, setDebate] = useState<ChamberDebate | null>(restored)
  // Raw text as it arrives, per side, for the live court record.
  const [liveText, setLiveText] = useState<{ A: string; B: string }>({ A: '', B: '' })
  const [speaking, setSpeaking] = useState<'A' | 'B' | null>(null)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // Judge form state
  const [selectedSide, setSelectedSide] = useState<AdvocateSide | null>(null)
  const [customRuling, setCustomRuling] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [judgeName, setJudgeName] = useState('')
  const [submittingRuling, setSubmittingRuling] = useState(false)

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'A' | 'B' | 'judge'>('A')

  // Cancel any in-flight stream if the user leaves mid-hearing.
  useEffect(() => () => abortRef.current?.abort(), [])

  const startDebate = useCallback(async () => {
    setPhase('live')
    setError('')
    setLiveText({ A: '', B: '' })
    setSpeaking('A')
    setDebate(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`/api/debate/stream/${clause._id}`, {
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`The court could not be convened (HTTP ${res.status}).`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Parse the SSE frame stream by hand: EventSource cannot issue the
      // request we want and this route must stay a plain GET.
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Frames are separated by a blank line.
        let split: number
        while ((split = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, split)
          buffer = buffer.slice(split + 2)

          let event = 'message'
          const dataLines: string[] = []
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim()
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
          }
          if (dataLines.length === 0) continue

          let payload: unknown
          try {
            payload = JSON.parse(dataLines.join('\n'))
          } catch {
            continue
          }

          if (event === 'start') {
            const side = (payload as { side: 'A' | 'B' }).side
            setSpeaking(side)
          } else if (event === 'token') {
            const { side, text } = payload as { side: 'A' | 'B'; text: string }
            setLiveText((prev) => ({ ...prev, [side]: prev[side] + text }))
          } else if (event === 'done') {
            const result = payload as CompletedDebate
            setDebate({
              _id: result.debateId,
              status: 'completed',
              interpretationA: result.interpretationA,
              interpretationB: result.interpretationB,
            })
            setPhase('debating')
          } else if (event === 'error') {
            const { message, details } = payload as {
              message: string
              details?: string[]
            }
            throw new Error(
              [message, ...(details ?? [])].filter(Boolean).join(' ')
            )
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'The hearing failed.')
      setPhase('pre')
    } finally {
      setSpeaking(null)
    }
  }, [clause._id])

  const submitRuling = useCallback(async () => {
    if (!judgeName.trim()) {
      setError('Please enter your name as the judge.')
      return
    }
    if (!customRuling.trim() && !selectedSide) {
      setError('Please select an interpretation or write a custom ruling.')
      return
    }
    if (!debate) return

    setSubmittingRuling(true)
    setError('')
    setPhase('ruling')

    try {
      const res = await fetch('/api/ruling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clauseId: clause._id,
          debateId: debate._id,
          selectedSide,
          customRuling: customRuling || undefined,
          reasoning: reasoning || undefined,
          judgeName: judgeName.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create ruling')

      // Re-read the stored case rather than trusting the response shape, so
      // what the judge sees is what was actually persisted.
      setDebate((prev) =>
        prev
          ? {
              ...prev,
              ruling: {
                _id: data.ruling._id,
                judgeName: data.ruling.judgeName,
                customRuling: data.ruling.customRuling ?? null,
                reasoning: data.ruling.reasoning ?? null,
                dissent: data.ruling.dissent ?? null,
                dissentAdvocate: data.ruling.dissentAdvocate ?? null,
                clauseRevisionSuggested:
                  data.ruling.clauseRevisionSuggested ?? false,
                suggestedRevision: data.ruling.suggestedRevision ?? null,
                _createdAt: data.ruling._createdAt,
                chosenInterpretation: data.ruling.chosenInterpretation ?? null,
                precedent: data.precedent ?? null,
              },
            }
          : prev
      )
      setPhase('done')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create ruling')
      setPhase('judging')
    } finally {
      setSubmittingRuling(false)
    }
  }, [clause._id, customRuling, debate, judgeName, reasoning, router, selectedSide])

  const ruling = debate?.ruling ?? null
  const hasRuling = Boolean(ruling)

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ─── Court Header ───────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-default)',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div className="court-case-number">
          {clause.caseNumber} · THE DEBATE CHAMBER
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>
          {clause.title}
        </h2>
        <p
          style={{
            fontStyle: 'italic',
            color: 'var(--text-secondary)',
            maxWidth: '700px',
            margin: '0 auto',
            fontSize: '1rem',
          }}
        >
          &ldquo;{clause.text}&rdquo;
        </p>

        {signals.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px',
              flexWrap: 'wrap',
            }}
          >
            {signals.map((s, i) => (
              <span
                key={i}
                style={{
                  padding: '3px 10px',
                  borderRadius: '100px',
                  background: 'var(--danger-dim)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  fontSize: '0.72rem',
                  color: 'var(--danger)',
                  fontWeight: '600',
                }}
              >
                ⚠ {getSignalTypeLabel(s.type)}: &ldquo;{s.term}&rdquo;
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ─── Recorded banner ────────────────────────── */}
      {hasRuling && (
        <div
          style={{
            background: 'var(--success-dim)',
            borderBottom: '1px solid rgba(16,185,129,0.3)',
            padding: '10px 24px',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--success)',
          }}
        >
          This case has been heard and ruled on. The transcript below is the
          record of the decision.
        </div>
      )}

      {/* ─── Relevant Precedents Banner ─────────────── */}
      {precedents.length > 0 && (
        <div
          style={{
            background:
              'linear-gradient(135deg, var(--bg-card), rgba(201,168,76,0.04))',
            borderBottom: '1px solid var(--border-gold)',
            padding: '16px 24px',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--gold-400)',
                letterSpacing: '0.12em',
                marginBottom: '10px',
                textTransform: 'uppercase',
              }}
            >
              📚 Related Precedent Found
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {precedents.map(
                ({ precedent, relevanceLabel, relevanceScore, matchedTerms }) => (
                  <Link
                    key={precedent._id}
                    href={`/precedents/${precedent._id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        padding: '10px 16px',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-gold)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 220ms ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {precedent.title}
                        </span>
                        <span className={`badge badge--${relevanceLabel.toLowerCase()}`}>
                          {relevanceLabel} {relevanceScore}%
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '4px',
                        }}
                      >
                        Holding: {precedent.holding}
                      </div>
                      {matchedTerms.length > 0 && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--gold-400)' }}>
                          term match: &ldquo;{matchedTerms.join('", "')}&rdquo;
                        </div>
                      )}
                    </div>
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Pre-Debate State ────────────────────────── */}
      {phase === 'pre' && (
        <div
          style={{
            maxWidth: '700px',
            margin: '80px auto',
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '24px' }}>⚔</div>
          <h3 style={{ marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
            The Court Is Ready
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Two AI advocates will present opposing interpretations of the
            ambiguous clause. You will then act as judge and issue a binding
            ruling.
          </p>
          {error && (
            <div
              style={{
                background: 'var(--danger-dim)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '24px',
              }}
              role="alert"
            >
              <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>⚠ {error}</p>
            </div>
          )}
          <button
            id="start-debate-btn"
            className="btn btn--primary btn--lg"
            onClick={startDebate}
          >
            ⚔ Begin Debate
          </button>
        </div>
      )}

      {/* ─── Live hearing ────────────────────────────── */}
      {phase === 'live' && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px',
            }}
            className="debate-grid"
          >
            <LiveTranscript side="A" text={liveText.A} speaking={speaking === 'A'} waiting={speaking === 'B'} />
            <LiveTranscript side="B" text={liveText.B} speaking={speaking === 'B'} waiting={speaking === 'A'} />
          </div>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
            }}
          >
            The advocates are speaking. The transcript is written to the record
            as it is produced.
          </p>
        </div>
      )}

      {/* ─── Debate View ─────────────────────────────── */}
      {(phase === 'debating' || phase === 'judging') && debate && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
          <div className="mobile-tabs">
            <button
              className={`mobile-tab ${mobileTab === 'A' ? 'mobile-tab--active-a' : ''}`}
              onClick={() => setMobileTab('A')}
            >
              🔵 Advocate A
            </button>
            <button
              className={`mobile-tab ${mobileTab === 'B' ? 'mobile-tab--active-b' : ''}`}
              onClick={() => setMobileTab('B')}
            >
              🟡 Advocate B
            </button>
            <button
              className={`mobile-tab ${mobileTab === 'judge' ? 'mobile-tab--active-judge' : ''}`}
              onClick={() => setMobileTab('judge')}
            >
              ⚖ Judge
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px',
            }}
            className="debate-grid"
          >
            <AdvocatePanel
              side="A"
              interpretation={debate.interpretationA}
              visible={mobileTab === 'A'}
            />
            <AdvocatePanel
              side="B"
              interpretation={debate.interpretationB}
              visible={mobileTab === 'B'}
            />
          </div>

          {error && (
            <div
              style={{
                background: 'var(--danger-dim)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
              }}
              role="alert"
            >
              <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>⚠ {error}</p>
            </div>
          )}

          {/* ─── Judge panel ─────────────────────────── */}
          <div
            className={mobileTab !== 'judge' ? 'mobile-hidden-judge' : ''}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-gold)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
              maxWidth: '700px',
              margin: '0 auto',
              boxShadow: 'var(--shadow-gold)',
            }}
          >
            {phase === 'debating' ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚖</div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    marginBottom: '4px',
                  }}
                >
                  Both Advocates Have Argued
                </h3>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    marginBottom: '20px',
                  }}
                >
                  Read both arguments, then rule. Your ruling becomes structured
                  precedent.
                </p>
                <button
                  id="issue-ruling-btn"
                  className="btn btn--primary btn--lg"
                  onClick={() => {
                    setPhase('judging')
                    setError('')
                  }}
                  style={{ animation: 'pulse-gold 2s infinite' }}
                >
                  ⚖ Issue Ruling
                </button>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚖</div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-heading)',
                      marginBottom: '4px',
                    }}
                  >
                    The Court Is In Session
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Your ruling is final and becomes structured precedent.
                  </p>
                </div>

                {error && (
                  <div
                    style={{
                      background: 'var(--danger-dim)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '16px',
                    }}
                    role="alert"
                  >
                    <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                      ⚠ {error}
                    </p>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    id="adopt-interpretation-a"
                    className={`btn btn--full ${selectedSide === 'A' ? 'btn--advocate-a' : 'btn--ghost'}`}
                    onClick={() => {
                      setSelectedSide('A')
                      setCustomRuling('')
                    }}
                    style={{ flex: 1 }}
                  >
                    🔵 Adopt Interpretation A
                  </button>
                  <button
                    id="adopt-interpretation-b"
                    className={`btn btn--full ${selectedSide === 'B' ? 'btn--advocate-b' : 'btn--ghost'}`}
                    onClick={() => {
                      setSelectedSide('B')
                      setCustomRuling('')
                    }}
                    style={{ flex: 1 }}
                  >
                    🟡 Adopt Interpretation B
                  </button>
                </div>

                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    marginBottom: '16px',
                  }}
                >
                  — or —
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="input-label" htmlFor="custom-ruling-input">
                    Write Custom Ruling
                  </label>
                  <textarea
                    className="textarea"
                    id="custom-ruling-input"
                    placeholder='e.g., "For this policy, reasonable time means 30 calendar days."'
                    value={customRuling}
                    onChange={(e) => {
                      setCustomRuling(e.target.value)
                      setSelectedSide(null)
                    }}
                    rows={3}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="input-label" htmlFor="ruling-reasoning">
                    Reasoning (Optional)
                  </label>
                  <textarea
                    className="textarea"
                    id="ruling-reasoning"
                    placeholder="Why did you make this ruling? Any implementation notes?"
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    rows={2}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label className="input-label" htmlFor="judge-name-input">
                    Judge Name *
                  </label>
                  <input
                    className="input"
                    id="judge-name-input"
                    placeholder="Your name"
                    value={judgeName}
                    onChange={(e) => setJudgeName(e.target.value)}
                  />
                </div>

                <button
                  id="submit-ruling-btn"
                  className="btn btn--primary btn--lg btn--full"
                  onClick={submitRuling}
                  disabled={submittingRuling}
                >
                  {submittingRuling ? '⟳ Recording Ruling...' : '🔨 Judge the Case'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Ruling Loading ──────────────────────────── */}
      {phase === 'ruling' && (
        <div
          style={{
            maxWidth: '500px',
            margin: '80px auto',
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          <div
            style={{ fontSize: '3rem', marginBottom: '16px', animation: 'gavel-drop 0.6s ease' }}
          >
            🔨
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>
            Ruling Being Recorded...
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Creating ruling + precedent in Sanity. Generating dissent from the
            losing advocate...
          </p>
        </div>
      )}

      {/* ─── Done: Ruling Recorded ───────────────────── */}
      {phase === 'done' && ruling && (
        <div style={{ maxWidth: '700px', margin: '60px auto', padding: '0 24px' }}>
          <div
            className="card"
            style={{
              border: '1px solid var(--success)',
              background: 'var(--success-dim)',
              textAlign: 'center',
              marginBottom: '20px',
              animation: 'scale-in 0.35s ease',
            }}
          >
            <div
              style={{
                fontSize: '2.5rem',
                marginBottom: '12px',
                animation: 'gavel-drop 0.6s ease',
              }}
            >
              🔨
            </div>
            <h3
              style={{
                color: 'var(--success)',
                fontFamily: 'var(--font-heading)',
                marginBottom: '8px',
              }}
            >
              Ruling Recorded
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              This ruling is now structured precedent.
            </p>
            <div
              style={{
                background: 'var(--bg-raised)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '16px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: 'var(--gold-400)',
                  marginBottom: '8px',
                  letterSpacing: '0.08em',
                }}
              >
                HOLDING
              </div>
              <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                {ruling.customRuling ||
                  ruling.precedent?.holding ||
                  ruling.chosenInterpretation?.title}
              </p>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginTop: '8px',
                }}
              >
                Judge: {ruling.judgeName}
                {ruling._createdAt &&
                  ` · ${new Date(ruling._createdAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>

          {ruling.dissent && (
            <div
              className="card"
              style={{
                borderColor: 'var(--border-default)',
                background: 'var(--bg-card)',
                marginBottom: '20px',
                animation: 'fadeIn 0.5s ease 0.3s both',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                ⚡ Dissent — Advocate {ruling.dissentAdvocate} · Generated
                Opinion, Not a Legal Finding
              </div>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                  lineHeight: '1.7',
                }}
              >
                &ldquo;{ruling.dissent}&rdquo;
              </p>
              {ruling.clauseRevisionSuggested && ruling.suggestedRevision && (
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      marginBottom: '6px',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    SUGGESTED REVISION
                  </div>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--gold-300)',
                      fontStyle: 'italic',
                    }}
                  >
                    &ldquo;{ruling.suggestedRevision}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}

          {/*
            The ruling is recorded but the clause is not yet in force. Only a
            person can complete the workflow, and those controls live on the
            clause page where the rest of the case is visible.
          */}
          <div
            style={{
              background: 'var(--gold-glow)',
              border: '1px solid var(--border-gold)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 18px',
              marginBottom: '20px',
            }}
          >
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginBottom: '10px',
              }}
            >
              The precedent exists. Resolving and publishing the clause is a
              human decision and has not been made.
            </p>
            <Link href={`/clauses/${clause._id}`} className="btn btn--primary">
              ⚖ Complete the workflow
            </Link>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {ruling.precedent?._id && (
              <Link
                href={`/precedents/${ruling.precedent._id}`}
                className="btn btn--primary"
              >
                📚 View Precedent
              </Link>
            )}
            <Link href={`/clauses/${clause._id}`} className="btn btn--ghost">
              ← Back to Clause
            </Link>
            <Link href="/graph" className="btn btn--ghost">
              🕸 View Graph
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

const SIDES = {
  A: {
    label: 'ADVOCATE A — Customer-Friendly',
    color: 'var(--advocate-a)',
    light: 'var(--advocate-a-light)',
    dim: 'var(--advocate-a-dim)',
    border: 'var(--advocate-a-border)',
    shadow: 'var(--shadow-a)',
    enter: 'slideInLeft',
    icon: '🔵',
  },
  B: {
    label: 'ADVOCATE B — Operations-Focused',
    color: 'var(--advocate-b)',
    light: 'var(--advocate-b-light)',
    dim: 'var(--advocate-b-dim)',
    border: 'var(--advocate-b-border)',
    shadow: 'var(--shadow-b)',
    enter: 'slideInRight',
    icon: '🟡',
  },
} as const

/**
 * The live court record.
 *
 * The model is emitting JSON, so the raw stream is shown as a transcript
 * rather than pretending to be prose — it is replaced by the formatted
 * argument as soon as the hearing finishes and the content is parsed.
 */
function LiveTranscript({
  side,
  text,
  speaking,
  waiting,
}: {
  side: 'A' | 'B'
  text: string
  speaking: boolean
  waiting: boolean
}) {
  const theme = SIDES[side]

  return (
    <div
      className={`advocate-${side.toLowerCase()}-panel`}
      aria-live="polite"
      aria-busy={speaking}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${theme.border}`,
        borderLeft: `4px solid ${theme.color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: theme.shadow,
        minHeight: '260px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: theme.color,
          fontWeight: '600',
          letterSpacing: '0.1em',
          marginBottom: '12px',
        }}
      >
        {theme.icon} {theme.label}
      </div>

      {waiting && !text ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          Waiting for the other advocate to finish...
        </p>
      ) : text ? (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            lineHeight: '1.7',
            color: 'var(--text-secondary)',
            margin: 0,
          }}
        >
          {text}
          {speaking && (
              <span
                style={{
                  display: 'inline-block',
                  width: '7px',
                  marginLeft: '2px',
                  background: theme.color,
                  animation: 'typewriter-cursor 1s step-end infinite',
                }}
              >

              &nbsp;
            </span>
          )}
        </pre>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Preparing the argument...
        </p>
      )}
    </div>
  )
}

function AdvocatePanel({
  side,
  interpretation,
  visible,
}: {
  side: 'A' | 'B'
  interpretation: ChamberInterpretation
  visible: boolean
}) {
  const theme = SIDES[side]
  const evidence = interpretation.textualEvidence ?? []
  const cites = (interpretation.precedentUsed ?? []).filter(Boolean)

  return (
    <div
      className={`advocate-${side.toLowerCase()}-panel`}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${theme.border}`,
        borderLeft: `4px solid ${theme.color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: theme.shadow,
        animation: `${theme.enter} 0.4s ease`,
      }}
      data-mobile-visible={visible}
    >
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: theme.color,
            fontWeight: '600',
            letterSpacing: '0.1em',
            marginBottom: '8px',
          }}
        >
          {theme.icon} {theme.label}
        </div>
        <h4 style={{ color: theme.light, fontFamily: 'var(--font-heading)' }}>
          {interpretation.title}
        </h4>
        {interpretation.summary && (
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginTop: '6px',
              fontStyle: 'italic',
            }}
          >
            {interpretation.summary}
          </p>
        )}
      </div>

      <div
        style={{
          fontSize: '0.875rem',
          lineHeight: '1.8',
          color: 'var(--text-secondary)',
          marginBottom: '16px',
        }}
      >
        {interpretation.argument}
      </div>

      {evidence.length > 0 && (
        <div
          style={{
            background: theme.dim,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              color: theme.color,
              marginBottom: '8px',
              letterSpacing: '0.08em',
            }}
          >
            TEXTUAL EVIDENCE — VERIFIED AGAINST THE CLAUSE
          </div>
          {evidence.map((ev, i) => (
            <p
              key={i}
              style={{
                fontSize: '0.82rem',
                color: theme.light,
                fontStyle: 'italic',
                marginBottom: '4px',
              }}
            >
              &ldquo;{ev}&rdquo;
            </p>
          ))}
        </div>
      )}

      {cites.length > 0 && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            background: 'var(--bg-raised)',
            borderRadius: '6px',
            padding: '8px 12px',
          }}
        >
          <span style={{ color: 'var(--gold-400)' }}>⚖ Cites: </span>
          {cites.join(', ')}
        </div>
      )}
    </div>
  )
}
