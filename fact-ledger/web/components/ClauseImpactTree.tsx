'use client'

import React, { useState } from 'react'
import type { ChangeTreeNode, AffectedItem, TimelinePoint } from '@/lib/treeData'
import { formatTime, formatDate } from '@/lib/format'

interface ClauseImpactTreeProps {
  initialSessions: ChangeTreeNode[]
}

export function ClauseImpactTree({ initialSessions }: ClauseImpactTreeProps) {
  const [sessions] = useState<ChangeTreeNode[]>(initialSessions)
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    initialSessions[0]?.sessionId || 'session-sarah-refund'
  )
  const [selectedAffectedItem, setSelectedAffectedItem] = useState<AffectedItem | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'drafted' | 'fixed'>('all')
  const [viewMode, setViewMode] = useState<'tree' | 'timeline'>('tree')

  const currentSession =
    sessions.find(s => s.sessionId === selectedSessionId) || sessions[0]

  if (!currentSession) {
    return null
  }

  const filteredItems = (currentSession.affectedItems || []).filter((item: AffectedItem) => {
    if (statusFilter === 'all') return true
    return item.status === statusFilter
  })

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '1.75rem',
        marginBottom: '2.5rem',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#fff',
                textTransform: 'uppercase',
              }}
            >
              ORGANIZER CHANGE & CLAUSE IMPACT TREE
            </span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Document & Clause Cascade Visualizer
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Trace who changed what document, which clause was modified, and all downstream pages and policies affected across Sanity.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 2,
            }}
          >
            <button
              onClick={() => setViewMode('tree')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'tree' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: viewMode === 'tree' ? 'var(--accent-secondary)' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              TREE GRAPH
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'timeline' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: viewMode === 'timeline' ? 'var(--accent-secondary)' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              FIX TIMELINE
            </button>
          </div>
        </div>
      </div>

      {/* Organizer Member & Session Switcher Bar */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Organizer Member Work Session:
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {sessions.map(s => {
            const isSelected = s.sessionId === selectedSessionId
            return (
              <button
                key={s.sessionId}
                onClick={() => {
                  setSelectedSessionId(s.sessionId)
                  setSelectedAffectedItem(null)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '10px 12px',
                  background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: isSelected ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                    fontFamily: 'monospace',
                  }}
                >
                  {s.member.avatarCode}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {s.member.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {s.document.title}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: isSelected ? 'var(--accent-secondary)' : 'var(--text-muted)', marginTop: 2 }}>
                    {s.metrics.totalAffected} Affected · {s.metrics.openDrift} Open Drift
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* View Mode: Tree Graph */}
      {viewMode === 'tree' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Level 1: Root Node (Organizer Member) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '12px 20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--accent-primary)',
                borderRadius: 12,
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.15)',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                }}
              >
                {currentSession.member.avatarCode}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {currentSession.member.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--accent-secondary)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    ORGANIZER MEMBER
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {currentSession.member.role} · {currentSession.member.department}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }} suppressHydrationWarning>
                  Action Logged: {formatDate(currentSession.document.lastModified)} at {formatTime(currentSession.document.lastModified)}
                </div>
              </div>
            </div>

            {/* Vertical Connector Line */}
            <div style={{ width: 2, height: 28, background: 'var(--accent-primary)', opacity: 0.6 }} />
          </div>

          {/* Level 2: Primary Document & Clause Change Node */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                maxWidth: 720,
                width: '100%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '1.25rem 1.5rem',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                    }}
                  >
                    SOURCE DOCUMENT
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {currentSession.document.title}
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  slug: /{currentSession.document.slug}
                </span>
              </div>

              {/* Modified Clause Card */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '0.9rem 1.1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                    {currentSession.clause.title}
                  </div>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.65rem',
                      color: 'var(--text-muted)',
                      background: 'var(--bg-card)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                    }}
                  >
                    KEY: {currentSession.clause.key}
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {currentSession.clause.summary}
                </p>

                {/* Before vs After Diff Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 6,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>BEFORE:</span>
                    <span style={{ color: '#a1a1aa', fontWeight: 700, textDecoration: 'line-through' }}>
                      {currentSession.clause.beforeValue}
                    </span>
                  </div>

                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.07)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: 6,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>AFTER:</span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>
                      {currentSession.clause.afterValue}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vertical Connector Line to Branches */}
            <div style={{ width: 2, height: 28, background: 'var(--accent-primary)', opacity: 0.6 }} />
          </div>

          {/* Level 3: Downstream Impact Branches (Affected Surface) */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.05em',
                  }}
                >
                  DOWNSTREAM AFFECTED SURFACE ({filteredItems.length} CLAUSES / PAGES)
                </span>
              </div>

              {/* Status Filters */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {(['all', 'open', 'drafted', 'fixed'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      border: statusFilter === st ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                      background: statusFilter === st ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
                      color: statusFilter === st ? 'var(--accent-secondary)' : 'var(--text-muted)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Affected Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1rem',
              }}
            >
              {filteredItems.map((item: AffectedItem) => {
                const isSelected = selectedAffectedItem?.id === item.id
                const isFixed = item.status === 'fixed'
                const isDrafted = item.status === 'drafted'
                const isOpen = item.status === 'open'

                const statusColor = isFixed ? '#000000' : isDrafted ? '#ffffff' : '#d4d4d8'
                const statusBg = isFixed
                  ? '#ffffff'
                  : isDrafted
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(255, 255, 255, 0.04)'
                const statusBorder = isFixed
                  ? '#ffffff'
                  : isDrafted
                  ? 'rgba(255, 255, 255, 0.3)'
                  : 'rgba(255, 255, 255, 0.2)'
                const statusLabel = isFixed ? 'RESOLVED' : isDrafted ? 'DRAFTED' : 'DRIFT OPEN'

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAffectedItem(item)}
                    style={{
                      background: isSelected ? 'rgba(255, 255, 255, 0.06)' : 'var(--bg-card)',
                      border: isSelected ? '1px solid #fff' : '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '1.1rem',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isSelected ? '0 4px 15px rgba(255, 255, 255, 0.12)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                          }}
                        >
                          RULE {item.rule}: {item.ruleName.toUpperCase()}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: statusBg,
                            color: statusColor,
                            border: `1px solid ${statusBorder}`,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {item.pageTitle}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', marginBottom: '0.6rem' }}>
                        {item.clauseTitle}
                      </div>

                      <div
                        style={{
                          background: 'var(--bg-elevated)',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          fontStyle: 'italic',
                          border: '1px solid var(--border)',
                          marginBottom: '0.75rem',
                        }}
                      >
                        "{item.excerpt}"
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '0.6rem',
                        borderTop: '1px solid var(--border)',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace' }}>Block: {item.blockKey}</span>
                      <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>
                        {isSelected ? 'INSPECTING' : 'CLICK TO INSPECT'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Interactive Node Inspector Panel */}
          {selectedAffectedItem && (
            <div
              style={{
                marginTop: '1.5rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--accent-primary)',
                borderRadius: 12,
                padding: '1.25rem 1.5rem',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Inspector: {selectedAffectedItem.pageTitle}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedAffectedItem(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '2px 8px',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  CLOSE
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.8rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                    Sanity Document ID
                  </div>
                  <code style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{selectedAffectedItem.pageId}</code>

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 10, marginBottom: 2 }}>
                    Clause Section
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{selectedAffectedItem.clauseTitle}</div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 10, marginBottom: 2 }}>
                    Rule Evaluation
                  </div>
                  <div style={{ color: '#fff' }}>
                    Rule {selectedAffectedItem.rule}: {selectedAffectedItem.ruleName}
                  </div>
                </div>

                {/* Diff Comparison */}
                {selectedAffectedItem.remediationSnippet && (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Before Text vs Proposed After Text
                    </div>
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        padding: '6px 10px',
                        borderRadius: 6,
                        color: '#a1a1aa',
                        fontSize: '0.75rem',
                        marginBottom: 6,
                      }}
                    >
                      <strong style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Before:</strong>{' '}
                      {selectedAffectedItem.remediationSnippet.beforeText}
                    </div>
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.07)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        padding: '6px 10px',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: '0.75rem',
                      }}
                    >
                      <strong style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>After:</strong>{' '}
                      {selectedAffectedItem.remediationSnippet.afterText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Mode: Timeline */}
      {viewMode === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Chronological resolution timeline for changes made to <strong>{currentSession.document.title}</strong> by{' '}
            <strong>{currentSession.member.name}</strong>:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
            {currentSession.timeline.map((point: TimelinePoint) => {
              const isCompleted = point.status === 'completed'
              const isInProgress = point.status === 'in_progress'

              const dotColor = isCompleted ? '#ffffff' : isInProgress ? '#d4d4d8' : '#52525b'
              const badgeBg = isCompleted
                ? '#ffffff'
                : isInProgress
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(255, 255, 255, 0.04)'

              return (
                <div
                  key={point.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    background: 'var(--bg-card)',
                    border: isInProgress ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: dotColor,
                      color: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {point.step}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {point.title}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: badgeBg,
                            color: isCompleted ? '#000000' : dotColor,
                            border: `1px solid rgba(255,255,255,0.25)`,
                          }}
                        >
                          {point.badge}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} suppressHydrationWarning>
                        {formatTime(point.timestamp)}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {point.details}
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                      Actor: <strong>{point.actor}</strong>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
