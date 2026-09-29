import {
  Precedent,
  PrecedentWithRelevance,
  PrecedentRelevance,
  AmbiguitySignal,
} from '@/types'

// =============================================
// PRECEDENT RELEVANCE ENGINE
// =============================================
//
// Fully deterministic and model-free. This runs on the client for display and
// on the server to decide which precedent enters a debate prompt, so it has to
// be pure and identical in both places — otherwise the badge the judge sees
// would not be the badge the advocates were actually given.
//
// The signal that matters is narrow: did a *flagged* term in this clause get
// settled by a prior human ruling? Anything else is supporting evidence.

export const HIGH_RELEVANCE_THRESHOLD = 70
export const MEDIUM_RELEVANCE_THRESHOLD = 40

/** One settled flagged term is already strong enough to call HIGH. */
const BASE_FLAGGED_TERM_MATCH = 75
const ADDITIONAL_FLAGGED_TERM = 10
const MAX_ADDITIONAL_FLAGGED_TERMS = 2
const CORROBORATING_TERM = 8
const MAX_CORROBORATING_TERMS = 3
const HOLDING_NAMES_TERM = 10

export function computePrecedentRelevance(
  clauseText: string,
  signals: AmbiguitySignal[],
  precedent: Precedent
): PrecedentWithRelevance {
  const clauseTextLower = clauseText.toLowerCase()
  const holdingLower = (precedent.holding || '').toLowerCase()
  const applicableTerms = precedent.applicableTerms || []

  // Signal terms, singularized so "use" and "uses" collapse together.
  const signalTerms = signals.map((s) => normalize(s.term))
  const signalTermSet = new Set(signalTerms)

  const matchedFlaggedTerms: string[] = []
  const corroboratingTerms: string[] = []
  let score = 0

  for (const term of applicableTerms) {
    const normalized = normalize(term)

    if (signalTermSet.has(normalized)) {
      matchedFlaggedTerms.push(term)
      continue
    }

    // The precedent settles a term this clause happens to use, but which the
    // engine did not flag. Real supporting evidence, not a match on its own.
    if (containsTerm(clauseTextLower, normalized)) {
      corroboratingTerms.push(term)
    }
  }

  if (matchedFlaggedTerms.length > 0) {
    score += BASE_FLAGGED_TERM_MATCH
    score += Math.min(matchedFlaggedTerms.length - 1, MAX_ADDITIONAL_FLAGGED_TERMS) * ADDITIONAL_FLAGGED_TERM
  }

  score += Math.min(corroboratingTerms.length, MAX_CORROBORATING_TERMS) * CORROBORATING_TERM

  // A holding that names the flagged term out loud is the clearest signal that
  // the earlier case is about the same word.
  if (matchedFlaggedTerms.some((t) => holdingLower.includes(normalize(t)))) {
    score += HOLDING_NAMES_TERM
  }

  const relevanceScore = Math.max(0, Math.min(score, 100))
  const relevanceLabel: PrecedentRelevance =
    relevanceScore >= HIGH_RELEVANCE_THRESHOLD
      ? 'HIGH'
      : relevanceScore >= MEDIUM_RELEVANCE_THRESHOLD
        ? 'MEDIUM'
        : 'LOW'

  return {
    precedent,
    relevanceScore,
    relevanceLabel,
    matchedTerms: [...matchedFlaggedTerms, ...corroboratingTerms],
  }
}

/**
 * Rank precedent for a clause. Precedent with no term relationship at all is
 * dropped rather than shown as LOW — a badge reading "LOW RELEVANCE" invites a
 * reviewer to wonder why it is on screen at all.
 */
export function rankPrecedents(
  clauseText: string,
  signals: AmbiguitySignal[],
  precedents: Precedent[]
): PrecedentWithRelevance[] {
  return precedents
    .map((p) => computePrecedentRelevance(clauseText, signals, p))
    .filter((p) => p.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
}

/**
 * Precedent a debate is actually allowed to rely on.
 *
 * MEDIUM and above. Below that the precedent is noise: putting it in the
 * prompt invites the model to stretch, which is how a debate starts inventing
 * authority.
 */
export function selectDebatePrecedent(
  clauseText: string,
  signals: AmbiguitySignal[],
  precedents: Precedent[],
  limit = 3
): PrecedentWithRelevance[] {
  return rankPrecedents(clauseText, signals, precedents)
    .filter((p) => p.relevanceScore >= MEDIUM_RELEVANCE_THRESHOLD)
    .slice(0, limit)
}

export function getRelevanceBadgeClass(relevance: PrecedentRelevance): string {
  return `badge badge--${relevance.toLowerCase()}`
}

function normalize(term: string): string {
  const lower = term.trim().toLowerCase()
  if (lower.length <= 3) return lower
  if (lower.endsWith('ies')) return `${lower.slice(0, -3)}y`
  if (lower.endsWith('s') && !lower.endsWith('ss')) return lower.slice(0, -1)
  return lower
}

function containsTerm(haystack: string, normalizedTerm: string): boolean {
  if (normalizedTerm.length < 4) return false
  return new RegExp(`\\b${escapeRegex(normalizedTerm)}`).test(haystack)
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
