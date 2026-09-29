import { sanityClient } from '@/lib/sanity/client'
import {
  selectDebatePrecedent,
  MEDIUM_RELEVANCE_THRESHOLD,
} from './relevance'
import type { AmbiguitySignal, Precedent, PrecedentWithRelevance } from '@/types'

// =============================================
// SERVER-SIDE PRECEDENT RETRIEVAL
// =============================================
//
// Reads precedent out of Sanity and ranks it against the clause at hand. The
// ranking itself lives in `relevance.ts` and stays pure so the UI badge and
// the model prompt can never disagree about what was cited.

/**
 * Precedent already linked to this clause, i.e. what the reviewer explicitly
 * cited. Explicit citation always wins over inferred relevance.
 */
export async function getCitedPrecedent(clauseId: string): Promise<Precedent[]> {
  return sanityClient.fetch(
    `*[_type == "clause" && _id == $clauseId][0].citedPrecedent[]->{
       _id, _type, _createdAt, _updatedAt, _rev,
       title, holding, reasoning, applicableTerms,
       relevanceScore, citationCount,
       "ruling": ruling->{_id, judgeName},
       "sourceClause": sourceClause->{_id, title}
     }`,
    { clauseId }
  )
}

/**
 * All precedent in the dataset, excluding the ones produced by this clause —
 * a clause must not argue against its own holding.
 */
export async function getCandidatePrecedent(
  clauseId: string
): Promise<Precedent[]> {
  return sanityClient.fetch(
    `*[_type == "precedent" && sourceClause._ref != $clauseId] | order(citationCount desc, _createdAt desc) {
       _id, _type, _createdAt, _updatedAt, _rev,
       title, holding, reasoning, applicableTerms,
       relevanceScore, citationCount,
       "ruling": ruling->{_id, judgeName},
       "sourceClause": sourceClause->{_id, title}
     }`,
    { clauseId }
  )
}

/**
 * findRelevantPrecedent(clause) — the function named in the PRD.
 *
 * Explicitly cited precedent is always included regardless of score, because
 * a reviewer citing a case is a statement of intent the engine should not
 * second-guess. Everything else has to earn its place on term overlap.
 */
export async function findRelevantPrecedent(
  clauseId: string,
  clauseText: string,
  signals: AmbiguitySignal[]
): Promise<PrecedentWithRelevance[]> {
  const [cited, candidates] = await Promise.all([
    getCitedPrecedent(clauseId),
    getCandidatePrecedent(clauseId),
  ])

  const citedIds = new Set(cited.map((p) => p._id))
  const inferred = selectDebatePrecedent(clauseText, signals, candidates)

  const explicit: PrecedentWithRelevance[] = cited.map((precedent) => ({
    precedent,
    // A citation the reviewer made on purpose reads as MAX relevance.
    relevanceScore: 100,
    relevanceLabel: 'HIGH' as const,
    matchedTerms: (precedent.applicableTerms || []).filter((term) =>
      clauseText.toLowerCase().includes(term.toLowerCase())
    ),
  }))

  return [...explicit, ...inferred.filter((p) => !citedIds.has(p.precedent._id))]
}

/** Fresh clause list scoped for debate prompts — no full document bodies. */
export async function getPrecedentForDebate(
  clauseId: string,
  clauseText: string,
  signals: AmbiguitySignal[]
): Promise<PrecedentWithRelevance[]> {
  const ranked = await findRelevantPrecedent(clauseId, clauseText, signals)
  return ranked.filter((p) => p.relevanceScore >= MEDIUM_RELEVANCE_THRESHOLD)
}
