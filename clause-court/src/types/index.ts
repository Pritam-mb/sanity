// =============================================
// CLAUSE COURT — CORE TYPES
// =============================================

export type ClauseStatus =
  | 'draft'
  | 'flagged'
  | 'debated'
  | 'ruled'
  | 'resolved'
  | 'published'

export type AmbiguitySignalType =
  | 'vague_quantifier'
  | 'missing_definition'
  | 'conditional_ambiguity'
  | 'conflicting_reference'

export type AdvocateSide = 'A' | 'B'

export type PrecedentRelevance = 'HIGH' | 'MEDIUM' | 'LOW'

// =============================================
// AMBIGUITY ENGINE TYPES
// =============================================

export interface AmbiguitySignal {
  type: AmbiguitySignalType
  term: string
  position: number
  message: string
  ruleLabel: string
}

export interface AmbiguityReport {
  flagged: boolean
  signals: AmbiguitySignal[]
  analyzedAt: string
}

// =============================================
// SANITY DOCUMENT TYPES
// =============================================

export interface SanityReference {
  _ref: string
  _type: 'reference'
}

export interface SanityDocument {
  _id: string
  _type: string
  _createdAt: string
  _updatedAt: string
  _rev: string
}

export interface Definition extends SanityDocument {
  _type: 'definition'
  term: string
  definition: string
  category?: string
}

export interface Clause extends SanityDocument {
  _type: 'clause'
  title: string
  text: string
  category: string
  status: ClauseStatus
  definitions?: Definition[]
  citedPrecedent?: Precedent[]
  debates?: Debate[]
  currentRuling?: Ruling | null
  caseNumber: string
  ambiguitySignals?: AmbiguitySignal[]
}

export interface Interpretation extends SanityDocument {
  _type: 'interpretation'
  clause: SanityReference
  side: AdvocateSide
  title: string
  summary: string
  argument: string
  textualEvidence: string[]
  citedPrecedent?: SanityReference[]
}

export interface Debate extends SanityDocument {
  _type: 'debate'
  clause: SanityReference
  interpretationA?: Interpretation
  interpretationB?: Interpretation
  status: 'pending' | 'active' | 'completed'
  startedAt?: string
  completedAt?: string
}

export interface Ruling extends SanityDocument {
  _type: 'ruling'
  clause: SanityReference | Clause
  chosenInterpretation?: SanityReference | Interpretation | null
  customRuling?: string
  reasoning?: string
  judgeName: string
  precedentId?: string
  // v1.1 additions
  dissent?: string
  dissentAdvocate?: AdvocateSide
  clauseRevisionSuggested?: boolean
  suggestedRevision?: string
}

export interface Precedent extends SanityDocument {
  _type: 'precedent'
  ruling: SanityReference | Ruling
  sourceClause: SanityReference | Clause
  title: string
  holding: string
  reasoning: string
  applicableTerms: string[]
  citesPrecedent?: SanityReference[] | Precedent[]
  // v1.1 additions
  relevanceScore?: number
  citationCount?: number
}

// =============================================
// DEBATE ENGINE OUTPUT TYPES
// =============================================

export interface InterpretationOutput {
  title: string
  summary: string
  argument: string
  textualEvidence: string[]
  precedentUsed: string[]
}

export interface DebateOutput {
  clauseId: string
  interpretationA: InterpretationOutput
  interpretationB: InterpretationOutput
}

export interface DissentOutput {
  losingAdvocate: AdvocateSide
  dissent: string
  clauseRevisionSuggested: boolean
  suggestedRevision?: string
}

// =============================================
// RULING INPUT TYPE
// =============================================

export interface CreateRulingInput {
  clauseId: string
  judgeName: string
  /**
   * The stored debate being ruled on. The advocates' arguments are read back
   * from Sanity rather than accepted from the request: a ruling's record of
   * what was argued must be the record that was actually written, and a client
   * must not be able to alter history by editing a POST body.
   */
  debateId: string
  selectedSide?: AdvocateSide
  selectedInterpretationId?: string
  customRuling?: string
  reasoning?: string
}

// =============================================
// PRECEDENT RELEVANCE
// =============================================

export interface PrecedentWithRelevance {
  precedent: Precedent
  relevanceScore: number
  relevanceLabel: PrecedentRelevance
  matchedTerms: string[]
}

// =============================================
// DASHBOARD STATS
// =============================================

/** One row of the dashboard's `recentRulings` projection. */
export interface RecentRuling {
  _id: string
  _createdAt: string
  judgeName: string
  customRuling?: string | null
  clause?: { _id: string; title: string; caseNumber?: string } | null
  chosenInterpretation?: { title: string } | null
}

export interface DashboardStats {
  totalClauses: number
  flaggedClauses: number
  activeDebates: number
  totalRulings: number
  totalPrecedents: number
  resolvedClauses: number
  recentRulings: RecentRuling[]
}
