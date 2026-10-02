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

export interface VoiceStats {
  complaintsByStatus?: { name: string; value: number }[]
  complaintsByFact?: { name: string; value: number }[]
  updateVotes?: { name: string; up: number; down: number }[]
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

const tooltipStyle = {
  background: '#0a0a0a',
  border: '1px solid #333',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 12,
  color: '#fff',
}

function ChartTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{title}</div>
      <div style={{ fontSize: '0.75rem', color: '#8b8b93' }}>{sub}</div>
    </div>
  )
}

/** Employee-voice analytics: complaints, update votes, Q&A funnel. Monochrome. Renders only the charts it gets data for. */
export function VoiceAnalytics({ stats }: { stats: VoiceStats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
      {stats.complaintsByStatus && (
      <div style={card}>
        <ChartTitle title="Complaints by status" sub="Triage pipeline across all policies" />
        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.complaintsByStatus} margin={{ top: 10, right: 10, left: -18, bottom: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#232323" horizontal={false} />
              <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#333' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={{ stroke: '#333' }} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Complaints" fill="#ffffff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {stats.complaintsByFact && (
      <div style={card}>
        <ChartTitle title="Complaints per policy" sub="Which canonical values hurt the most" />
        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.complaintsByFact} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232323" vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={{ stroke: '#333' }} interval={0} angle={-18} textAnchor="end" />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#333' }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Complaints" fill="#ffffff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {stats.updateVotes && (
      <div style={card}>
        <ChartTitle title="Update reception" sub="Employee upvotes vs downvotes per announcement" />
        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.updateVotes} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232323" vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={{ stroke: '#333' }} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#333' }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="up" name="Upvotes" stackId="v" fill="#ffffff" />
              <Bar dataKey="down" name="Downvotes" stackId="v" fill="#52525b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {stats.qaFunnel && (
      <div style={card}>
        <ChartTitle title="Policy Q&A funnel" sub="Open questions vs answered" />
        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={stats.qaFunnel} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={4} dataKey="value" nameKey="name">
                {stats.qaFunnel.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#ffffff' : '#52525b'} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
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
