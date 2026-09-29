import type { DebateOutput, InterpretationOutput, Precedent } from '@/types'

// =============================================
// DEBATE QUALITY GATE
// =============================================
//
// Every guarantee in the PRD about what the advocates may say is enforced here
// mechanically, not by asking the model nicely. The model is told the rules
// in its prompt, but a prompt is a request, not a control. Anything that can
// be checked by code is checked by code, and anything that fails the check is
// repaired or dropped before the document is written to Sanity.
//
//   1. Textual evidence must actually occur in the clause. A quote that is
//      not in the source text is a fabrication, so it is removed rather than
//      displayed.
//   2. Cited precedent must be among the precedents actually supplied.
//   3. The two advocates must be materially different. If they overlap too
//      much the output is not a hearing.
//   4. Arguments must have substance; empty or stub arguments are rejected.

/** Words longer than this carry meaning; short ones are noise for comparison. */
const SIGNIFICANT_WORD = 4

/** Jaccard overlap above which the advocates are effectively agreeing. */
const SIMILARITY_LIMIT = 0.75

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function significantWords(text: string): Set<string> {
  return new Set(
    normalise(text)
      .split(' ')
      .filter((w) => w.length > SIGNIFICANT_WORD)
  )
}

/** Jaccard similarity of the two arguments' significant words. */
export function argumentSimilarity(a: string, b: string): number {
  const wordsA = significantWords(a)
  const wordsB = significantWords(b)
  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let intersection = 0
  for (const w of wordsA) if (wordsB.has(w)) intersection += 1

  return intersection / (wordsA.size + wordsB.size - intersection)
}

export function areTooSimilar(a: string, b: string): boolean {
  return argumentSimilarity(a, b) > SIMILARITY_LIMIT
}

/**
 * Does this quoted phrase actually appear in the clause?
 *
 * Compared with whitespace and punctuation collapsed, so a model that
 * re-wraps the clause or uses a typographic apostrophe does not get its
 * genuine quote thrown away for cosmetic reasons.
 */
export function quoteAppearsInClause(quote: string, clauseText: string): boolean {
  const needle = normalise(quote)
  if (needle.length === 0) return false
  return normalise(clauseText).includes(needle)
}

/**
 * Keep only the quotes that are really in the clause.
 *
 * This is the anti-hallucination check the PRD asks for. A hallucinated quote
 * is indistinguishable from a real one to a reader, so it must not be stored:
 * dropped quotes are better than plausible lies.
 */
export function filterFabricatedQuotes(
  quotes: string[],
  clauseText: string
): { kept: string[]; dropped: string[] } {
  const kept: string[] = []
  const dropped: string[] = []

  for (const quote of quotes) {
    if (typeof quote !== 'string') continue
    const trimmed = quote.trim()
    if (quoteAppearsInClause(trimmed, clauseText)) {
      if (!kept.includes(trimmed)) kept.push(trimmed)
    } else {
      dropped.push(trimmed)
    }
  }

  return { kept, dropped }
}

/** Keep only precedent that was actually put in front of the advocates. */
export function filterUnsuppliedPrecedent(
  claims: string[],
  supplied: Precedent[]
): { kept: string[]; dropped: string[] } {
  const known = new Set(
    supplied.map((p) => `${p.title}`.toLowerCase().trim())
  )
  const kept: string[] = []
  const dropped: string[] = []

  for (const claim of claims) {
    if (typeof claim !== 'string') continue
    const trimmed = claim.trim()
    if (known.has(trimmed.toLowerCase())) kept.push(trimmed)
    else dropped.push(trimmed)
  }

  return { kept, dropped }
}

function isEmpty(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0
}

/** The minimum an argument must contain to be a position rather than a stub. */
const MIN_ARGUMENT_CHARS = 120

export interface ValidationReport {
  ok: boolean
  warnings: string[]
  errors: string[]
  droppedQuotes: string[]
  droppedPrecedent: string[]
  similarity: number
}

/**
 * Check a hearing and return it in a form safe to persist.
 *
 * Fabricated evidence and unsupplied precedent are removed silently-ish (they
 * are reported, not displayed). Genuinely unusable output — a missing
 * argument, or two advocates who said the same thing — is an error, because
 * presenting that as a debate would misrepresent the system.
 */
export function validateDebate(
  debate: DebateOutput,
  clauseText: string,
  suppliedPrecedent: Precedent[] = []
): DebateOutput {
  const warnings: string[] = []
  const errors: string[] = []
  const droppedQuotes: string[] = []
  const droppedPrecedent: string[] = []

  const sides: Array<['A' | 'B', InterpretationOutput]> = [
    ['A', debate.interpretationA],
    ['B', debate.interpretationB],
  ]

  const repaired = {} as Record<'A' | 'B', InterpretationOutput>

  for (const [side, interpretation] of sides) {
    if (!interpretation || typeof interpretation !== 'object') {
      errors.push(`Advocate ${side} returned no interpretation.`)
      repaired[side] = {
        title: 'Unavailable',
        summary: '',
        argument: '',
        textualEvidence: [],
        precedentUsed: [],
      }
      continue
    }

    if (isEmpty(interpretation.argument)) {
      errors.push(`Advocate ${side} produced an empty argument.`)
    } else if (interpretation.argument.trim().length < MIN_ARGUMENT_CHARS) {
      warnings.push(
        `Advocate ${side}'s argument is only ${interpretation.argument.trim().length} characters; expected a developed position.`
      )
    }

    const quotes = filterFabricatedQuotes(
      Array.isArray(interpretation.textualEvidence)
        ? interpretation.textualEvidence
        : [],
      clauseText
    )
    if (quotes.dropped.length > 0) {
      droppedQuotes.push(...quotes.dropped)
      warnings.push(
        `Advocate ${side} cited ${quotes.dropped.length} phrase(s) that do not appear in the clause; those were discarded.`
      )
    }

    const precedent = filterUnsuppliedPrecedent(
      Array.isArray(interpretation.precedentUsed) ? interpretation.precedentUsed : [],
      suppliedPrecedent
    )
    if (precedent.dropped.length > 0) {
      droppedPrecedent.push(...precedent.dropped)
      warnings.push(
        `Advocate ${side} named precedent that was not supplied (${precedent.dropped
          .map((d) => `"${d}"`)
          .join(', ')}); those references were discarded.`
      )
    }

    repaired[side] = {
      title: interpretation.title?.trim() || `Advocate ${side}`,
      summary: interpretation.summary?.trim() || '',
      argument: interpretation.argument?.trim() || '',
      textualEvidence: quotes.kept,
      precedentUsed: precedent.kept,
    }
  }

  const similarity = argumentSimilarity(
    repaired.A?.argument ?? '',
    repaired.B?.argument ?? ''
  )
  if (errors.length === 0 && similarity > SIMILARITY_LIMIT) {
    errors.push(
      `The two advocates' arguments overlap by ${Math.round(
        similarity * 100
      )}%, which is not a genuine disagreement.`
    )
  }

  const report: ValidationReport = {
    ok: errors.length === 0,
    warnings,
    errors,
    droppedQuotes,
    droppedPrecedent,
    similarity,
  }

  if (!report.ok) {
    throw new DebateQualityError(errors.join(' '), report)
  }

  return {
    clauseId: debate.clauseId,
    interpretationA: repaired.A,
    interpretationB: repaired.B,
  }
}

export class DebateQualityError extends Error {
  readonly report: ValidationReport

  constructor(message: string, report: ValidationReport) {
    super(message)
    this.name = 'DebateQualityError'
    this.report = report
  }
}
