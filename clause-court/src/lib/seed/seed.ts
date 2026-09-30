import { sanityClient } from '@/lib/sanity/client'
import {
  SEED_CLAUSES,
  SEED_COUNCIL,
  SEED_DEFINITIONS,
  SEED_DOCUMENT_TYPES,
  SEED_INTERPRETATIONS,
  SEED_MEMBERS,
  SEED_POSITIONS,
  SEED_PRECEDENT,
  SEED_REGULATIONS,
  SEED_RULING,
  SEED_SESSION,
  SEED_STANDARDS,
  planSeedClauses,
} from './dataset'
import type { AmbiguitySignal, WorkflowTransitionLogEntry } from '@/types'

// =============================================
// SEED EXECUTOR
// =============================================
//
// Wipes the dataset and rebuilds the demo from source. The seeded litigation
// is assembled in dependency order so every reference resolves on first write
// and Sanity never stores a dangling pointer.

const ref = (id: string) => ({ _type: 'reference' as const, _ref: id })

interface CitationRow {
  clause: string
  precedentIds?: string[]
}

export interface SeedResult {
  definitions: number
  clauses: number
  interpretations: number
  debates: number
  rulings: number
  precedents: number
  flaggedClauses: number
  ambiguousTerms: string[]
  councils: number
  members: number
  regulations: number
  sessions: number
  positions: number
}

async function wipeDataset(): Promise<number> {
  let deleted = 0
  for (const type of SEED_DOCUMENT_TYPES) {
    const ids: string[] = await sanityClient.fetch(
      `*[_type == $type]._id`,
      { type }
    )
    for (const id of ids) {
      try {
        await sanityClient.delete(id)
        deleted += 1
      } catch {
        // A document that vanished between the list and the delete is fine.
      }
    }
  }
  return deleted
}

export async function seedDemoData(): Promise<SeedResult> {
  await wipeDataset()

  // ─── 1. Definitions ───────────────────────────────────────
  for (const definition of SEED_DEFINITIONS) {
    await sanityClient.createOrReplace(definition)
  }

  // ─── 1b. Company standards (Rule E) ─────────────────────────
  for (const standard of SEED_STANDARDS) {
    await sanityClient.createOrReplace(standard)
  }

  // ─── 1c. The policy council + its members ───────────────────
  for (const member of SEED_MEMBERS) {
    await sanityClient.createOrReplace(member)
  }
  await sanityClient.createOrReplace({
    ...SEED_COUNCIL,
    chair: ref(SEED_COUNCIL.chair),
  })

  // ─── 1d. Knowledge base: regulations & benchmarks ──────────
  for (const regulation of SEED_REGULATIONS) {
    await sanityClient.createOrReplace(regulation)
  }

  // ─── 2. Clauses, with engine-computed signals ─────────────
  // The ambiguity report is produced by the deterministic engine, not by hand.
  // Seeding through the same code path the app uses means the dashboard and a
  // live clause can never disagree about what is flagged.
  const plan = new Map(
    planSeedClauses().map((entry) => [entry._id, entry])
  )

  // `citedPrecedent` is deliberately omitted here. Those references point at the
  // seeded precedent, which does not exist yet — and Sanity enforces reference
  // integrity, rejecting the whole mutation rather than storing a dangling
  // pointer. The edges are attached in step 7, once the precedent is written.
  // Who put each case forward. The seed transition log already credits a
  // "Policy Author"; this makes the same attribution visible on the case page.
  const SUBMITTED_BY: Record<string, string> = {
    'clause-refund-policy': 'Aisha Khan',
    'clause-service-interruption': 'Dev Okafor',
    'clause-priority-support': 'Priya Raman',
    'clause-data-retention': 'Lena Fischer',
    'clause-payment-terms': 'Aisha Khan',
    'clause-api-rate-limit': 'Dev Okafor',
    'clause-password-policy': 'Marcus Chen',
    'clause-sla-uptime': 'Dev Okafor',
    'clause-ip-ownership': 'Sofia Marino',
    'clause-termination-notice': 'Sofia Marino',
    'clause-geographic-restrictions': 'Lena Fischer',
    'clause-support-sla': 'Priya Raman',
  }

  for (const clause of SEED_CLAUSES) {
    const planEntry = plan.get(clause._id)
    const status = planEntry?.status ?? 'draft'
    const signals = (planEntry?.signals ?? []) as AmbiguitySignal[]
    const transitionLog: WorkflowTransitionLogEntry[] = [
      {
        _key: 'seed-tl-init',
        from: 'created',
        to: 'draft',
        actor: 'Policy Author',
        actorType: 'human',
        timestamp: '2026-09-29T10:00:00.000Z',
        note: 'Initial policy clause created.',
      },
    ]

    if (status === 'flagged') {
      transitionLog.push({
        _key: 'seed-tl-flagged',
        from: 'draft',
        to: 'flagged',
        actor: 'Deterministic Ambiguity Engine',
        actorType: 'deterministic',
        timestamp: '2026-09-29T10:05:00.000Z',
        note: `Flagged with ${signals.length} inspectable ambiguity signal${signals.length === 1 ? '' : 's'}.`,
      })
    }

    await sanityClient.createOrReplace({
      _id: clause._id,
      _type: 'clause',
      title: clause.title,
      text: clause.text,
      category: clause.category,
      caseNumber: clause.caseNumber,
      submittedBy: SUBMITTED_BY[clause._id] ?? 'Policy Team',
      status,
      ambiguitySignals: signals,
      definitions: clause.definitions.map(ref),
      debates: [],
      currentRuling: null,
      transitionLog,
    })
  }

  // ─── 3. Interpretations for the litigated case ────────────
  for (const interp of SEED_INTERPRETATIONS) {
    await sanityClient.createOrReplace({
      _id: interp._id,
      _type: 'interpretation',
      clause: ref(interp.clause),
      side: interp.side,
      title: interp.title,
      summary: interp.summary,
      argument: interp.argument,
      textualEvidence: interp.textualEvidence,
      citedPrecedent: interp.citedPrecedent.map(ref),
    })
  }

  // ─── 4. The debate that produced them ─────────────────────
  await sanityClient.createOrReplace({
    _id: 'debate-refund-policy',
    _type: 'debate',
    clause: ref('clause-refund-policy'),
    interpretationA: ref('interp-refund-a'),
    interpretationB: ref('interp-refund-b'),
    status: 'completed',
    startedAt: '2026-09-18T09:12:00.000Z',
    completedAt: '2026-09-18T09:12:41.000Z',
  })

  // ─── 5. The human ruling ──────────────────────────────────
  await sanityClient.createOrReplace({
    _id: SEED_RULING._id,
    _type: 'ruling',
    clause: ref(SEED_RULING.clause),
    debate: ref('debate-refund-policy'),
    chosenInterpretation: SEED_RULING.chosenInterpretation
      ? ref(SEED_RULING.chosenInterpretation)
      : null,
    customRuling: SEED_RULING.customRuling,
    reasoning: SEED_RULING.reasoning,
    judgeName: SEED_RULING.judgeName,
    dissent: SEED_RULING.dissent,
    dissentAdvocate: SEED_RULING.dissentAdvocate,
    clauseRevisionSuggested: SEED_RULING.clauseRevisionSuggested,
    suggestedRevision: SEED_RULING.suggestedRevision,
    precedentId: SEED_PRECEDENT._id,
  })

  // ─── 6. The precedent it became ───────────────────────────
  await sanityClient.createOrReplace({
    _id: SEED_PRECEDENT._id,
    _type: 'precedent',
    ruling: ref(SEED_PRECEDENT.ruling),
    sourceClause: ref(SEED_PRECEDENT.sourceClause),
    title: SEED_PRECEDENT.title,
    holding: SEED_PRECEDENT.holding,
    reasoning: SEED_PRECEDENT.reasoning,
    applicableTerms: SEED_PRECEDENT.applicableTerms,
    citesPrecedent: SEED_PRECEDENT.citesPrecedent.map(ref),
    relevanceScore: SEED_PRECEDENT.relevanceScore,
    citationCount: SEED_PRECEDENT.citationCount,
  })

  // ─── 7. Close the loop on the litigated clause ────────────
  await sanityClient
    .patch('clause-refund-policy')
    .set({
      status: 'ruled',
      currentRuling: ref(SEED_RULING._id),
      debates: [ref('debate-refund-policy')],
      transitionLog: [
        {
          _key: 'seed-tl-init',
          from: 'created',
          to: 'draft',
          actor: 'Policy Author',
          actorType: 'human',
          timestamp: '2026-09-18T09:00:00.000Z',
          note: 'Initial refund policy clause created.',
        },
        {
          _key: 'seed-tl-flagged',
          from: 'draft',
          to: 'flagged',
          actor: 'Deterministic Ambiguity Engine',
          actorType: 'deterministic',
          timestamp: '2026-09-18T09:05:00.000Z',
          note: 'Flagged: vague quantifier "reasonable time".',
        },
        {
          _key: 'seed-tl-debated',
          from: 'flagged',
          to: 'debated',
          actor: 'AI Debate Chamber',
          actorType: 'system',
          timestamp: '2026-09-18T09:12:41.000Z',
          note: 'Debate concluded between Advocate A and Advocate B.',
        },
        {
          _key: 'seed-tl-ruled',
          from: 'debated',
          to: 'ruled',
          actor: `Judge ${SEED_RULING.judgeName}`,
          actorType: 'human',
          timestamp: '2026-09-18T09:15:00.000Z',
          note: SEED_RULING.customRuling || 'Ruling issued after debate chamber hearing.',
        },
      ],
    })
    .commit()

  // ─── 8. Attach the citation edges ─────────────────────────
  // Now that the precedent exists, every clause that cites it can reference it.
  // This is the edge the killer demo depends on, so it is written explicitly
  // rather than left implicit — and asserted below rather than assumed.
  const citingClauses = SEED_CLAUSES.filter((c) => c.citedPrecedent.length > 0)
  for (const clause of citingClauses) {
    await sanityClient
      .patch(clause._id)
      .set({ citedPrecedent: clause.citedPrecedent.map(ref) })
      .commit()
  }

  // ─── 9. Recount citations from the documents themselves ───
  // citationCount is derived, never incremented by hand — otherwise it drifts
  // from the reference graph and the number on the card becomes a lie.
  await recountCitations()

  // ─── 9b. Demo deliberation: blind round on the "promptly" clause ──
  // Members, clause and council all exist by now, so references resolve.
  await sanityClient.createOrReplace({
    ...SEED_SESSION,
    clause: ref(SEED_SESSION.clause),
    council: ref(SEED_SESSION.council),
  })
  for (const position of SEED_POSITIONS) {
    await sanityClient.createOrReplace({
      ...position,
      member: ref(position.member),
      clause: ref(position.clause),
      session: ref(position.session),
      basisPrecedent: [],
    })
  }
  await sanityClient
    .patch('clause-service-interruption')
    .set({ session: ref(SEED_SESSION._id) })
    .commit()

  // Counted from the documents as stored, not from the plan that wrote them.
  // The refund clause carries ambiguity signals but has since been ruled, so
  // counting "clauses with signals" would report 4 flagged when the dataset
  // holds 3 — a summary that overstates its own subject is worse than none.
  const persisted = await sanityClient.fetch<{ flagged: number; terms: string[] }>(`{
    "flagged": count(*[_type == "clause" && status == "flagged"]),
    "terms": array::unique(
      *[_type == "clause" && status == "flagged"].ambiguitySignals[].term
    )
  }`)
  const flaggedClauses = persisted?.flagged ?? 0
  const ambiguousTerms = persisted?.terms ?? []

  // ─── 10. Verify the reference graph actually closed ───────
  // A seed that reports success while its citation edge is dangling has failed
  // at the only thing it exists to demonstrate. Cheap to check, so check it.
  const unresolved = await sanityClient.fetch<Array<{ _id: string; missing: string }>>(
    `*[_type == $type && count(citedPrecedent[]._ref[@ in *[_type == "precedent"]._id]) < count(citedPrecedent)]{
      "_id": _id,
      "missing": citedPrecedent[]._ref[@ in *[_type == "precedent"]._id == false]
    }`,
    { type: 'clause' }
  )

  const dangling = unresolved.flatMap((c) => c.missing ?? [])
  if (dangling.length > 0) {
    throw new Error(
      `Seed produced dangling precedent references: ${[
        ...new Set(dangling),
      ].join(', ')}`
    )
  }

  return {
    definitions: SEED_DEFINITIONS.length,
    clauses: SEED_CLAUSES.length,
    interpretations: SEED_INTERPRETATIONS.length,
    debates: 1,
    rulings: 1,
    precedents: 1,
    flaggedClauses,
    ambiguousTerms,
    councils: 1,
    members: SEED_MEMBERS.length,
    regulations: SEED_REGULATIONS.length,
    sessions: 1,
    positions: SEED_POSITIONS.length,
  }
}

/**
 * Recompute `citationCount` on every precedent by counting the clauses that
 * actually reference it. Safe to call at any time; cheap at demo scale.
 */
export async function recountCitations(): Promise<void> {
  const citing = await sanityClient.fetch<{ pairs?: CitationRow[] }>(`{
    "pairs": *[_type == "clause" && count(citedPrecedent) > 0]{
      "clause": _id,
      "precedentIds": citedPrecedent[]._ref
    }
  }`)

  const counts = new Map<string, number>()
  for (const row of citing?.pairs ?? []) {
    for (const id of row.precedentIds ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }

  const precedentIds: string[] = await sanityClient.fetch(
    `*[_type == "precedent"]._id`
  )

  for (const id of precedentIds) {
    await sanityClient
      .patch(id)
      .set({ citationCount: counts.get(id) ?? 0 })
      .commit()
  }
}
