// =============================================
// CASE TREE - the whole history of one case as a graph
// =============================================
//
// The site-wide `/graph` answers "how do rulings connect across the
// institution". This answers "what happened to *this* file": who proposed what,
// in which round, what it was revised into, what it clustered into, who voted,
// what it decided, and where the resulting precedent is now being cited.
//
// Every edge is derived from a stored reference. None is inferred from prose,
// which is the same rule that keeps `ambiguitySignals` out of the model's
// hands: the graph is a record, not an interpretation.
//
// Blind-round integrity: a blind position is present as a node but withheld
// from anyone but its author and the chair. The tree shows that a position
// exists without leaking what it says.

export type CaseNodeKind =
  | 'clause'
  | 'session'
  | 'advocate'
  | 'position'
  | 'comment'
  | 'option'
  | 'vote'
  | 'ruling'
  | 'approval'
  | 'precedent'
  | 'citingClause'

export type CaseEdgeKind =
  | 'opened'
  | 'briefed-by'
  | 'submitted'
  | 'revises'
  | 'responds-to'
  | 'clusters-into'
  | 'voted-by'
  | 'decided-by'
  | 'created'
  | 'cited-by'

export interface CaseNode {
  id: string
  kind: CaseNodeKind
  label: string
  sublabel?: string
  /** A blind position withheld from this viewer. Carries no value. */
  withheld?: boolean
  lane: number
}

export interface CaseEdge {
  id: string
  source: string
  target: string
  kind: CaseEdgeKind
  label?: string
}

export interface CaseTree {
  nodes: CaseNode[]
  edges: CaseEdge[]
  withheldCount: number
}

export interface TreePosition {
  _id: string
  memberId: string
  memberName: string
  memberSeat: string
  stance: string
  proposedValue: number
  unit: string
  confidence: number
  round: string
  respondsToId?: string | null
  revisionOfId?: string | null
  assistedBy?: string | null
  edited?: boolean
  _createdAt: string
}

export interface TreeBundle {
  session: {
    _id: string
    status: string
    round: string | null
    chairId?: string | null
    clause: { _id: string; title: string; caseNumber: string; submittedBy?: string | null }
  }
  positions: TreePosition[]
  comments: Array<{
    _id: string
    authorId: string
    authorName: string
    kind: string
    body: string
    targetPositionId: string | null
  }>
  options: Array<{ _id: string; title: string; value: number | null; source: string }>
  votes: Array<{ memberId: string; memberName: string; seat: string; optionId: string }>
  approvals: Array<{ _id: string; approverId: string; approverName: string }>
  advocates: Array<{ _id: string; side: string; title: string; summary?: string | null }>
  ruling?: { _id: string; holding: string; judgeName?: string | null; voteSummary?: string | null } | null
  precedent?: { _id: string; title: string; holding: string; citationCount?: number } | null
  citingClauses?: Array<{ _id: string; title: string; caseNumber?: string | null }>
}

/** Left-to-right lanes. Positions and options share a lane by design: options are made of positions. */
export const LANES: Record<CaseNodeKind, number> = {
  clause: 0,
  session: 1,
  advocate: 2,
  position: 3,
  comment: 3,
  option: 4,
  vote: 5,
  ruling: 6,
  approval: 6,
  precedent: 7,
  citingClause: 8,
}

export interface BuildTreeInput {
  bundle: TreeBundle
  viewerMemberId: string | null
  /** Positions the viewer may not see, by id. Supplied by the caller. */
  hiddenPositionIds?: string[]
}

export function buildCaseTree(input: BuildTreeInput): CaseTree {
  const { bundle } = input
  const hidden = new Set(input.hiddenPositionIds ?? [])
  const nodes: CaseNode[] = []
  const edges: CaseEdge[] = []

  const add = (node: CaseNode) => {
    if (!nodes.some((n) => n.id === node.id)) nodes.push(node)
  }
  const link = (
    source: string,
    target: string,
    kind: CaseEdgeKind,
    label?: string
  ) => {
    edges.push({
      id: `e-${kind}-${source}-${target}`,
      source,
      target,
      kind,
      ...(label ? { label } : {}),
    })
  }

  const clauseId = `clause:${bundle.session.clause._id}`
  const sessionId = `session:${bundle.session._id}`

  add({
    id: clauseId,
    kind: 'clause',
    label: bundle.session.clause.title,
    sublabel: bundle.session.clause.caseNumber ?? 'clause',
    lane: LANES.clause,
  })
  add({
    id: sessionId,
    kind: 'session',
    label: `Session - ${bundle.session.status}`,
    sublabel: bundle.session.round ? `round: ${bundle.session.round}` : undefined,
    lane: LANES.session,
  })
  link(clauseId, sessionId, 'opened')

  for (const a of bundle.advocates) {
    const id = `advocate:${a._id}`
    add({
      id,
      kind: 'advocate',
      label: `Advocate ${a.side}`,
      sublabel: a.title,
      lane: LANES.advocate,
    })
    link(sessionId, id, 'briefed-by')
  }

  // Positions, with revision and response edges. A withheld node keeps its
  // shape - so the viewer sees a position exists - but carries no value.
  for (const p of bundle.positions) {
    const id = `position:${p._id}`
    const isHidden = hidden.has(p._id)
    add({
      id,
      kind: 'position',
      label: isHidden
        ? 'Position withheld'
        : `${p.memberName} - ${p.proposedValue} ${p.unit}`,
      sublabel: isHidden
        ? `blind round - ${p.round}`
        : `${p.memberSeat} - ${p.round} - confidence ${p.confidence}/5`,
      ...(isHidden ? { withheld: true } : {}),
      lane: LANES.position,
    })
    link(sessionId, id, 'submitted', p.round === 'blind' ? 'blind' : 'open')

    if (p.revisionOfId) link(id, `position:${p.revisionOfId}`, 'revises')
    if (p.respondsToId) link(id, `position:${p.respondsToId}`, 'responds-to')
    if (p.assistedBy === 'ai-suggested') {
      link(
        id,
        `advocate:${bundle.session._id}:ai`,
        'responds-to',
        p.edited ? 'edited suggestion' : 'adopted suggestion'
      )
      if (!nodes.some((n) => n.id === `advocate:${bundle.session._id}:ai`)) {
        add({
          id: `advocate:${bundle.session._id}:ai`,
          kind: 'advocate',
          label: 'AI suggestion',
          sublabel: p.edited ? 'edited by member' : 'adopted as filed',
          lane: LANES.advocate,
        })
      }
    }
  }

  for (const c of bundle.comments) {
    const id = `comment:${c._id}`
    add({
      id,
      kind: 'comment',
      label: `${c.authorName} - ${c.kind}`,
      sublabel: c.body.slice(0, 80),
      lane: LANES.comment,
    })
    link(sessionId, id, 'submitted', c.kind)
    if (c.targetPositionId) link(id, `position:${c.targetPositionId}`, 'responds-to', c.kind)
  }

  for (const o of bundle.options) {
    const id = `option:${o._id}`
    add({
      id,
      kind: 'option',
      label: o.title,
      sublabel: `${o.value ?? '-'} - ${o.source === 'ai' ? 'AI-drafted' : 'member-drafted'}`,
      lane: LANES.option,
    })
    // Options are made from the positions that cluster into them. The stored
    // record is the values, so the edge is drawn where the numbers agree.
    // A withheld position contributes no edge: the existence of a value-match
    // edge is itself a disclosure of the value being withheld.
    for (const p of bundle.positions) {
      if (hidden.has(p._id)) continue
      if (o.value !== null && p.proposedValue === o.value) {
        link(`position:${p._id}`, id, 'clusters-into')
      }
    }
  }

  for (const v of bundle.votes) {
    const id = `vote:${v.memberId}:${v.optionId}`
    add({
      id,
      kind: 'vote',
      label: `${v.memberName} votes`,
      sublabel: v.seat,
      lane: LANES.vote,
    })
    link(id, `option:${v.optionId}`, 'voted-by')
  }

  if (bundle.ruling) {
    const id = `ruling:${bundle.ruling._id}`
    add({
      id,
      kind: 'ruling',
      label: 'Ruling',
      sublabel: bundle.ruling.holding,
      lane: LANES.ruling,
    })
    link(id, sessionId, 'decided-by')
  }

  for (const a of bundle.approvals) {
    const id = `approval:${a._id}`
    add({ id, kind: 'approval', label: `${a.approverName} approved`, lane: LANES.approval })
    link(id, sessionId, 'decided-by', 'approved')
  }

  if (bundle.precedent && bundle.ruling) {
    const id = `precedent:${bundle.precedent._id}`
    add({
      id,
      kind: 'precedent',
      label: bundle.precedent.title,
      sublabel: `cited by ${bundle.precedent.citationCount ?? 0}`,
      lane: LANES.precedent,
    })
    link(`ruling:${bundle.ruling._id}`, id, 'created')

    for (const c of bundle.citingClauses ?? []) {
      const cid = `clause:${c._id}`
      add({
        id: cid,
        kind: 'citingClause',
        label: c.title,
        sublabel: c.caseNumber ?? 'clause',
        lane: LANES.citingClause,
      })
      link(id, cid, 'cited-by')
    }
  }

  // No orphan edges: an edge whose endpoint was never added is a bug, not a
  // rendering detail. Dropping them here keeps the graph honest.
  const known = new Set(nodes.map((n) => n.id))
  const cleanEdges = edges.filter((e) => known.has(e.source) && known.has(e.target))

  return {
    nodes,
    edges: cleanEdges,
    withheldCount: nodes.filter((n) => n.withheld).length,
  }
}

export function edgeKindsPresent(tree: CaseTree): CaseEdgeKind[] {
  const set = new Set(tree.edges.map((e) => e.kind))
  return [...set]
}
