import { AmbiguityReport, AmbiguitySignal, AmbiguitySignalType } from '@/types'

// =============================================
// VAGUE QUANTIFIER RULE — Rule A
// =============================================

const VAGUE_QUANTIFIERS: string[] = [
  'reasonable', 'appropriate', 'timely', 'significant', 'substantial',
  'promptly', 'frequently', 'generally', 'adequate', 'sufficient',
  'satisfactory', 'excessive', 'material', 'necessary', 'proper',
  'suitable', 'sufficient', 'undue', 'unreasonable',
]

const CONDITIONAL_AMBIGUITY_PHRASES: string[] = [
  'when appropriate',
  'as necessary',
  'where possible',
  'at the company\'s discretion',
  'at our discretion',
  'subject to availability',
  'as needed',
  'from time to time',
  'as determined',
  'as applicable',
]

// =============================================
// RULE B HELPERS
// =============================================

/**
 * The engine only needs the defined term, never the whole document, so any
 * `{ term }` shape works. Keeps the detector free of Sanity types and
 * callable from the seeder before documents exist.
 */
export interface DefinedTerm {
  term: string
}

/**
 * Build the set of "head words" that a linked definition document covers.
 * A definition of "Eligible User" supplies the head word "eligible", so a
 * clause using "Eligible" or "Eligible Users" counts as defined.
 */
function buildDefinedHeadSet(definitions: DefinedTerm[]): Set<string> {
  const heads = new Set<string>()
  for (const def of definitions) {
    const term = def.term?.trim()
    if (!term) continue
    const [head] = term.toLowerCase().split(/\s+/)
    if (head) heads.add(head)
    heads.add(singularize(term.toLowerCase()))
  }
  return heads
}

/** Crude but predictable singularization for plural nouns used in policy text. */
function singularize(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

// =============================================
// MAIN DETECTION FUNCTION
// =============================================

export function detectAmbiguity(
  clauseText: string,
  definitions: DefinedTerm[] = []
): AmbiguityReport {
  const signals: AmbiguitySignal[] = []
  const textLower = clauseText.toLowerCase()
  const definedHeads = buildDefinedHeadSet(definitions)

  // ─── Rule A: Vague Quantifiers ─────────────────────────
  for (const term of VAGUE_QUANTIFIERS) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi')
    let match: RegExpExecArray | null

    while ((match = regex.exec(clauseText)) !== null) {
      // A vague word is forgiven if a definition document pins it down.
      if (definedHeads.has(singularize(term))) continue

      signals.push({
        type: 'vague_quantifier' as AmbiguitySignalType,
        term: match[0],
        position: match.index,
        message: `The term "${match[0]}" has no structured threshold or defined limit. It can be interpreted differently by different parties.`,
        ruleLabel: 'Vague Quantifier (Rule A)',
      })
    }
  }

  // ─── Rule B: Missing Definition ────────────────────────
  // Look for capitalized domain terms that imply a defined concept
  const definedTermsInClause = clauseText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []

  for (const term of definedTermsInClause) {
    const normalized = term.toLowerCase()
    // Skip common sentence-start words
    if (['the', 'this', 'that', 'these', 'those', 'a', 'an', 'in', 'on', 'at', 'for', 'by', 'to', 'of', 'if', 'when', 'where'].includes(normalized)) continue
    if (normalized.length < 4) continue

    // A term counts as defined when a definition document exists whose
    // head word matches. Matching on the head word lets a definition of
    // "Eligible User" cover the clause token "Eligible", and a definition of
    // "Business Day" cover the plural "Business Days" used mid-sentence.
    if (definedHeads.has(singularize(normalized))) continue

    const isDefinitionTerm = [
      'eligible', 'priority', 'active', 'approved', 'authorized', 'qualified',
      'enterprise', 'premium', 'standard', 'commercial', 'professional',
    ].some((k) => normalized.includes(k))

    if (!isDefinitionTerm) continue

    // The same term recurring in one clause is a single unresolved concept,
    // so report the first occurrence only.
    if (signals.some((s) => s.type === 'missing_definition' && s.term === term)) continue

    const position = clauseText.toLowerCase().indexOf(normalized)
    signals.push({
      type: 'missing_definition' as AmbiguitySignalType,
      term: term,
      position,
      message: `The term "${term}" is used without a corresponding definition document. Different parties may interpret its criteria differently.`,
      ruleLabel: 'Missing Definition (Rule B)',
    })
  }

  // ─── Rule D: Conditional Ambiguity ─────────────────────
  for (const phrase of CONDITIONAL_AMBIGUITY_PHRASES) {
    const idx = textLower.indexOf(phrase.toLowerCase())
    if (idx !== -1) {
      signals.push({
        type: 'conditional_ambiguity' as AmbiguitySignalType,
        term: phrase,
        position: idx,
        message: `The phrase "${phrase}" grants discretionary power without defining conditions or criteria. This creates ambiguity in enforcement.`,
        ruleLabel: 'Conditional Ambiguity (Rule D)',
      })
    }
  }

  // Deduplicate by term+position
  const unique = signals.filter(
    (sig, idx, arr) =>
      idx === arr.findIndex((s) => s.term === sig.term && s.position === sig.position)
  )

  return {
    flagged: unique.length > 0,
    signals: unique,
    analyzedAt: new Date().toISOString(),
  }
}

// =============================================
// SIGNAL TYPE LABELS
// =============================================

export function getSignalTypeLabel(type: AmbiguitySignalType): string {
  const labels: Record<AmbiguitySignalType, string> = {
    vague_quantifier: 'Vague Quantifier',
    missing_definition: 'Missing Definition',
    conditional_ambiguity: 'Conditional Ambiguity',
    conflicting_reference: 'Conflicting Reference',
  }
  return labels[type] || type
}

export function getSignalTypeColor(type: AmbiguitySignalType): string {
  const colors: Record<AmbiguitySignalType, string> = {
    vague_quantifier: 'var(--danger)',
    missing_definition: 'var(--warning)',
    conditional_ambiguity: 'var(--info)',
    conflicting_reference: 'var(--advocate-b)',
  }
  return colors[type] || 'var(--text-muted)'
}

// =============================================
// HIGHLIGHT FLAGGED TERMS IN TEXT
// =============================================

export function highlightAmbiguousTerms(
  text: string,
  signals: AmbiguitySignal[]
): string {
  let highlighted = text
  const sortedSignals = [...signals].sort((a, b) => b.position - a.position)

  for (const signal of sortedSignals) {
    const regex = new RegExp(`\\b${escapeRegex(signal.term)}\\b`, 'gi')
    highlighted = highlighted.replace(
      regex,
      `<mark class="ambiguous-term" data-type="${signal.type}" title="${signal.message}">$&</mark>`
    )
  }

  return highlighted
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
