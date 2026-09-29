'use client'

import React, { useState } from 'react'

interface DocumentViewProps {
  documentId: string
  document: {
    displayed: Record<string, unknown>
    draft: Record<string, unknown> | null
    published: Record<string, unknown> | null
  }
}

export function ClauseCourtPreview({ documentId, document }: DocumentViewProps) {
  const displayed = document.displayed
  const cleanId = documentId.replace(/^drafts\./, '')
  const title = (displayed?.title as string) || 'Untitled Clause'
  const caseNumber = (displayed?.caseNumber as string) || '#0000'
  const status = (displayed?.status as string) || 'draft'
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const previewUrl = `http://localhost:3000/clauses/${cleanId}`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: '#0d0f14',
        color: '#e8eaf0',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Studio Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          background: '#131720',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          gap: '12px',
          flexWrap: 'wrap',
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
            {caseNumber} · Clause Court Preview
          </div>
          <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{title}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '4px 10px',
              borderRadius: '100px',
              background: 'rgba(201, 168, 76, 0.15)',
              color: '#c9a84c',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              fontWeight: '600',
              textTransform: 'uppercase',
            }}
          >
            {status}
          </span>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: '#c9a84c',
              color: '#080a0f',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '0.8rem',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            Open in App ↗
          </a>
        </div>
      </div>

      {/* Live App Iframe Container */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        {!iframeLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#080a0f',
              color: '#9aa0b8',
              gap: '12px',
              zIndex: 1,
            }}
          >
            <div style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }}>⟳</div>
            <p style={{ fontSize: '0.85rem' }}>Loading live Clause Court preview from localhost:3000...</p>
          </div>
        )}
        <iframe
          src={previewUrl}
          title="Clause Court Live Preview"
          onLoad={() => setIframeLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#0d0f14',
          }}
        />
      </div>
    </div>
  )
}
