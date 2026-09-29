'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  AmbiguityReport,
  AmbiguitySignal,
  PrecedentWithRelevance,
  WorkflowTransitionLogEntry,
} from '@/types'
import {
  getSignalTypeLabel,
  getSignalTypeColor,
  highlightAmbiguousTerms,
} from '@/lib/ambiguity/detector'
import {
  WORKFLOW_STATES,
  WORKFLOW_STATE_META,
  stateIndex,
  type WorkflowState,
} from '@/sanity/workflow'

// =============================================
// CLAUSE DETAIL
// =============================================

export interface ClauseDetailData {
  _id: string
  _createdAt?: string
  title: string
  text: string
  category: string
  caseNumber: string
  status: string
  ambiguitySignals?: AmbiguitySignal[]
  transitionLog?: WorkflowTransitionLogEntry[]
  definitions?: Array<{ _id: string; term: string; definition: string }>
  citedPrecedent?: Array<{
    _id: string
    title: string
    holding: string
    applicableTerms?: string[]
    citationCount?: number
  }>
  debates?: Array<{
    _id: string
    status: string
    interpretationA?: { _id: string; title: string; summary: string } | null
    interpretationB?: { _id: string; title: string; summary: string } | null
  }>
  currentRuling?: {
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
  } | null
}

interface Props {
  clause: ClauseDetailData
  ambiguityReport: AmbiguityReport
  relevantPrecedent: PrecedentWithRelevance[]
}

export default function ClauseDetailClient({
  clause,
  ambiguityReport,
  relevantPrecedent,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<WorkflowState>(
    isWorkflow(clause.status) ? clause.status : 'draft'
  )
  const [transitions, setTransitions] = useState<
    Array<{ to: string; label: string; description: string }>
  >([])
  const [transitionLog, setTransitionLog] = useState<WorkflowTransitionLogEntry[]>(
    clause.transitionLog ?? []
  )
  const [working, setWorking] = useState(false)
  const [gateError, setGateError] = useState<string | null>(null)
  const [reviewerName, setReviewerName] = useState('Human Reviewer')
  const [reviewerNote, setReviewerNote] = useState('')

  const hasRuling = Boolean(clause.currentRuling)
  const signals = ambiguityReport.signals
  const highlighted = signals.length > 0
    ? highlightAmbiguousTerms(clause.text, signals)
    : null

  // The set of legal next steps comes from the server, which shares the state
  // machine with Studio. The button row is therefore never able to offer a
  // move the backend would reject.
  useEffect(() => {
    let cancelled = false
    fetch(`/api/workflow?clauseId=${encodeURIComponent(clause._id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setTransitions(data.transitions ?? [])
        if (isWorkflow(data.status)) setStatus(data.status)
        if (Array.isArray(data.transitionLog) && data.transitionLog.length > 0) {
          setTransitionLog(data.transitionLog)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [clause._id])

  const runTransition = useCallback(
    async (to: string, label: string) => {
      const description =
        transitions.find((t) => t.to === to)?.description ?? label
      const actor = reviewerName.trim() || 'Human Reviewer'
      const note = reviewerNote.trim() || undefined

      if (
        !window.confirm(
          `${label}\n\n${description}\n\nReviewer: ${actor}\nThis is a human approval step. Continue?`
        )
      ) {
        return
      }

      setWorking(true)
      setGateError(null)
      try {
        const res = await fetch('/api/workflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clauseId: clause._id, to, actor, note }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Transition failed')

        setStatus(data.to)
        if (data.entry) {
          setTransitionLog((prev) => [...prev, data.entry])
        }
        setTransitions((prev) => prev.filter((t) => t.to !== to))
        setReviewerNote('')
        router.refresh()
      } catch (e) {
        setGateError(e instanceof Error ? e.message : 'Transition failed')
      } finally {
        setWorking(false)
      }
    },
    [clause._id, router, transitions, reviewerName, reviewerNote]
  )

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container container--narrow">
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}
        >
          <Link href="/clauses" style={{ color: 'var(--text-muted)' }}>
            Clauses
          </Link>
          <span aria-hidden="true">›</span>
          <span style={{ color: 'var(--text-secondary)' }}>{clause.title}</span>
        </nav>

        <WorkflowStepper currentStatus={status} />

        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            flexWrap: 'wrap',
            margin: '24px 0 32px',
          }}
        >
          <div>
            <div className="court-case-number">
              {clause.caseNumber} · {clause.category}
            </div>
            <h1 style={{ marginBottom: '8px' }}>{clause.title}</h1>
          </div>
          <StatusChip status={status} />
        </header>

        {/* ─── Clause text with highlighted signals ─────── */}
        <section className="card card--gold" style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--gold-400)',
              marginBottom: '12px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Clause Text
          </div>
          {highlighted ? (
            <p
              style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'var(--text-primary)',
                fontStyle: 'italic',
              }}
              dangerouslySetInnerHTML={{ __html: `"${highlighted}"` }}
            />
          ) : (
            <p
              style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: 'var(--text-primary)',
                fontStyle: 'italic',
              }}
            >
              &ldquo;{clause.text}&rdquo;
            </p>
          )}
        </section>

        {/* ─── Ambiguity report ────────────────────────── */}
        <section style={{ marginBottom: '24px' }}>
          {ambiguityReport.flagged ? (
            <div
              className="card"
              style={{
                borderColor: 'var(--danger)',
                background: 'rgba(239,68,68,0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                }}
              >
                <span style={{ fontSize: '1.4rem' }} aria-hidden="true">
                  ⚠
                </span>
                <div>
                  <h4 style={{ color: 'var(--danger)', marginBottom: '2px' }}>
                    Ambiguity Detected — {signals.length} signal
                    {signals.length === 1 ? '' : 's'}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Produced by deterministic rules, not by an LLM. Each signal
                    names the rule that fired and where in the text it matched.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {signals.map((signal, i) => (
                  <SignalCard key={`${signal.type}-${signal.term}-${i}`} signal={signal} />
                ))}
              </div>
            </div>
          ) : (
            <div
              className="card"
              style={{ borderColor: 'var(--success)', background: 'var(--success-dim)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }} aria-hidden="true">
                  ✓
                </span>
                <div>
                  <h4 style={{ color: 'var(--success)' }}>No Ambiguity Detected</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    No deterministic ambiguity signal was found. This clause can
                    still be submitted for debate manually.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ─── Linked definitions ───────────────────────── */}
        {(clause.definitions ?? []).length > 0 && (
          <section className="card" style={{ marginBottom: '24px' }}>
            <SectionLabel>Linked definitions</SectionLabel>
            <p style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
              These satisfy the Missing Definition rule, which is why the terms
              above were not flagged.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {clause.definitions!.map((def) => (
                <div
                  key={def._id}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-raised)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <code style={{ color: 'var(--gold-300)' }}>{def.term}</code>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    {def.definition}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Related precedent ───────────────────────── */}
        {relevantPrecedent.length > 0 && (
          <section className="card card--gold" style={{ marginBottom: '24px' }}>
            <SectionLabel>
              ⚖ Relevant precedent — this debate cites {relevantPrecedent.length}{' '}
              prior ruling{relevantPrecedent.length === 1 ? '' : 's'}
            </SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {relevantPrecedent.map(({ precedent, relevanceLabel, relevanceScore, matchedTerms }) => (
                <Link
                  key={precedent._id}
                  href={`/precedents/${precedent._id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'var(--bg-raised)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {precedent.title}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {precedent.holding}
                      </div>
                      {matchedTerms.length > 0 && (
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--gold-400)',
                            marginTop: '6px',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          term match: &ldquo;{matchedTerms.join('&quot;, &quot;')}&rdquo;
                        </div>
                      )}
                    </div>
                    <span
                      className={`badge badge--${relevanceLabel.toLowerCase()}`}
                      style={{ flexShrink: 0 }}
                    >
                      {relevanceLabel} {relevanceScore}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Recorded ruling ──────────────────────────── */}
        {hasRuling && clause.currentRuling && (
          <section
            className="card"
            style={{
              borderColor: 'var(--border-gold)',
              background: 'var(--gold-glow)',
              marginBottom: '24px',
            }}
          >
            <SectionLabel>🔨 Human ruling recorded</SectionLabel>
            <p
              style={{
                color: 'var(--text-primary)',
                fontSize: '1rem',
                marginBottom: '8px',
              }}
            >
              {clause.currentRuling.customRuling ||
                clause.currentRuling.chosenInterpretation?.title ||
                'Ruling issued'}
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Judge: {clause.currentRuling.judgeName}
              {clause.currentRuling._createdAt &&
                ` · ${new Date(clause.currentRuling._createdAt).toLocaleDateString()}`}
            </p>

            {clause.currentRuling.reasoning && (
              <p style={{ fontSize: '0.88rem', marginTop: '12px' }}>
                {clause.currentRuling.reasoning}
              </p>
            )}

            {clause.currentRuling.dissent && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    marginBottom: '6px',
                    letterSpacing: '0.08em',
                  }}
                >
                  DISSENT — ADVOCATE {clause.currentRuling.dissentAdvocate} · GENERATED OPINION
                </div>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;{clause.currentRuling.dissent}&rdquo;
                </p>
                {clause.currentRuling.clauseRevisionSuggested &&
                  clause.currentRuling.suggestedRevision && (
                    <p
                      style={{
                        marginTop: '10px',
                        fontSize: '0.82rem',
                        color: 'var(--gold-300)',
                        fontStyle: 'italic',
                      }}
                    >
                      Suggested revision: &ldquo;
                      {clause.currentRuling.suggestedRevision}&rdquo;
                    </p>
                  )}
              </div>
            )}
          </section>
        )}

        {/* ─── Human approval gate ──────────────────────── */}
        {transitions.length > 0 && (
          <section
            className="card"
            style={{
              borderColor: 'var(--border-gold)',
              marginBottom: '24px',
            }}
          >
            <SectionLabel>Human approval gate</SectionLabel>
            <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
              This clause is <strong>{status}</strong>. Only a person can move it
              forward from here — the AI cannot resolve or publish a clause. Every approval
              is recorded in the institutional audit log below.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
                marginBottom: '16px',
                padding: '12px',
                background: 'var(--bg-raised)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <label
                  htmlFor="reviewer-name-input"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--gold-300)',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Reviewer Name / Identity
                </label>
                <input
                  id="reviewer-name-input"
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Legal Counsel, Reviewer Name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="reviewer-note-input"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--gold-300)',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Approval Note / Rationale (Optional)
                </label>
                <input
                  id="reviewer-note-input"
                  type="text"
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="e.g. Confirmed precedent holding applies"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            {gateError && (
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
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                  ⚠ {gateError}
                </p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {transitions.map((transition) => (
                <button
                  key={transition.to}
                  className="btn btn--primary"
                  disabled={working}
                  onClick={() => runTransition(transition.to, transition.label)}
                  title={transition.description}
                >
                  {working ? '⟳ Working...' : transition.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ─── Workflow Transition Audit Log ─────────────── */}
        <WorkflowAuditTrail log={transitionLog} />

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            href={`/debate/${clause._id}`}
            id="enter-debate-btn"
            className={`btn btn--lg ${hasRuling ? 'btn--ghost' : 'btn--primary'}`}
          >
            {hasRuling ? '⚔ Reopen Debate' : '⚔ Enter Debate Chamber'}
          </Link>
          <Link href="/clauses" className="btn btn--ghost">
            ← Back to Clauses
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function isWorkflow(value: unknown): value is WorkflowState {
  return (
    typeof value === 'string' &&
    (WORKFLOW_STATES as readonly string[]).includes(value)
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: '12px',
      }}
    >
      {children}
    </div>
  )
}

function WorkflowStepper({ currentStatus }: { currentStatus: WorkflowState }) {
  const currentIdx = stateIndex(currentStatus)

  return (
    <div
      className="workflow-steps"
      role="list"
      aria-label="Clause workflow state"
    >
      {WORKFLOW_STATES.map((step, i) => (
        <div key={step} className="workflow-step" role="listitem">
          <div
            className={`workflow-step__label ${
              i < currentIdx
                ? 'workflow-step__label--done'
                : i === currentIdx
                  ? 'workflow-step__label--active'
                  : ''
            }`}
            title={WORKFLOW_STATE_META[step].description}
            aria-current={i === currentIdx ? 'step' : undefined}
          >
            {i < currentIdx ? '✓ ' : ''}
            {WORKFLOW_STATE_META[step].label}
          </div>
          {i < WORKFLOW_STATES.length - 1 && (
            <div className="workflow-step__arrow" aria-hidden="true">
              →
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function StatusChip({ status }: { status: WorkflowState }) {
  const meta = WORKFLOW_STATE_META[status]
  const isDanger = status === 'flagged'
  const isSuccess = status === 'resolved' || status === 'published'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: '100px',
        background: isDanger
          ? 'var(--danger-dim)'
          : isSuccess
            ? 'var(--success-dim)'
            : 'var(--bg-raised)',
        border: `1px solid ${
          isDanger
            ? 'rgba(239,68,68,0.3)'
            : isSuccess
              ? 'rgba(16,185,129,0.3)'
              : 'var(--border-default)'
        }`,
      }}
    >
      <span aria-hidden="true">{meta.icon}</span>
      <span
        style={{
          fontWeight: '700',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontSize: '0.8rem',
          color: isDanger
            ? 'var(--danger)'
            : isSuccess
              ? 'var(--success)'
              : 'var(--text-secondary)',
        }}
      >
        {status}
      </span>
    </div>
  )
}

function SignalCard({ signal }: { signal: AmbiguitySignal }) {
  const color = getSignalTypeColor(signal.type)
  return (
    <div
      style={{
        padding: '12px 16px',
        background: 'var(--bg-raised)',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <code style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: '600' }}>
          &ldquo;{signal.term}&rdquo;
        </code>
        <span
          style={{
            fontSize: '0.7rem',
            padding: '2px 8px',
            borderRadius: '100px',
            background: `${color}18`,
            color,
            border: `1px solid ${color}30`,
            fontWeight: '600',
          }}
        >
          {getSignalTypeLabel(signal.type)} · offset {signal.position}
        </span>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        {signal.message}
      </p>
    </div>
  )
}

function WorkflowAuditTrail({ log }: { log: WorkflowTransitionLogEntry[] }) {
  const sortedLog = [...log].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime() || 0
    const timeB = new Date(b.timestamp).getTime() || 0
    return timeB - timeA // Most recent transition at top
  })

  return (
    <section
      className="card"
      style={{
        borderColor: 'var(--border-default)',
        background: 'var(--bg-panel)',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        <div>
          <SectionLabel>📜 Institutional Audit Trail</SectionLabel>
          <h3 style={{ fontSize: '1.05rem', margin: '2px 0 4px', color: 'var(--text-primary)' }}>
            Workflow Transition Log
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Immutable audit record of institutional lifecycle changes, engine flags, and human approvals.
          </p>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '100px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--gold-400)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {log.length} recorded transition{log.length === 1 ? '' : 's'}
        </span>
      </div>

      {sortedLog.length === 0 ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            background: 'var(--bg-card)',
            borderRadius: '8px',
            border: '1px dashed var(--border-subtle)',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          No transitions logged yet for this clause. State changes will appear here automatically.
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            paddingLeft: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Vertical timeline spine */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              left: '9px',
              width: '2px',
              background: 'linear-gradient(to bottom, var(--gold-400), var(--border-subtle))',
            }}
          />

          {sortedLog.map((entry, idx) => {
            const actorType =
              entry.actorType ??
              (entry.actor?.toLowerCase().includes('engine')
                ? 'deterministic'
                : entry.actor?.toLowerCase().includes('chamber') || entry.actor?.toLowerCase().includes('ai')
                  ? 'system'
                  : 'human')

            const actorIcon =
              actorType === 'human' ? '👤' : actorType === 'deterministic' ? '⚙️' : '🤖'
            const actorBadgeColor =
              actorType === 'human'
                ? 'var(--gold-400)'
                : actorType === 'deterministic'
                  ? 'var(--danger)'
                  : 'var(--advocate-a)'
            const actorBadgeBg =
              actorType === 'human'
                ? 'var(--gold-glow)'
                : actorType === 'deterministic'
                  ? 'var(--danger-dim)'
                  : 'var(--advocate-a-dim)'

            const toState = entry.to as WorkflowState
            const stateMeta = WORKFLOW_STATE_META[toState]

            return (
              <div
                key={entry._key ?? `log-${idx}`}
                style={{
                  position: 'relative',
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  padding: '14px 16px',
                }}
              >
                {/* Timeline node dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-20px',
                    top: '18px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background:
                      toState === 'flagged'
                        ? 'var(--danger)'
                        : toState === 'ruled'
                          ? 'var(--gold-400)'
                          : toState === 'resolved' || toState === 'published'
                            ? 'var(--success)'
                            : 'var(--advocate-a)',
                    border: '2px solid var(--bg-panel)',
                    boxShadow: '0 0 6px rgba(0,0,0,0.6)',
                  }}
                />

                {/* Header row: Transition + Timestamp */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'var(--bg-raised)',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {entry.from}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background:
                          toState === 'flagged'
                            ? 'var(--danger-dim)'
                            : toState === 'ruled'
                              ? 'var(--gold-glow)'
                              : toState === 'resolved' || toState === 'published'
                                ? 'var(--success-dim)'
                                : 'var(--bg-raised)',
                        color:
                          toState === 'flagged'
                            ? 'var(--danger)'
                            : toState === 'ruled'
                              ? 'var(--gold-300)'
                              : toState === 'resolved' || toState === 'published'
                                ? 'var(--success)'
                                : 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {stateMeta?.icon ? `${stateMeta.icon} ` : ''}
                      {stateMeta?.label ?? entry.to}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                    suppressHydrationWarning
                  >
                    {entry.timestamp
                      ? new Date(entry.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Unknown date'}
                  </span>
                </div>

                {/* Actor row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    marginBottom: entry.note ? '8px' : '0',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.9rem' }}>{actorIcon}</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    {entry.actor}
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: actorBadgeBg,
                      color: actorBadgeColor,
                      border: `1px solid ${actorBadgeColor}40`,
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {actorType === 'human'
                      ? 'Human Authority'
                      : actorType === 'deterministic'
                        ? 'Deterministic Engine'
                        : 'AI Pipeline'}
                  </span>
                </div>

                {/* Note / Rationale */}
                {entry.note && (
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5',
                      padding: '8px 12px',
                      background: 'var(--bg-raised)',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--gold-400)',
                      fontStyle: 'italic',
                    }}
                  >
                    &ldquo;{entry.note}&rdquo;
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
