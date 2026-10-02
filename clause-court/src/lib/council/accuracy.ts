// =============================================
// ACCURACY - measuring the suggestion engine against itself
// =============================================
//
// An AI that suggests a number and is never checked is decoration. This module
// computes the panel on /council from adopted positions alone, and it is built
// to be able to look bad: it counts edits, reports the size of those edits, and
// groups the misses by seat and category so a systematic failure is visible
// rather than averaged away.

export type SuggestionOutcome = 'carried' | 'overtaken' | 'abandoned' | 'undecided'

export interface AdoptedSuggestion {
  sessionId: string
  seat: string
  category: string
  orgName: string | null
  /** null when the engine declined to predict (insufficient history). */
  predictedValue: number | null
  adoptedValue: number
  outcome: SuggestionOutcome | null
}

export interface AccuracyGroup {
  kept: number
  edited: number
  keptPct: number | null
}

export interface AccuracyReport {
  /** Suggestions that carried a prediction at all. */
  considered: number
  kept: number
  edited: number
  keptPct: number | null
  medianAbsDelta: number | null
  maxAbsDelta: number | null
  /** Declined predictions - history too thin, no number offered. */
  declined: number
  bySeat: Record<string, AccuracyGroup>
  byCategory: Record<string, AccuracyGroup>
  byOutcome: Record<SuggestionOutcome, number>
  /** Human-readable misses, for the panel body. */
  whereItWasWrong: string[]
}

function medianOf(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function group(): AccuracyGroup {
  return { kept: 0, edited: 0, keptPct: null }
}

function seal(g: AccuracyGroup): AccuracyGroup {
  const total = g.kept + g.edited
  return { ...g, keptPct: total > 0 ? Math.round((g.kept / total) * 100) : null }
}

export function buildAccuracyReport(
  suggestions: AdoptedSuggestion[]
): AccuracyReport {
  const predicted = suggestions.filter((s) => s.predictedValue !== null)
  const declined = suggestions.length - predicted.length

  const bySeat: Record<string, AccuracyGroup> = {}
  const byCategory: Record<string, AccuracyGroup> = {}
  const byOutcome: Record<SuggestionOutcome, number> = {
    carried: 0,
    overtaken: 0,
    abandoned: 0,
    undecided: 0,
  }

  const deltas: number[] = []
  let kept = 0
  let edited = 0

  for (const s of predicted) {
    const delta = s.adoptedValue - (s.predictedValue as number)
    const isKept = delta === 0
    if (isKept) kept += 1
    else {
      edited += 1
      deltas.push(Math.abs(delta))
    }

    const seat = bySeat[s.seat] ?? (bySeat[s.seat] = group())
    if (isKept) seat.kept += 1
    else seat.edited += 1

    const cat = byCategory[s.category] ?? (byCategory[s.category] = group())
    if (isKept) cat.kept += 1
    else cat.edited += 1

    if (s.outcome) byOutcome[s.outcome] += 1
  }

  deltas.sort((a, b) => a - b)

  const whereItWasWrong = predicted
    .filter((s) => s.adoptedValue !== s.predictedValue)
    .sort((a, b) => Math.abs(b.adoptedValue - (b.predictedValue as number)) - Math.abs(a.adoptedValue - (a.predictedValue as number)))
    .slice(0, 3)
    .map((s) => {
      const from = s.predictedValue as number
      const direction = s.adoptedValue > from ? 'raised' : 'lowered'
      return `${s.seat} / ${s.category}: predicted ${from}, ${direction} to ${s.adoptedValue}${
        s.outcome ? ` (${s.outcome})` : ''
      }`
    })

  return {
    considered: predicted.length,
    kept,
    edited,
    keptPct: predicted.length > 0 ? Math.round((kept / predicted.length) * 100) : null,
    medianAbsDelta: deltas.length > 0 ? medianOf(deltas) : null,
    maxAbsDelta: deltas.length > 0 ? deltas[deltas.length - 1] : null,
    declined,
    bySeat: Object.fromEntries(Object.entries(bySeat).map(([k, v]) => [k, seal(v)])),
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, seal(v)])),
    byOutcome,
    whereItWasWrong,
  }
}
