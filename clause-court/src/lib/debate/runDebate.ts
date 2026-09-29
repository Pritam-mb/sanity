import { sanityClient } from '@/lib/sanity/client'
import { getPrecedentForDebate } from '@/lib/precedent/findRelevant'
import { generateDebate, generateInterpretationStream } from './gemini'
import { validateDebate } from './quality'
import type {
  AmbiguitySignal,
  PrecedentWithRelevance,
  InterpretationOutput,
} from '@/types'

// =============================================
// DEBATE ORCHESTRATION
// =============================================
//
// One implementation of "hold a hearing", used by both the streaming and the
// non-streaming route. The streaming variant only changes how tokens reach the
// browser — the retrieval, validation and persistence steps are identical, so
// the two paths can never produce different results.

const ref = (id: string) => ({ _type: 'reference' as const, _ref: id })

export interface DebateRunResult {
  debateId: string
  interpretationAId: string
  interpretationBId: string
  interpretationA: InterpretationOutput
  interpretationB: InterpretationOutput
  citedPrecedentIds: string[]
  relevantPrecedents: Array<{
    _id: string
    title: string
    holding: string
    applicableTerms: string[]
    relevanceScore: number
    relevanceLabel: 'HIGH' | 'MEDIUM' | 'LOW'
    matchedTerms: string[]
  }>
}

/**
 * Map the advocates' free-text `precedentUsed` claims back to real document IDs.
 *
 * The advocates are told to name precedent, but a name is not a reference. A
 * claim only counts if it matches precedent actually supplied in the prompt,
 * and we do the matching ourselves. This is the mechanical guarantee behind
 * "the model must not invent precedent": a hallucinated title is dropped rather
 * than stored, so nothing fabricated can enter the reference graph.
 */
export function resolveCitedPrecedentIds(
  claimed: unknown,
  supplied: PrecedentWithRelevance[]
): string[] {
  const ids: string[] = []
  const claims = Array.isArray(claimed) ? claimed : []

  for (const claim of claims) {
    if (typeof claim !== 'string') continue
    const needle = claim.trim().toLowerCase()
    if (!needle) continue

    const match = supplied.find(({ precedent }) => {
      const title = (precedent.title || '').toLowerCase()
      const holding = (precedent.holding || '').toLowerCase()
      return (
        title === needle ||
        holding === needle ||
        (title.length > 3 && (title.includes(needle) || needle.includes(title))) ||
        (holding.length > 3 && (holding.includes(needle) || needle.includes(holding)))
      )
    })

    if (match && !ids.includes(match.precedent._id)) {
      ids.push(match.precedent._id)
    }
  }

  return ids
}

/** Store the hearing: two interpretations, one debate, one status change. */
async function persistDebate(
  clauseId: string,
  debate: { interpretationA: InterpretationOutput; interpretationB: InterpretationOutput },
  citedByA: string[],
  citedByB: string[]
): Promise<{ debateId: string; interpretationAId: string; interpretationBId: string }> {
  const interpA = await sanityClient.create({
    _type: 'interpretation',
    clause: ref(clauseId),
    side: 'A',
    title: debate.interpretationA.title,
    summary: debate.interpretationA.summary,
    argument: debate.interpretationA.argument,
    textualEvidence: debate.interpretationA.textualEvidence,
    citedPrecedent: citedByA.map(ref),
  })

  const interpB = await sanityClient.create({
    _type: 'interpretation',
    clause: ref(clauseId),
    side: 'B',
    title: debate.interpretationB.title,
    summary: debate.interpretationB.summary,
    argument: debate.interpretationB.argument,
    textualEvidence: debate.interpretationB.textualEvidence,
    citedPrecedent: citedByB.map(ref),
  })

  const startedAt = new Date().toISOString()
  const debateDoc = await sanityClient.create({
    _type: 'debate',
    clause: ref(clauseId),
    interpretationA: ref(interpA._id),
    interpretationB: ref(interpB._id),
    status: 'completed',
    startedAt,
    completedAt: new Date().toISOString(),
  })

  // Keep the reverse edge so the reference graph is navigable both ways.
  const clauseDoc = await sanityClient.getDocument(clauseId)
  const existingDebates: Array<{ _ref: string }> =
    (clauseDoc?.debates as Array<{ _ref: string }> | undefined) ?? []

  await sanityClient
    .patch(clauseId)
    .set({
      status: 'debated',
      debates: existingDebates.some((d) => d._ref === debateDoc._id)
        ? existingDebates
        : [...existingDebates, ref(debateDoc._id)],
    })
    .commit()

  return {
    debateId: debateDoc._id,
    interpretationAId: interpA._id,
    interpretationBId: interpB._id,
  }
}

function summarise(
  ranked: PrecedentWithRelevance[]
): DebateRunResult['relevantPrecedents'] {
  return ranked.map(
    ({ precedent, relevanceScore, relevanceLabel, matchedTerms }) => ({
      _id: precedent._id,
      title: precedent.title,
      holding: precedent.holding,
      applicableTerms: precedent.applicableTerms ?? [],
      relevanceScore,
      relevanceLabel,
      matchedTerms,
    })
  )
}

/**
 * Decide what precedent the advocates are allowed to see, hold the hearing,
 * check the quality bar, and store the result. Used by both routes.
 */
export async function runDebate(
  clauseId: string,
  clauseText: string,
  signals: AmbiguitySignal[]
): Promise<DebateRunResult> {
  const supplied = await getPrecedentForDebate(clauseId, clauseText, signals)
  const precedentForPrompt = supplied.map((p) => p.precedent)

  const debate = await generateDebate(
    clauseId,
    clauseText,
    signals,
    precedentForPrompt
  )
  const validated = validateDebate(debate, clauseText, precedentForPrompt)

  const citedByA = resolveCitedPrecedentIds(
    validated.interpretationA.precedentUsed,
    supplied
  )
  const citedByB = resolveCitedPrecedentIds(
    validated.interpretationB.precedentUsed,
    supplied
  )

  const ids = await persistDebate(
    clauseId,
    validated,
    citedByA,
    citedByB
  )

  const touched = [...new Set([...citedByA, ...citedByB])]
  if (touched.length > 0) {
    await refreshPrecedentStats(touched, supplied)
  }

  return {
    ...ids,
    interpretationA: validated.interpretationA,
    interpretationB: validated.interpretationB,
    citedPrecedentIds: touched,
    relevantPrecedents: summarise(supplied),
  }
}

/**
 * Streaming variant. Tokens are handed to `onToken` as they arrive so the
 * browser can type them out live; the hearing itself is identical to
 * `runDebate`.
 */
export async function runDebateStreaming(
  clauseId: string,
  clauseText: string,
  signals: AmbiguitySignal[],
  onToken: (side: 'A' | 'B', token: string) => void
): Promise<DebateRunResult> {
  const supplied = await getPrecedentForDebate(clauseId, clauseText, signals)
  const precedentForPrompt = supplied.map((p) => p.precedent)

  // Advocate A presents first; Advocate B is given A's finished argument so it
  // can genuinely respond rather than guess at the opposition.
  const rawA = await generateInterpretationStream(
    'A',
    clauseText,
    signals,
    precedentForPrompt,
    (token) => onToken('A', token)
  )

  const rawB = await generateInterpretationStream(
    'B',
    clauseText,
    signals,
    precedentForPrompt,
    (token) => onToken('B', token),
    rawA.argument
  )

  const validated = validateDebate(
    { clauseId, interpretationA: rawA, interpretationB: rawB },
    clauseText,
    precedentForPrompt
  )

  const citedByA = resolveCitedPrecedentIds(
    validated.interpretationA.precedentUsed,
    supplied
  )
  const citedByB = resolveCitedPrecedentIds(
    validated.interpretationB.precedentUsed,
    supplied
  )

  const ids = await persistDebate(clauseId, validated, citedByA, citedByB)

  const touched = [...new Set([...citedByA, ...citedByB])]
  if (touched.length > 0) {
    await refreshPrecedentStats(touched, supplied)
  }

  return {
    ...ids,
    interpretationA: validated.interpretationA,
    interpretationB: validated.interpretationB,
    citedPrecedentIds: touched,
    relevantPrecedents: summarise(supplied),
  }
}

/**
 * Cache the best relevance score each cited precedent has ever achieved. It is
 * a genuine measure of how load-bearing a ruling has become, and it is derived
 * from the ranking rather than incremented by hand.
 */
async function refreshPrecedentStats(
  ids: string[],
  ranked: PrecedentWithRelevance[]
): Promise<void> {
  const scores = new Map(
    ranked.map((r) => [r.precedent._id, r.relevanceScore] as const)
  )

  for (const id of ids) {
    const existing = await sanityClient.getDocument(id)
    if (!existing) continue
    await sanityClient
      .patch(id)
      .set({
        relevanceScore: Math.max(
          Number(existing.relevanceScore ?? 0),
          scores.get(id) ?? 0
        ),
      })
      .commit()
  }
}
