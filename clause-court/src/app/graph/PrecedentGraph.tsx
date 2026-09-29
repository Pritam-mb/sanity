'use client'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'

// =============================================
// PRECEDENT GRAPH
// =============================================
//
// Four columns, read left to right:
//
//   CLAUSE → RULING → PRECEDENT → CLAUSE
//
// A clause that is argued produces a ruling, a ruling becomes precedent, and
// precedent is cited by later clauses. Seeing the arrow leave the right-hand
// side and land back on a clause is the whole argument of the product: the
// system accumulates institutional reasoning instead of restarting per debate.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ClauseNode({ data }: NodeProps<any>) {
  return (
    <div className={`graph-node graph-node--clause ${data.dim ? 'graph-node--dim' : ''}`}>
      <Handle type="target" position={Position.Left} className="graph-handle" />
      <div className="graph-node__eyebrow">{data.caseNumber ?? 'CLAUSE'}</div>
      <div className="graph-node__title">{data.label}</div>
      <span className={`badge badge--${data.status}`}>{data.status}</span>
      <Handle type="source" position={Position.Right} className="graph-handle" />
    </div>
  )
}

function RulingNode({ data }: NodeProps) {
  return (
    <div className="graph-node graph-node--ruling">
      <Handle type="target" position={Position.Left} className="graph-handle" />
      <div className="graph-node__eyebrow">🔨 RULING</div>
      <div className="graph-node__title">{data.label as string}</div>
      <div className="graph-node__meta">{data.judge as string}</div>
      <Handle type="source" position={Position.Right} className="graph-handle" />
    </div>
  )
}

function PrecedentNode({ data }: NodeProps) {
  return (
    <div className="graph-node graph-node--precedent">
      <Handle type="target" position={Position.Left} className="graph-handle" />
      <div className="graph-node__eyebrow">📚 PRECEDENT</div>
      <div className="graph-node__title">{data.label as string}</div>
      <div className="graph-node__meta">{data.holding as string}</div>
      <span className="graph-node__cite">
        cited by {data.citationCount as number}
      </span>
      <Handle type="source" position={Position.Right} className="graph-handle" />
    </div>
  )
}

const nodeTypes = {
  clause: ClauseNode,
  ruling: RulingNode,
  precedent: PrecedentNode,
}

// ─── Types mirroring GRAPH_QUERY ────────────────────────────

interface GraphClause {
  _id: string
  title: string
  status: string
  caseNumber?: string
  citedPrecedentIds: string[]
  rulingIds: string[]
}

interface GraphRuling {
  _id: string
  judgeName: string
  clauseId: string
  _createdAt: string
}

interface GraphPrecedent {
  _id: string
  title: string
  holding: string
  rulingId: string
  sourceClauseId: string
  citesPrecedentIds: string[]
  citationCount: number
}

export interface GraphData {
  clauses: GraphClause[]
  rulings: GraphRuling[]
  precedents: GraphPrecedent[]
}

const COLUMN_X = { clause: 0, ruling: 380, precedent: 760, dependent: 1200 }
const ROW_HEIGHT = 150

function buildGraph(data: GraphData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  const precedentBySource = new Map(
    data.precedents.map((p) => [p.sourceClauseId, p] as const)
  )
  const citedPrecedentIds = new Set(
    data.clauses.flatMap((c) => c.citedPrecedentIds)
  )

  // A clause that has already been ruled belongs on the left. A clause that
  // only cites precedent belongs on the right. A clause can be both, and then
  // the citation edge is what makes the chain visible across the canvas.
  const sourceClauses = data.clauses.filter((c) => c.rulingIds.length > 0)
  const dependentClauses = data.clauses.filter(
    (c) => c.rulingIds.length === 0 && citedPrecedentIds.has(c._id)
  )

  sourceClauses.forEach((clause, i) => {
    nodes.push({
      id: `clause:${clause._id}`,
      type: 'clause',
      position: { x: COLUMN_X.clause, y: i * ROW_HEIGHT },
      data: {
        label: clause.title,
        caseNumber: clause.caseNumber,
        status: clause.status,
        href: `/clauses/${clause._id}`,
      },
    })
  })

  dependentClauses.forEach((clause, i) => {
    nodes.push({
      id: `clause:${clause._id}`,
      type: 'clause',
      position: { x: COLUMN_X.dependent, y: i * ROW_HEIGHT },
      data: {
        label: clause.title,
        caseNumber: clause.caseNumber,
        status: clause.status,
        href: `/clauses/${clause._id}`,
      },
    })
  })

  data.rulings.forEach((ruling, i) => {
    if (!ruling.clauseId) return
    nodes.push({
      id: `ruling:${ruling._id}`,
      type: 'ruling',
      position: { x: COLUMN_X.ruling, y: i * ROW_HEIGHT },
      data: {
        label: ruling.judgeName,
        judge: `Judge ${ruling.judgeName}`,
      },
    })
    edges.push({
      id: `e-clause-ruling-${ruling._id}`,
      source: `clause:${ruling.clauseId}`,
      target: `ruling:${ruling._id}`,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#c9a84c' },
      style: { stroke: '#c9a84c', strokeWidth: 1.6 },
      label: 'produced',
      labelStyle: { fill: '#5a6080', fontSize: 10 },
      labelBgStyle: { fill: '#131720' },
    })
  })

  data.precedents.forEach((precedent, i) => {
    nodes.push({
      id: `precedent:${precedent._id}`,
      type: 'precedent',
      position: { x: COLUMN_X.precedent, y: i * ROW_HEIGHT },
      data: {
        label: precedent.title,
        holding: truncate(precedent.holding, 70),
        citationCount: precedent.citationCount ?? 0,
        href: `/precedents/${precedent._id}`,
      },
    })

    if (precedent.rulingId) {
      edges.push({
        id: `e-ruling-precedent-${precedent._id}`,
        source: `ruling:${precedent.rulingId}`,
        target: `precedent:${precedent._id}`,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
        style: { stroke: '#10b981', strokeWidth: 1.6 },
        label: 'became',
        labelStyle: { fill: '#5a6080', fontSize: 10 },
        labelBgStyle: { fill: '#131720' },
      })
    }

    // Precedent → later clause. This edge is the product's claim.
    for (const citingClauseId of data.clauses
      .filter((c) => c.citedPrecedentIds.includes(precedent._id))
      .map((c) => c._id)) {
      edges.push({
        id: `e-precedent-clause-${precedent._id}-${citingClauseId}`,
        source: `precedent:${precedent._id}`,
        target: `clause:${citingClauseId}`,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
        style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 4' },
        label: 'cites',
        labelStyle: { fill: '#60a5fa', fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#131720' },
      })
    }

    // Precedent inherits from precedent — the lineage chain.
    for (const parentId of precedent.citesPrecedentIds ?? []) {
      if (!precedentBySource.has(parentId) && !data.precedents.some((p) => p._id === parentId)) {
        continue
      }
      edges.push({
        id: `e-precedent-precedent-${parentId}-${precedent._id}`,
        source: `precedent:${parentId}`,
        target: `precedent:${precedent._id}`,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#c9a84c' },
        style: { stroke: '#c9a84c', strokeWidth: 1.2, strokeDasharray: '2 4' },
        label: 'inherits',
        labelStyle: { fill: '#5a6080', fontSize: 10 },
        labelBgStyle: { fill: '#131720' },
      })
    }
  })

  return { nodes, edges }
}

function truncate(value: string, max: number): string {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export default function PrecedentGraph({
  data,
  error,
}: {
  data: GraphData
  error: string | null
}) {
  const router = useRouter()
  const { nodes, edges } = useMemo(() => buildGraph(data), [data])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const href = (node.data as { href?: string })?.href
      if (href) router.push(href)
    },
    [router]
  )

  const citationEdges = edges.filter((e) => e.label === 'cites').length
  const isEmpty = nodes.length === 0

  return (
    <div style={{ padding: '40px 0 60px' }}>
      <div className="container container--wide">
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <Link href="/" style={{ color: 'var(--text-muted)' }}>
            Dashboard
          </Link>
          <span aria-hidden="true">›</span>
          <span style={{ color: 'var(--gold-400)' }}>Precedent Graph</span>
        </nav>

        <header style={{ marginBottom: '24px' }}>
          <div className="court-case-number">REFERENCE GRAPH</div>
          <h1 style={{ marginBottom: '12px' }}>
            How rulings <span style={{ color: 'var(--gold-400)' }}>accumulate</span>
          </h1>
          <p style={{ maxWidth: '680px' }}>
            Every edge below is a real Sanity reference. The dashed blue edges
            are the ones that matter: a precedent being picked up by a clause
            written after the ruling existed.
          </p>
        </header>

        {error && (
          <div
            className="card"
            style={{
              borderColor: 'var(--danger)',
              background: 'var(--danger-dim)',
              marginBottom: '20px',
            }}
          >
            <p style={{ color: 'var(--danger)' }}>⚠ {error}</p>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <LegendTile label="Clauses" value={data.clauses.length} color="var(--text-primary)" />
          <LegendTile label="Rulings" value={data.rulings.length} color="var(--gold-400)" />
          <LegendTile label="Precedents" value={data.precedents.length} color="var(--success)" />
          <LegendTile
            label="Precedent citations"
            value={citationEdges}
            color="var(--advocate-a)"
          />
        </div>

        {isEmpty ? (
          <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🕸</div>
            <h4 style={{ marginBottom: '8px' }}>The graph is empty</h4>
            <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto' }}>
              Nothing has been ruled yet. Seed the demo data and litigate a
              flagged clause — the graph fills in as rulings accumulate.
            </p>
          </div>
        ) : (
          <div
            className="graph-canvas"
            style={{
              height: '620px',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: 'var(--bg-panel)',
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={22}
                size={1}
                color="rgba(255,255,255,0.07)"
              />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) =>
                  node.type === 'precedent'
                    ? '#10b981'
                    : node.type === 'ruling'
                      ? '#c9a84c'
                      : '#3b82f6'
                }
                maskColor="rgba(13, 15, 20, 0.85)"
              />
            </ReactFlow>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            marginTop: '16px',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
          }}
        >
          <LegendKey color="#c9a84c" label="clause → ruling → precedent" />
          <LegendKey color="#3b82f6" label="precedent cited by a later clause" dashed />
          <span>Click any node to open it.</span>
        </div>
      </div>
    </div>
  )
}

function LegendTile({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.7rem',
          fontWeight: '700',
          color,
          lineHeight: 1,
          marginBottom: '4px',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  )
}

function LegendKey({
  color,
  label,
  dashed = false,
}: {
  color: string
  label: string
  dashed?: boolean
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <svg width="26" height="8" aria-hidden="true">
        <line
          x1="0"
          y1="4"
          x2="26"
          y2="4"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? '5 4' : undefined}
        />
      </svg>
      {label}
    </span>
  )
}
