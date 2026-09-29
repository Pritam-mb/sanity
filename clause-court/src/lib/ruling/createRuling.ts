import { sanityClient } from '@/lib/sanity/client'
import { generateDissent } from '@/lib/debate/gemini'
import { computePrecedentRelevance } from '@/lib/precedent/relevance'
import { recountCitations } from '@/lib/seed/seed'
import { assertHumanTransition, isWorkflowState } from '@/sanity/workflow'
import {
  CreateRulingInput,
  Ruling,
  Precedent,
  AmbiguitySignal,
  Clause,
  WorkflowTransitionLogEntry,
} from '@/types'

// =============================================
// RULING ENGINE
// =============================================
//
// The only place a human decision becomes content. Everything after this point
// is deterministic: a ruling always produces exactly one precedent, that
// precedent always points back at its clause and ruling, and a new precedent
// inherits the lineage of whatever its clause was argued against.

const ref = (id: string) => ({ _type: 'reference' as const, _ref: id })

export interface CreateRulingResult {
  ruling: Ruling
  precedent: Precedent
  /** Precedent this ruling now inherits from — drives the graph edge. */
  citesPrecedent: string[]
}

/** An advocate's argument as stored, including its validated precedent refs. */
interface StoredInterpretation {
  _id: string
  title: string
  summary: string
  argument: string
  textualEvidence: string[]
  precedentUsed?: string[]
  /** Resolved from `citedPrecedent[]->`; only contains real document ids. */
  citedRefs: string[]
}

export async function createRuling(
  input: CreateRulingInput
): Promise<CreateRulingResult> {
  const {
    clauseId,
    debateId,
    selectedSide,
    selectedInterpretationId,
    customRuling,
    reasoning,
    judgeName,
  } = input

  const clause = (await sanityClient.getDocument(clauseId)) as Clause | null
  if (!clause) {
    throw new Error(`Clause ${clauseId} not found`)
  }
  if (!isWorkflowState(clause.status)) {
    throw new Error(`Clause ${clauseId} has an unknown workflow state`)
  }

  // The advocates' arguments come from the stored debate, not from the request
  // body. A ruling that quotes an argument the court never heard is a fabricated
  // record, so the only source considered is the one already in Sanity.
  const interpretationA = await loadInterpretation(debateId, 'A')
  const interpretationB = await loadInterpretation(debateId, 'B')

  if (!interpretationA || !interpretationB) {
    throw new Error(
      `Debate ${debateId} does not have both advocate arguments recorded; nothing can be ruled on`
    )
  }

  // The human approval gate: a ruling may only be recorded against a clause
  // that is actually in the `debated` state. AI output cannot skip states.
  assertHumanTransition(clause.status, 'ruled')

  const holding = resolveHolding(customRuling, selectedSide, {
    A: interpretationA.summary,
    B: interpretationB.summary,
  })

  // ─── 1. The ruling itself ────────────────────────────────
  const ruling = (await sanityClient.create({
    _type: 'ruling',
    clause: ref(clauseId),
    debate: ref(debateId),
    chosenInterpretation: selectedInterpretationId
      ? ref(selectedInterpretationId)
      : null,
    customRuling: customRuling?.trim() || null,
    reasoning: reasoning?.trim() || null,
    judgeName: judgeName.trim(),
  })) as Ruling

  // ─── 2. Dissent, from the advocate who lost ──────────────
  await attachDissent(ruling._id, {
    clauseText: clause.text,
    holding,
    selectedSide,
    interpretationA,
    interpretationB,
  })

  // ─── 3. The precedent this ruling becomes ────────────────
  const signals = (clause.ambiguitySignals ?? []) as AmbiguitySignal[]
  const applicableTerms = extractApplicableTerms(clause.text, signals)
  const citesPrecedent = await resolveCitedPrecedent(clauseId, [
    interpretationA,
    interpretationB,
  ])

  const precedent = (await sanityClient.create({
    _type: 'precedent',
    ruling: ref(ruling._id),
    sourceClause: ref(clauseId),
    title: buildPrecedentTitle(clause, applicableTerms),
    holding,
    reasoning: reasoning?.trim() || holding,
    applicableTerms,
    // The lineage edge. Without this the precedent list is a flat archive
    // rather than a chain of reasoning.
    citesPrecedent: citesPrecedent.map(ref),
    // Relevance is measured against the clause that created it, so the card
    // shows how closely the ruling actually answered the flagged text.
    relevanceScore: computePrecedentRelevance(clause.text, signals, {
      applicableTerms,
    } as Precedent).relevanceScore,
    citationCount: 0,
  })) as Precedent

  // ─── 4. Backfill the pointer and move the clause to `ruled` ──
  // `ruled`, never `resolved` — closing the case is a separate human act.
  await sanityClient
    .patch(ruling._id)
    .set({ precedentId: precedent._id })
    .commit()

  const rulingLogEntry: WorkflowTransitionLogEntry = {
    _key: `tl-ruled-${Date.now()}`,
    from: 'debated',
    to: 'ruled',
    actor: `Judge ${judgeName}`,
    actorType: 'human',
    timestamp: new Date().toISOString(),
    note: customRuling?.trim() || `Ruling issued. Precedent created: "${buildPrecedentTitle(clause, applicableTerms)}"`,
  }

  await sanityClient
    .patch(clauseId)
    .set({
      status: 'ruled',
      currentRuling: ref(ruling._id),
    })
    .setIfMissing({ transitionLog: [] })
    .append('transitionLog', [rulingLogEntry])
    .commit()

  // ─── 5. Recount citations from the graph, not from a counter ──
  await recountCitations()

  const updated = (await sanityClient.getDocument(ruling._id)) as Ruling
  return { ruling: updated, precedent, citesPrecedent }
}

async function attachDissent(
  rulingId: string,
  context: {
    clauseText: string
    holding: string
    selectedSide?: 'A' | 'B' | null
    interpretationA?: { argument?: string }
    interpretationB?: { argument?: string }
  }
): Promise<void> {
  // A custom ruling is not either advocate's reading, so both sides can feel
  // they lost. Naming the side that argued closest to the outcome keeps the
  // dissent attributable.
  const losingAdvocate: 'A' | 'B' =
    context.selectedSide === 'A' ? 'B' : context.selectedSide === 'B' ? 'A' : 'B'

  const losingArgument =
    losingAdvocate === 'A'
      ? context.interpretationA?.argument
      : context.interpretationB?.argument

  if (!losingArgument) {
    await sanityClient
      .patch(rulingId)
      .set({
        dissentAdvocate: losingAdvocate,
        clauseRevisionSuggested: false,
      })
      .commit()
    return
  }

  try {
    const dissent = await generateDissent(
      context.clauseText,
      context.holding,
      losingAdvocate,
      losingArgument
    )

    await sanityClient
      .patch(rulingId)
      .set({
        dissent: dissent.dissent,
        dissentAdvocate: dissent.losingAdvocate ?? losingAdvocate,
        clauseRevisionSuggested: dissent.clauseRevisionSuggested,
        suggestedRevision: dissent.suggestedRevision ?? null,
      })
      .commit()
  } catch (error) {
    // A ruling is valid without a dissent. Losing the minority opinion must
    // never cost the majority its holding, so this degrades quietly and the
    // UI omits the dissent block rather than showing a placeholder.
    console.error('Dissent generation failed:', error)
    await sanityClient
      .patch(rulingId)
      .set({ dissentAdvocate: losingAdvocate })
      .commit()
  }
}

/**
 * Read one advocate's recorded argument back out of the stored debate.
 *
 * Returning the document rather than a projection means the ruling carries the
 * exact words that were persisted, and the `citedPrecedent` references the
 * debate route already validated — no re-deriving, no re-matching.
 */
async function loadInterpretation(
  debateId: string,
  side: 'A' | 'B'
): Promise<StoredInterpretation | null> {
  if (!debateId) return null

  const row = await sanityClient.fetch<{
    interpretationA: StoredInterpretation | null
    interpretationB: StoredInterpretation | null
  } | null>(
    `*[_type == "debate" && _id == $debateId][0]{
      "interpretationA": interpretationA->{_id, title, summary, argument, textualEvidence, precedentUsed, "citedRefs": citedPrecedent[]->_ref},
      "interpretationB": interpretationB->{_id, title, summary, argument, textualEvidence, precedentUsed, "citedRefs": citedPrecedent[]->_ref}
    }`,
    { debateId }
  ).catch(() => null)

  if (!row) return null
  const interpretation = side === 'A' ? row.interpretationA : row.interpretationB
  return interpretation ?? null
}

/**
 * Which prior rulings this new precedent inherits from.
 *
 * Two sources, both already trustworthy: the clause's own `citedPrecedent`
 * references, and the validated references the advocates actually used. The
 * losing advocate's citation still counts — the lineage describes the case, not
 * who won it.
 */
async function resolveCitedPrecedent(
  clauseId: string,
  interpretations: Array<StoredInterpretation | null>
): Promise<string[]> {
  const clause = await sanityClient.getDocument(clauseId)
  const resolved = new Set<string>(
    ((clause?.citedPrecedent as Array<{ _ref: string }> | undefined) ?? []).map(
      (r) => r._ref
    )
  )

  for (const interpretation of interpretations) {
    for (const id of interpretation?.citedRefs ?? []) {
      if (typeof id === 'string' && id) resolved.add(id)
    }
  }

  return [...resolved]
}

// =============================================
// HUMAN APPROVAL GATE
// =============================================

/**
 * Advance a clause along the state machine on a human's say-so.
 *
 * This is the only function in the codebase permitted to leave `ruled`, and it
 * refuses anything the shared state machine considers automatic. That refusal
 * is the point: there is no code path by which a ruling resolves itself.
 */
export async function advanceClauseWorkflow(
  clauseId: string,
  to: string,
  options?: {
    actor?: string
    note?: string
  }
): Promise<{ from: string; to: string; entry: WorkflowTransitionLogEntry }> {
  const clause = await sanityClient.getDocument(clauseId)
  if (!clause) throw new Error(`Clause ${clauseId} not found`)

  const from = clause.status
  assertHumanTransition(from, to)

  const actor = options?.actor?.trim() || 'Human Reviewer'
  const defaultNote =
    to === 'resolved'
      ? 'Human approval gate: accepted ruling and marked clause resolved.'
      : to === 'published'
        ? 'Final approval: published clause to live institutional repository.'
        : `Approved transition to ${to}.`
  const note = options?.note?.trim() || defaultNote

  const entry: WorkflowTransitionLogEntry = {
    _key: `tl-${to}-${Date.now()}`,
    from,
    to,
    actor,
    actorType: 'human',
    timestamp: new Date().toISOString(),
    note,
  }

  await sanityClient
    .patch(clauseId)
    .set({ status: to })
    .setIfMissing({ transitionLog: [] })
    .append('transitionLog', [entry])
    .commit()

  return { from, to, entry }
}

// =============================================
// HELPERS
// =============================================

function resolveHolding(
  customRuling: string | undefined,
  selectedSide: 'A' | 'B' | null | undefined,
  summaries: { A?: string; B?: string }
): string {
  const custom = customRuling?.trim()
  if (custom) return custom
  if (selectedSide === 'A' && summaries.A) return summaries.A
  if (selectedSide === 'B' && summaries.B) return summaries.B
  throw new Error('A ruling needs either a custom holding or a selected side')
}

/**
 * The retrieval key for future debates: the terms this ruling actually
 * settles. Built from the engine's own signals where available so the key can
 * never drift from what was flagged.
 */
function extractApplicableTerms(
  text: string,
  signals: AmbiguitySignal[]
): string[] {
  const fromSignals = [
    ...new Set(signals.map((s) => s.term.trim().toLowerCase())),
  ].filter((t) => t.length > 2)

  if (fromSignals.length > 0) return fromSignals

  const vague = [
    'reasonable', 'appropriate', 'timely', 'significant', 'substantial',
    'promptly', 'excessive', 'adequate', 'sufficient', 'eligible', 'priority',
  ]
  const lower = text.toLowerCase()
  return vague.filter((term) => lower.includes(term))
}

function buildPrecedentTitle(
  clause: Clause,
  applicableTerms: string[]
): string {
  const term = applicableTerms[0]
  if (!term) return `${clause.title} — Ruling`
  const capitalized = term.charAt(0).toUpperCase() + term.slice(1)
  return `${clause.title.split('—')[0].trim()} — ${capitalized}`
}
