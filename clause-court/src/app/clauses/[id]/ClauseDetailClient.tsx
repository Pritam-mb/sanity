'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  AmbiguityReport,
  AmbiguitySignal,
  PrecedentWithRelevance,
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
  const [working, setWorking] = useState(false)
  const [gateError, setGateError] = useState<string | null>(null)

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
      if (
        !window.confirm(
          `${label}\n\n${description}\n\nThis is a human approval step. Continue?`
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
          body: JSON.stringify({ clauseId: clause._id, to }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Transition failed')

        setStatus(data.to)
        setTransitions((prev) => prev.filter((t) => t.to !== to))
        router.refresh()
      } catch (e) {
        setGateError(e instanceof Error ? e.message : 'Transition failed')
      } finally {
        setWorking(false)
      }
    },
    [clause._id, router, transitions]
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
              forward from here — the AI cannot resolve or publish a clause.
            </p>
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
