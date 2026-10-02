// =============================================
// PREDICT - a position suggested from the org's own record
// =============================================
//
// Deterministic. No model. Roughly forty lines of arithmetic, because the moment
// a number that a human will argue about comes out of an LLM, the product's
// central claim is already broken. The model writes the *prose* in
// `src/lib/debate/suggest.ts`; this file produces the number, the confidence
// and the evidence lines a member is allowed to see before deciding anything.
//
// Nothing here can submit a position. A prediction is an offer.

import { MIN_ORG_HISTORY, type OrgProfile } from './orgRecord.ts'

/**
 * Evidence weight borrowed from the council median. With k = 2, one org case
 * moves the result a quarter of the way; nine cases dominate. Without shrinkage
 * a single outlier becomes the organisation's "record".
 */
export const SHRINKAGE_K = 2

export type PredictionBasis = 'org-history' | 'insufficient-history'

export interface SimilarCase {
  clauseId: string
  clauseTitle: string
  value: number
  unit: string
  sessionId: string
}

export interface Prediction {
  /** null when there is not enough history to predict from. Never a guess. */
  predictedValue: number | null
  predictedStance: 'support-A' | 'support-B' | 'custom'
  confidence: 1 | 2 | 3 | 4 | 5
  basis: PredictionBasis
  /** Plain-language reasons, printed next to the number. */
  evidence: string[]
  similarCases: SimilarCase[]
  /** True when a legal floor moved the number upward. */
  clampedToFloor: boolean
}

export interface LegalFloorInput {
  value: number
  unit: string
  basis: string
}

function clampConfidence(n: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(n))) as 1 | 2 | 3 | 4 | 5
}

/**
 * Predict what a member will propose, from their organisation's record in the
 * same category and unit.
 *
 * The method:
 *   1. take the org's historical values for this slice
 *   2. shrink the org median toward the council median by evidence weight
 *   3. clamp up to any applicable legal floor
 *   4. scale confidence with sample size, carried rate and revision rate
 *   5. return null - not a guess - when the record is too thin
 *
 * Confidence falls when the org revises a lot. A member who changes their mind
 * after every reveal is genuinely harder to predict, and saying so is more
 * useful than a confident wrong number.
 */
export function predictPosition(input: {
  profile: OrgProfile
  /** Median of every value on the table, from `summarizePositions()`. */
  councilMedian: number | null
  legalFloor?: LegalFloorInput | null
  similarCases?: SimilarCase[]
}): Prediction {
  const { profile, councilMedian, legalFloor } = input
  const similarCases = input.similarCases ?? []

  if (profile.casesCount < MIN_ORG_HISTORY || profile.median === null) {
    return {
      predictedValue: null,
      predictedStance: profile.dominantStance ?? 'custom',
      confidence: 1,
      basis: 'insufficient-history',
      evidence: [
        `${profile.casesCount} case(s) on record for this organisation - ${MIN_ORG_HISTORY} are needed before a suggestion is offered.`,
      ],
      similarCases,
      clampedToFloor: false,
    }
  }

  const orgMedian = profile.median
  const fallback = councilMedian ?? orgMedian
  const n = profile.casesCount

  // Shrinkage toward the council median.
  const shrunk = (n * orgMedian + SHRINKAGE_K * fallback) / (n + SHRINKAGE_K)

  const evidence: string[] = [
    `Org median ${orgMedian} ${profile.unit} over ${n} case(s) in ${profile.category}.`,
    `Shrunk toward the council median of ${fallback} (weight ${n}:${SHRINKAGE_K}).`,
  ]

  let predictedValue = shrunk
  let clampedToFloor = false
  if (legalFloor && predictedValue < legalFloor.value) {
    predictedValue = legalFloor.value
    clampedToFloor = true
    evidence.push(
      `Raised to the legal floor of ${legalFloor.value} ${legalFloor.unit} (${legalFloor.basis}).`
    )
  }

  if (profile.carriedRate !== null) {
    evidence.push(`Its pick carried in ${profile.carriedRate}% of decided sessions.`)
  }
  if (profile.revisionRate !== null && profile.revisionRate > 0) {
    evidence.push(`It revised ${profile.revisionRate}% of its positions after reveal.`)
  }

  let confidence = 1 + n / 2
  if (profile.carriedRate !== null) confidence += profile.carriedRate / 100
  if (profile.revisionRate !== null) confidence -= profile.revisionRate / 100
  if (profile.avgConfidence !== null) confidence += (profile.avgConfidence - 3) / 4

  const rounded = Math.round(predictedValue * 100) / 100

  return {
    predictedValue: rounded,
    predictedStance: profile.dominantStance ?? 'custom',
    confidence: clampConfidence(confidence),
    basis: 'org-history',
    evidence,
    similarCases,
    clampedToFloor,
  }
}

/**
 * Whether an adopted position kept the prediction.
 *
 * `edited` is derived, never asserted by the client: a member cannot claim they
 * left the suggestion alone when they did not, and the accuracy panel on
 * /council reads this rather than anything the UI reports.
 */
export function adoptionOutcome(input: {
  predictedValue: number | null
  adoptedValue: number
}): { edited: boolean; delta: number | null } {
  if (input.predictedValue === null) return { edited: false, delta: null }
  return { edited: input.adoptedValue !== input.predictedValue, delta: input.adoptedValue - input.predictedValue }
}
