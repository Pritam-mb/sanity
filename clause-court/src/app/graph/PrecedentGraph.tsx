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
// PRECEDENT GRAPH — premium edition
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
function ClauseNode({ data, selected }: NodeProps<any>) {
  return (
    <div
      className={`gnp gnp--clause${selected ? ' gnp--selected' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="gnp-handle" />
      <div className="gnp-top">
        <span className="gnp-medallion gnp-medallion--clause" aria-hidden="true">
          ⚖
        </span>
        <span className="gnp-eyebrow">{data.caseNumber ?? 'CLAUSE'}</span>
      </div>
      <div className="gnp-title">{data.label}</div>
      <span className={`badge badge--${data.status}`}>{data.status}</span>
      <Handle type="source" position={Position.Right} className="gnp-handle" />
    </div>
  )
}

function RulingNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`gnp gnp--ruling${selected ? ' gnp--selected' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="gnp-handle" />
      <div className="gnp-top">
        <span className="gnp-medallion gnp-medallion--ruling" aria-hidden="true">
          🔨
        </span>
        <span className="gnp-eyebrow">RULING</span>
      </div>
      <div className="gnp-title">{data.label as string}</div>
      <div className="gnp-meta">{data.judge as string}</div>
      <Handle type="source" position={Position.Right} className="gnp-handle" />
    </div>
  )
}

function PrecedentNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`gnp gnp--precedent${selected ? ' gnp--selected' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="gnp-handle" />
      <div className="gnp-top">
        <span
          className="gnp-medallion gnp-medallion--precedent"
          aria-hidden="true"
        >
          📚
        </span>
        <span className="gnp-eyebrow">PRECEDENT</span>
      </div>
      <div className="gnp-title">{data.label as string}</div>
      <div className="gnp-meta gnp-meta--clamp">{data.holding as string}</div>
      <span className="gnp-cite">
        <span className="gnp-cite-dot" aria-hidden="true" />
        cited by {data.citationCount as number}
      </span>
      <Handle type="source" position={Position.Right} className="gnp-handle" />
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

const COLUMN_X = { clause: 0, ruling: 400, precedent: 800, dependent: 1260 }
const ROW_HEIGHT = 180

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
      style: { stroke: '#c9a84c', strokeWidth: 2 },
      label: 'produced',
      labelStyle: { fill: '#c9a84c', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
      labelBgStyle: { fill: '#141009' },
    })
  })

  data.precedents.forEach((precedent, i) => {
    nodes.push({
      id: `precedent:${precedent._id}`,
      type: 'precedent',
      position: { x: COLUMN_X.precedent, y: i * ROW_HEIGHT },
      data: {
        label: precedent.title,
        holding: truncate(precedent.holding, 90),
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
        style: { stroke: '#10b981', strokeWidth: 2 },
        label: 'became',
        labelStyle: { fill: '#10b981', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
        labelBgStyle: { fill: '#08130e' },
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
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
        style: { stroke: '#3b82f6', strokeWidth: 2.5, strokeDasharray: '6 4' },
        label: 'cites ★',
        labelStyle: { fill: '#93c5fd', fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' },
        labelBgStyle: { fill: '#0a1226' },
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
        style: { stroke: '#c9a84c', strokeWidth: 1.5, strokeDasharray: '3 5' },
        label: 'inherits',
        labelStyle: { fill: '#8a7a45', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
        labelBgStyle: { fill: '#141009' },
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

  const citationEdges = edges.filter((e) => e.id.startsWith('e-precedent-clause')).length
  const isEmpty = nodes.length === 0

  return (
    <div className="graph-page">
      <div className="container container--wide">
        <nav aria-label="Breadcrumb" className="graph-crumb animate-fade-in">
          <Link href="/" className="graph-crumb__link">
            Dashboard
          </Link>
          <span aria-hidden="true" className="graph-crumb__sep">›</span>
          <span className="graph-crumb__current">Precedent Graph</span>
        </nav>

        <header className="graph-hero animate-fade-in">
          <div className="graph-hero__eyebrow">
            <span className="graph-hero__rule" aria-hidden="true" />
            REFERENCE GRAPH · LIVE FROM SANITY
            <span className="graph-hero__rule" aria-hidden="true" />
          </div>
          <h1 className="graph-hero__title">
            How rulings{' '}
            <em className="graph-hero__accent">accumulate</em>
          </h1>
          <p className="graph-hero__sub">
            Every edge below is a real Sanity reference — clause to ruling to
            precedent, and back to a future clause. The glowing blue edges are
            the ones that matter: a precedent being picked up by a clause
            written after the ruling existed.
          </p>
          <div className="graph-chain" aria-hidden="true">
            <span className="graph-chain__chip graph-chain__chip--clause">Clause</span>
            <span className="graph-chain__arrow">→</span>
            <span className="graph-chain__chip graph-chain__chip--ruling">Ruling</span>
            <span className="graph-chain__arrow">→</span>
            <span className="graph-chain__chip graph-chain__chip--precedent">Precedent</span>
            <span className="graph-chain__arrow">→</span>
            <span className="graph-chain__chip graph-chain__chip--future">Future clause</span>
          </div>
        </header>

        {error && (
          <div className="card graph-error" role="alert">
            <p>⚠ {error}</p>
          </div>
        )}

        <div className="graph-stats animate-fade-in">
          <StatTile label="Clauses" value={data.clauses.length} accent="clause" />
          <StatTile label="Rulings" value={data.rulings.length} accent="ruling" />
          <StatTile label="Precedents" value={data.precedents.length} accent="precedent" />
          <StatTile
            label="Precedent citations"
            value={citationEdges}
            accent="cites"
            star
          />
        </div>

        {isEmpty ? (
          <div className="card graph-empty animate-scale-in">
            <div className="graph-empty__ring" aria-hidden="true">🕸</div>
            <h4>The graph is empty</h4>
            <p>
              Nothing has been ruled yet. Seed the demo data and litigate a
              flagged clause — the graph fills in as rulings accumulate.
            </p>
          </div>
        ) : (
          <div className="graph-canvas animate-fade-in">
            <div className="graph-canvas__glow" aria-hidden="true" />
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              fitView
              fitViewOptions={{ padding: 0.22 }}
              proOptions={{ hideAttribution: true }}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              minZoom={0.4}
              maxZoom={1.6}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={26}
                size={1.4}
                color="rgba(201,168,76,0.14)"
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
                maskColor="rgba(8, 10, 15, 0.82)"
                style={{
                  background: 'rgba(13, 15, 20, 0.9)',
                  border: '1px solid rgba(201,168,76,0.25)',
                  borderRadius: '12px',
                }}
              />
            </ReactFlow>
          </div>
        )}

        <div className="graph-legend">
          <LegendKey color="#c9a84c" label="clause → ruling → precedent" />
          <LegendKey color="#3b82f6" label="precedent cited by a later clause ★" dashed glow />
          <span className="graph-legend__hint">Click any node to open it.</span>
        </div>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  accent,
  star = false,
}: {
  label: string
  value: number
  accent: 'clause' | 'ruling' | 'precedent' | 'cites'
  star?: boolean
}) {
  return (
    <div className={`graph-stat graph-stat--${accent}`}>
      <div className="graph-stat__value">
        {value}
        {star && value > 0 && (
          <span className="graph-stat__star" aria-label="killer feature">
            ★
          </span>
        )}
      </div>
      <div className="graph-stat__label">{label}</div>
    </div>
  )
}

function LegendKey({
  color,
  label,
  dashed = false,
  glow = false,
}: {
  color: string
  label: string
  dashed?: boolean
  glow?: boolean
}) {
  return (
    <span className="graph-legend__key">
      <svg
        width="30"
        height="8"
        aria-hidden="true"
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
      >
        <line
          x1="0"
          y1="4"
          x2="30"
          y2="4"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={dashed ? '6 4' : undefined}
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  )
}
