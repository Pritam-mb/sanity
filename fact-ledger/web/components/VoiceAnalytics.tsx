'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useChartCursor } from '@/lib/useChartCursor'

export interface VoiceStats {
  complaintsByStatus?: { name: string; value: number }[]
  complaintsByFact?: { name: string; fullName?: string; value: number }[]
  updateVotes?: { name: string; fullTitle?: string; up: number; down: number }[]
  qaFunnel?: { name: string; value: number }[]
}

const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
  display: 'flex',
  flexDirection: 'column',
}

function ChartTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{title}</div>
      <div style={{ fontSize: '0.75rem', color: '#8b8b93' }}>{sub}</div>
    </div>
  )
}

function formatPolicyLabel(rawName: string): string {
  const n = rawName.toLowerCase()
  if (n.includes('refund')) return 'Refund'
  if (n.includes('sla') || n.includes('uptime')) return 'SLA'
  if (n.includes('trial')) return 'Trial'
  if (n.includes('fee') || n.includes('payment')) return 'Late Fee'
  if (n.includes('support')) return 'Support'
  if (n.includes('file') || n.includes('size')) return 'Max File'
  if (n.includes('retention')) return 'Retention'
  const cleaned = rawName.replace(/…|\.\.\./g, '').trim()
  return cleaned.length > 8 ? cleaned.slice(0, 7) + '…' : cleaned
}

function formatUpdateLabel(rawName: string): string {
  const n = rawName.toLowerCase()
  if (n.includes('refund')) return 'Refund'
  if (n.includes('soc2')) return 'SOC2'
  if (n.includes('trial')) return 'Trial FAQ'
  if (n.includes('support')) return 'Support'
  if (n.includes('retention') || n.includes('privacy')) return 'Retention'
  if (n.includes('priority')) return 'Priority'
  if (n.includes('enterprise')) return 'Enterprise'
  if (n.includes('grace') || n.includes('fee')) return 'Late Fee'
  const cleaned = rawName.replace(/…|\.\.\./g, '').trim()
  return cleaned.length > 8 ? cleaned.slice(0, 7) + '…' : cleaned
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  'in-review': 'In Review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
}

/** Employee voice analytics: complaints, update votes, Q&A funnel. Monochrome. Renders only the charts it gets data for. */
export function VoiceAnalytics({ stats }: { stats: VoiceStats }) {
  const statusCursor = useChartCursor({ tooltipWidth: 180, tooltipHeight: 80 })
  const factCursor = useChartCursor({ tooltipWidth: 190, tooltipHeight: 80 })
  const votesCursor = useChartCursor({ tooltipWidth: 190, tooltipHeight: 90 })
  const qaCursor = useChartCursor({ tooltipWidth: 185, tooltipHeight: 85 })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
      {stats.complaintsByStatus && (
        <div style={card}>
          <ChartTitle title="Complaints by status" sub="Triage pipeline across all policies" />
          <div
            style={{ width: '100%', height: 230, position: 'relative' }}
            onMouseMove={statusCursor.onMouseMove}
            onMouseLeave={statusCursor.onMouseLeave}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.complaintsByStatus} margin={{ top: 10, right: 10, left: -14, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#232323" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#333' }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickFormatter={(v) => STATUS_LABELS[v] || v}
                  stroke="#a1a1aa"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#333' }}
                  width={80}
                />
                <Tooltip
                  cursor={false}
                  position={statusCursor.pos || undefined}
                  isAnimationActive={false}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]
                      const rawName = String(data.payload?.name || '')
                      const label = STATUS_LABELS[rawName] || rawName
                      const val = Number(data.value) || 0
                      return (
                        <div
                          style={{
                            background: '#090d16',
                            border: '1px solid #334155',
                            padding: '8px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#f1f5f9' }}>Status: {label}</div>
                          <div style={{ color: '#cbd5e1', marginTop: 4 }}>
                            Complaints: <strong style={{ color: '#fff' }}>{val}</strong>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="value" name="Complaints" fill="#ffffff" radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {stats.complaintsByFact && (
        <div style={card}>
          <ChartTitle title="Complaints per policy" sub="Which canonical values hurt the most" />
          <div
            style={{ width: '100%', height: 230, position: 'relative' }}
            onMouseMove={factCursor.onMouseMove}
            onMouseLeave={factCursor.onMouseLeave}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.complaintsByFact} margin={{ top: 10, right: 10, left: -18, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232323" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickFormatter={formatPolicyLabel}
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#333' }}
                  interval={0}
                />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#333' }} allowDecimals={false} />
                <Tooltip
                  cursor={false}
                  position={factCursor.pos || undefined}
                  isAnimationActive={false}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]
                      const fullName = data.payload?.fullName || data.payload?.name || 'Policy'
                      const val = Number(data.value) || 0
                      return (
                        <div
                          style={{
                            background: '#090d16',
                            border: '1px solid #334155',
                            padding: '8px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{fullName}</div>
                          <div style={{ color: '#cbd5e1', marginTop: 4 }}>
                            Complaints: <strong style={{ color: '#fff' }}>{val}</strong>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="value" name="Complaints" fill="#ffffff" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {stats.updateVotes && (
        <div style={card}>
          <ChartTitle title="Update reception" sub="Employee upvotes vs downvotes per announcement" />
          <div
            style={{ width: '100%', height: 230, position: 'relative' }}
            onMouseMove={votesCursor.onMouseMove}
            onMouseLeave={votesCursor.onMouseLeave}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.updateVotes} margin={{ top: 10, right: 10, left: -18, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232323" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickFormatter={formatUpdateLabel}
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#333' }}
                  interval={0}
                />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#333' }} allowDecimals={false} />
                <Tooltip
                  cursor={false}
                  position={votesCursor.pos || undefined}
                  isAnimationActive={false}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload
                      const title = item.fullTitle || item.name || 'Announcement'
                      return (
                        <div
                          style={{
                            background: '#090d16',
                            border: '1px solid #334155',
                            padding: '8px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{title}</div>
                          <div style={{ color: '#fff' }}>Upvotes: {item.up}</div>
                          <div style={{ color: '#a1a1aa' }}>Downvotes: {item.down}</div>
                          <div style={{ color: '#94a3b8', borderTop: '1px solid #1e293b', marginTop: 4, paddingTop: 4 }}>
                            Net Sentiment: {item.up - item.down > 0 ? `+${item.up - item.down}` : item.up - item.down}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="up" name="Upvotes" stackId="v" fill="#ffffff" isAnimationActive={false} />
                <Bar dataKey="down" name="Downvotes" stackId="v" fill="#52525b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {stats.qaFunnel && (
        <div style={card}>
          <ChartTitle title="Policy Q&A funnel" sub="Open questions vs answered" />
          <div
            style={{ width: '100%', height: 230, position: 'relative' }}
            onMouseMove={qaCursor.onMouseMove}
            onMouseLeave={qaCursor.onMouseLeave}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.qaFunnel}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive={false}
                >
                  {stats.qaFunnel.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? '#ffffff' : '#52525b'}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  position={qaCursor.pos || undefined}
                  isAnimationActive={false}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]
                      const total = (stats.qaFunnel || []).reduce((acc, curr) => acc + (curr.value || 0), 0)
                      const val = Number(data.value) || 0
                      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0'
                      return (
                        <div
                          style={{
                            background: '#090d16',
                            border: '1px solid #334155',
                            padding: '8px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: data.name === 'Answered' ? '#fff' : '#52525b',
                              }}
                            />
                            {data.name} Questions
                          </div>
                          <div style={{ color: '#cbd5e1', marginTop: 4 }}>
                            Count: <strong style={{ color: '#fff' }}>{val}</strong> ({pct}%)
                          </div>
                          <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                            {data.name === 'Answered' ? 'Resolved policy queries' : 'Awaiting official response'}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            {stats.qaFunnel.map((s, i) => (
              <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: i === 0 ? '#fff' : '#a1a1aa' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: i === 0 ? '#fff' : '#52525b' }} />
                {s.name}: {s.value}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
