// =============================================
// ORG RECORD - what an organisation has already decided
// =============================================
//
// Pure derivation. No Sanity, no model. Every number here is recomputable from
// the primary `position`, `vote` and `ruling` documents, which is the same
// discipline as `recountCitations()` in the v1 ruling engine: derived figures
// are never hand-written and never hand-incremented.
//
// The `orgPolicyRecord` document is a materialised snapshot of this, refreshed
// by a Sanity Function or by POST /api/orgs/refresh. A test asserts snapshot
// equals recomputation so the snapshot can never become a second source of
// truth.

/**
 * Below this many cases an organisation gets "insufficient history" instead of
 * a number. A prediction built on one data point is a rumour.
 */
export const MIN_ORG_HISTORY = 3

export type StanceKey = 'support-A' | 'support-B' | 'custom'

export interface OrgPositionRecord {
  sessionId: string
  clauseId: string
  clauseTitle: string
  category: string
  unit: string
  memberId: string
  value: number
  unitOfMeasure: string
  stance: StanceKey
  confidence: number
  round: string
  /** True when this position revises an earlier one in the same session. */
  isRevision: boolean
  createdAt: string
}

export interface OrgSessionOutcome {
  sessionId: string
  /** The value that carried, or null when the session ended undecided. */
  carriedValue: number | null
  decidedAt?: string | null
}

export interface LegalFloor {
  category: string
  unit: string
  value: number
  basis: string
}

export interface OrgProfile {
  orgId: string
  category: string
  unit: string
  casesCount: number
  positionsCount: number
  votesCount: number
  proposedValues: number[]
  median: number | null
  mean: number | null
  spread: number | null
  stanceMix: Record<StanceKey, number>
  dominantStance: StanceKey | null
  carriedRate: number | null
  avgConfidence: number | null
  revisionRate: number | null
  legalFloorOverrideRate: number | null
  lastDecidedAt: string | null
  recentHoldings: string[]
  insufficientHistory: boolean
}

export function emptyProfile(orgId: string, category = 'all', unit = 'all'): OrgProfile {
  return {
    orgId,
    category,
    unit,
    casesCount: 0,
    positionsCount: 0,
    votesCount: 0,
    proposedValues: [],
    median: null,
    mean: null,
    spread: null,
    stanceMix: { 'support-A': 0, 'support-B': 0, custom: 0 },
    dominantStance: null,
    carriedRate: null,
    avgConfidence: null,
    revisionRate: null,
    legalFloorOverrideRate: null,
    lastDecidedAt: null,
    recentHoldings: [],
    insufficientHistory: true,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function medianOf(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

/** The value an org put forward in each session - its latest word, not its first. */
function latestPerSession(positions: OrgPositionRecord[]): Map<string, OrgPositionRecord> {
  const latest = new Map<string, OrgPositionRecord>()
  for (const p of positions) {
    const current = latest.get(p.sessionId)
    if (!current || p.createdAt >= current.createdAt) latest.set(p.sessionId, p)
  }
  return latest
}

/**
 * Build an organisation's record for one category + unit slice.
 *
 * Only the org's own positions count. Other members' numbers never enter, so
 * the profile stays a statement about what this organisation has argued rather
 * than a description of the council.
 */
export function buildOrgProfile(input: {
  orgId: string
  category?: string
  unit?: string
  positions: OrgPositionRecord[]
  outcomes?: OrgSessionOutcome[]
  votesCount?: number
  floors?: LegalFloor[]
}): OrgProfile {
  const category = input.category ?? 'all'
  const unit = input.unit ?? 'all'

  const positions = input.positions.filter((p) => {
    if (category !== 'all' && p.category !== category) return false
    if (unit !== 'all' && p.unitOfMeasure !== unit) return false
    return Number.isFinite(p.value)
  })

  if (positions.length === 0) return emptyProfile(input.orgId, category, unit)

  const values = positions.map((p) => p.value).sort((a, b) => a - b)
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const median = medianOf(values)
  const spread = Math.max(...values) - Math.min(...values)

  const stanceMix: Record<StanceKey, number> = { 'support-A': 0, 'support-B': 0, custom: 0 }
  for (const p of positions) stanceMix[p.stance] += 1
  const dominantStance = (Object.keys(stanceMix) as StanceKey[]).reduce((best, key) =>
    stanceMix[key] > stanceMix[best] ? key : best,
  'support-A' as StanceKey)

  // Carried rate compares the org's final word per session against the value
  // that carried. Sessions that ended undecided are excluded rather than
  // counted as losses - the council did not decide, so neither did the org.
  const outcomes = input.outcomes ?? []
  const latest = latestPerSession(positions)
  let carried = 0
  let decided = 0
  for (const outcome of outcomes) {
    if (outcome.carriedValue === null) continue
    const orgPosition = latest.get(outcome.sessionId)
    if (!orgPosition) continue
    decided += 1
    if (orgPosition.value === outcome.carriedValue) carried += 1
  }

  const revisions = positions.filter((p) => p.isRevision).length
  const confidenceSum = positions.reduce((sum, p) => sum + p.confidence, 0)

  // A floor states a minimum in a specific unit, so it can only be applied when
  // the profile's unit matches it exactly. On an unscoped aggregate the unit is
  // unknown, and comparing a figure in business_hours against a floor stated in
  // calendar_days would be meaningless - so no floor applies.
  const floors = (input.floors ?? []).filter(
    (f) =>
      unit !== 'all' &&
      f.unit === unit &&
      (category === 'all' || f.category === category)
  )
  const belowFloor = floors.length > 0 ? positions.filter((p) => p.value < floors[0].value).length : 0

  const recentHoldings = [...latest.values()]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 3)
    .map((p) => `${p.clauseTitle || 'a case'}: proposed ${p.value} ${p.unitOfMeasure}`)

  const lastDecidedAt = outcomes
    .map((o) => o.decidedAt ?? '')
    .filter(Boolean)
    .sort()
    .pop() ?? null

  const distinctSessions = new Set(positions.map((p) => p.sessionId)).size

  return {
    orgId: input.orgId,
    category,
    unit,
    casesCount: distinctSessions,
    positionsCount: positions.length,
    votesCount: input.votesCount ?? 0,
    proposedValues: values,
    median: round2(median),
    mean: round2(mean),
    spread: round2(spread),
    stanceMix,
    dominantStance,
    carriedRate: decided > 0 ? round2((carried / decided) * 100) : null,
    avgConfidence: round2(confidenceSum / positions.length),
    revisionRate: round2((revisions / positions.length) * 100),
    legalFloorOverrideRate: floors.length > 0 ? round2((belowFloor / positions.length) * 100) : null,
    lastDecidedAt,
    recentHoldings,
    insufficientHistory: distinctSessions < MIN_ORG_HISTORY,
  }
}

/**
 * Turn a profile into the `orgPolicyRecord` fields, so the snapshot and the
 * recomputation are byte-comparable in a test.
 */
export function toRecordSnapshot(profile: OrgProfile): Record<string, unknown> {
  return {
    orgId: profile.orgId,
    category: profile.category,
    unit: profile.unit,
    casesCount: profile.casesCount,
    positionsCount: profile.positionsCount,
    votesCount: profile.votesCount,
    proposedValues: profile.proposedValues,
    median: profile.median,
    spread: profile.spread,
    stanceMix: {
      supportA: profile.stanceMix['support-A'],
      supportB: profile.stanceMix['support-B'],
      custom: profile.stanceMix.custom,
    },
    carriedRate: profile.carriedRate,
    avgConfidence: profile.avgConfidence,
    revisionRate: profile.revisionRate,
    legalFloorOverrideRate: profile.legalFloorOverrideRate,
    lastDecidedAt: profile.lastDecidedAt,
    recentHoldings: profile.recentHoldings,
  }
}
