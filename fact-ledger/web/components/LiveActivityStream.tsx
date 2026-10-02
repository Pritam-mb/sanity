'use client'

import React, { useState, useEffect } from 'react'
import { sanityClient } from '@/lib/sanity/client'
import { formatTime, formatDate } from '@/lib/format'

export interface AuditEventItem {
  id: string
  action: string
  actor: string
  at: string
  releaseId?: string
  targetType?: string
  details?: string
  isLive?: boolean
}

export interface LiveActivityStreamProps {
  initialEvents: AuditEventItem[]
  initialScans: any[]
}

export function LiveActivityStream({ initialEvents, initialScans }: LiveActivityStreamProps) {
  const [events, setEvents] = useState<AuditEventItem[]>(initialEvents)
  const [liveEventCount, setLiveEventCount] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [isRemediating, setIsRemediating] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(true)

  // Subscribe to real-time Sanity document changes
  useEffect(() => {
    try {
      const query = '*[_type in ["changeEvent", "scanRun", "finding", "fact", "page", "remediation"]]'
      const subscription = sanityClient
        .listen(query, {}, { includeResult: true, visibility: 'query' })
        .subscribe({
          next: (update: any) => {
            const doc = update.result
            if (!doc) return

            setLiveEventCount(c => c + 1)

            // Construct new live event item
            const newEvent: AuditEventItem = {
              id: doc._id || `live-${Date.now()}`,
              action:
                doc._type === 'changeEvent'
                  ? doc.action
                  : doc._type === 'scanRun'
                  ? `scan_completed (${doc.trigger || 'live'})`
                  : doc._type === 'remediation'
                  ? `remediation_${doc.status || 'updated'}`
                  : `${doc._type}_${update.transition}`,
              actor: doc.actor || (doc._type === 'scanRun' ? 'System Scanner' : 'Sanity Engine'),
              at: doc.at || doc.startedAt || new Date().toISOString(),
              releaseId: doc.releaseId,
              targetType: doc._type,
              details:
                doc._type === 'scanRun'
                  ? `${doc.metrics?.factsScanned ?? 8} facts · ${doc.metrics?.pagesScanned ?? 23} pages (${doc.metrics?.durationMs ?? 0}ms)`
                  : doc.after || `Transition: ${update.transition}`,
              isLive: true,
            }

            setEvents(prev => [newEvent, ...prev.slice(0, 19)])
            setActionMessage(`Real-time update: ${newEvent.action} on ${doc._type}`)
            setTimeout(() => setActionMessage(null), 4000)
          },
          error: (err: any) => {
            console.error('Sanity live listener error:', err)
            setIsConnected(false)
          },
        })

      return () => subscription.unsubscribe()
    } catch (err) {
      console.error('Failed to establish Sanity listener', err)
      setIsConnected(false)
    }
  }, [])

  // Quick Action: Execute Immediate Scan
  const handleTriggerScan = async () => {
    setIsScanning(true)
    setActionMessage('Executing deterministic scanner across all pages and facts...')
    try {
      const res = await fetch('/api/scan', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setActionMessage(
          `Scan completed in ${data.durationMs}ms: ${data.scanned.pages} pages, ${data.findings.total} findings (${data.findings.created} new)`
        )
      } else {
        setActionMessage(`Scan failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      setActionMessage(`Scan request failed: ${err.message}`)
    } finally {
      setIsScanning(false)
      setTimeout(() => setActionMessage(null), 5000)
    }
  }

  // Quick Action: Draft AI Remediation
  const handleTriggerRemediate = async () => {
    setIsRemediating(true)
    setActionMessage('AI Agent analyzing open findings and constructing Sanity patch mutations...')
    try {
      const res = await fetch('/api/agent/remediate', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setActionMessage(`AI Remediation draft created! ID: ${data.remediationId.substring(0, 8)}...`)
      } else {
        setActionMessage(data.message || 'No open findings needed remediation.')
      }
    } catch (err: any) {
      setActionMessage(`Remediation request failed: ${err.message}`)
    } finally {
      setIsRemediating(false)
      setTimeout(() => setActionMessage(null), 5000)
    }
  }

  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '2.5rem' }}>
      {/* Top Bar: Connection & Action Triggers */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: isConnected ? '#22c55e' : '#ef4444',
              boxShadow: isConnected ? '0 0 10px rgba(34, 197, 94, 0.6)' : 'none',
            }}
          />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Sanity Content Lake · Live Audit Ledger & Action Stream
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Project: <code style={{ fontSize: '0.75rem' }}>tmics7hc</code> · Dataset: <code style={{ fontSize: '0.75rem' }}>fact-ledger</code> · Status:{' '}
              <span style={{ color: isConnected ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                {isConnected ? 'STREAMING ACTIVE' : 'DISCONNECTED'}
              </span>
              {liveEventCount > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--accent-secondary)' }}>
                  ({liveEventCount} real-time event{liveEventCount !== 1 ? 's' : ''} received)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleTriggerScan}
            disabled={isScanning}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: 'var(--accent-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: isScanning ? 'wait' : 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {isScanning ? 'RUNNING SCAN...' : 'RUN IMMEDIATE SCAN'}
          </button>

          <button
            onClick={handleTriggerRemediate}
            disabled={isRemediating}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: isRemediating ? 'wait' : 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {isRemediating ? 'DRAFTING FIXES...' : 'DRAFT AI REMEDIATION'}
          </button>

          <a
            href="http://localhost:3333"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            OPEN STUDIO [3333]
          </a>
        </div>
      </div>

      {/* Live Message Toast */}
      {actionMessage && (
        <div
          style={{
            padding: '8px 14px',
            marginBottom: '1rem',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 6,
            fontSize: '0.8rem',
            color: 'var(--accent-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{actionMessage}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LIVE SYNC</span>
        </div>
      )}

      {/* Event Stream List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 380, overflowY: 'auto' }}>
        {events.length > 0 ? (
          events.map(item => {
            const isAI = item.actor?.toLowerCase().includes('agent') || item.action?.includes('fix')
            const isHuman = item.actor?.toLowerCase().includes('editor') || item.actor?.toLowerCase().includes('human')
            const isScan = item.action?.includes('scan')

            const actorBadgeColor = isAI ? '#38bdf8' : isHuman ? '#f59e0b' : '#a855f7'
            const actorBg = isAI ? 'rgba(56, 189, 248, 0.1)' : isHuman ? 'rgba(245, 158, 11, 0.1)' : 'rgba(168, 85, 247, 0.1)'

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: item.isLive ? 'rgba(99, 102, 241, 0.06)' : 'var(--bg-card)',
                  border: item.isLive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: actorBg,
                      border: `1px solid ${actorBadgeColor}40`,
                      color: actorBadgeColor,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.actor || 'SYSTEM'}
                  </span>

                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.action.replace(/_/g, ' ').toUpperCase()}
                      {item.releaseId && (
                        <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          RELEASE: {item.releaseId.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                    {item.details && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.details}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }} suppressHydrationWarning>
                  <div suppressHydrationWarning>{formatTime(item.at)}</div>
                  <div style={{ fontSize: '0.7rem' }} suppressHydrationWarning>{formatDate(item.at)}</div>
                </div>
              </div>
            )
          })
        ) : (
          /* If no changeEvents have been written yet, fallback to displaying the recent scan runs from Sanity */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Recent Scan Executions from Sanity Content Lake:
            </div>
            {initialScans.map((scan: any) => (
              <div
                key={scan._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: 'var(--accent-secondary)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    SCAN RUN
                  </span>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      Trigger: {scan.trigger}
                    </span>
                    <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
                      {scan.durationMs}ms · {scan.pagesScanned} pages · {scan.factsScanned} facts
                    </span>
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }} suppressHydrationWarning>
                  {formatTime(scan.startedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
