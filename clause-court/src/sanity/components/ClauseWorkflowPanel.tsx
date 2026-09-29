'use client'

import React from 'react'
import {
  WORKFLOW_STATES,
  WORKFLOW_STATE_META,
  stateIndex,
  type WorkflowState,
  isWorkflowState,
} from '../workflow'
import type { WorkflowTransitionLogEntry } from '@/types'

interface DocumentViewProps {
  documentId: string
  document: {
    displayed: Record<string, unknown>
    draft: Record<string, unknown> | null
    published: Record<string, unknown> | null
  }
}

export function ClauseWorkflowPanel({ document }: DocumentViewProps) {
  const displayed = document.displayed
  const rawStatus = (displayed?.status as string) || 'draft'
  const currentStatus: WorkflowState = isWorkflowState(rawStatus) ? rawStatus : 'draft'
  const currentIdx = stateIndex(currentStatus)
  const meta = WORKFLOW_STATE_META[currentStatus]

  const log = ((displayed?.transitionLog as WorkflowTransitionLogEntry[] | undefined) ?? []).slice().reverse()

  return (
    <div
      style={{
        padding: '28px',
        background: '#0d0f14',
        color: '#e8eaf0',
        minHeight: '100%',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#c9a84c',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              App SDK Workflow & Governance Panel (PRD §16, §36)
            </div>
            <h2 style={{ fontSize: '1.25rem', marginTop: '4px', color: '#e8eaf0' }}>
              State: {meta.label} {meta.icon}
            </h2>
          </div>

          <div
            style={{
              padding: '8px 16px',
              borderRadius: '100px',
              background:
                currentStatus === 'flagged'
                  ? 'rgba(239,68,68,0.15)'
                  : currentStatus === 'resolved' || currentStatus === 'published'
                    ? 'rgba(16,185,129,0.15)'
                    : 'rgba(201,168,76,0.15)',
              border: `1px solid ${
                currentStatus === 'flagged'
                  ? 'rgba(239,68,68,0.3)'
                  : currentStatus === 'resolved' || currentStatus === 'published'
                    ? 'rgba(16,185,129,0.3)'
                    : 'rgba(201,168,76,0.3)'
              }`,
              color:
                currentStatus === 'flagged'
                  ? '#ef4444'
                  : currentStatus === 'resolved' || currentStatus === 'published'
                    ? '#10b981'
                    : '#c9a84c',
              fontSize: '0.85rem',
              fontWeight: '700',
              textTransform: 'uppercase',
            }}
          >
            {currentStatus}
          </div>
        </div>

        {/* Stepper */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '16px',
            background: '#131720',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '24px',
          }}
        >
          {WORKFLOW_STATES.map((step, i) => (
            <div
              key={step}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  background:
                    i < currentIdx
                      ? 'rgba(16,185,129,0.15)'
                      : i === currentIdx
                        ? 'rgba(201,168,76,0.2)'
                        : '#1e2333',
                  color:
                    i < currentIdx
                      ? '#10b981'
                      : i === currentIdx
                        ? '#c9a84c'
                        : '#5a6080',
                  border: `1px solid ${
                    i < currentIdx
                      ? 'rgba(16,185,129,0.3)'
                      : i === currentIdx
                        ? 'rgba(201,168,76,0.4)'
                        : 'rgba(255,255,255,0.06)'
                  }`,
                }}
              >
                {i < currentIdx ? '✓ ' : ''}
                {WORKFLOW_STATE_META[step].label}
              </div>
              {i < WORKFLOW_STATES.length - 1 && (
                <span style={{ color: '#5a6080', fontSize: '0.75rem' }}>→</span>
              )}
            </div>
          ))}
        </div>

        {/* Human Gate Notice */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '8px',
            background: '#181c27',
            border: '1px solid rgba(201,168,76,0.3)',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              color: '#c9a84c',
              fontWeight: '700',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            ⚖ Human Authority & Approval Gate Rules
          </div>
          <p style={{ fontSize: '0.85rem', color: '#9aa0b8', lineHeight: '1.5' }}>
            {meta.description} The <code>ruled → resolved</code> transition is an explicit human approval gate:
            the AI advocate chamber and ruling pipelines cannot self-approve. Use the document action bar at the
            bottom to advance this document along legal transitions.
          </p>
        </div>

        {/* Institutional Transition Audit Log */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '1rem', color: '#e8eaf0' }}>
              📜 Institutional Transition Audit Trail ({log.length})
            </h3>
            <span
              style={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                color: '#5a6080',
              }}
            >
              IMMUTABLE SANITY AUDIT LOG
            </span>
          </div>

          {log.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                background: '#131720',
                borderRadius: '8px',
                border: '1px dashed rgba(255,255,255,0.08)',
                color: '#5a6080',
                fontSize: '0.85rem',
              }}
            >
              No transitions recorded yet. Changes will appear here automatically.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {log.map((entry, idx) => (
                <div
                  key={entry._key ?? idx}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '8px',
                    background: '#131720',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#1e2333',
                          color: '#9aa0b8',
                        }}
                      >
                        {entry.from}
                      </span>
                      <span style={{ color: '#5a6080' }}>→</span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(201,168,76,0.15)',
                          color: '#c9a84c',
                          fontWeight: '700',
                        }}
                      >
                        {entry.to}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        color: '#5a6080',
                      }}
                    >
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: '600', color: '#e8eaf0' }}>{entry.actor}</span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontFamily: 'monospace',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: '#1e2333',
                        color: '#c9a84c',
                        textTransform: 'uppercase',
                      }}
                    >
                      {entry.actorType ?? 'authority'}
                    </span>
                  </div>

                  {entry.note && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: '#181c27',
                        borderRadius: '6px',
                        borderLeft: '3px solid #c9a84c',
                        fontSize: '0.8rem',
                        color: '#9aa0b8',
                        fontStyle: 'italic',
                      }}
                    >
                      &ldquo;{entry.note}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
