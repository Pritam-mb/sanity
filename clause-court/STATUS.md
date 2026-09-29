# Clause Court — Build Status

**Last updated:** 2026-09-29
**Source of truth:** `D:\sanity\Clause_Court_Full_PRD.md`
**Codebase:** `D:\sanity\clause-court`

```
TypeScript   npx tsc --noEmit   PASS
ESLint       npm run lint       PASS (0 errors, 0 warnings)
Build        npm run build      PASS (13 routes, all dynamic)
```

---

## 1. Where things stand

Every Priority 0 item in PRD §36 is implemented. The pipeline is complete end to
end in code, but **it has never been run against a real Sanity project** — there
is no `.env.local`, so nothing below the "verified" line has been observed to
work at runtime. Treat the app as unverified until §5 is done.

The build is green, but a green build says nothing about whether a debate
actually streams, whether a ruling actually persists, or whether the second
clause actually cites the first precedent. That is the entire product.

---

## 2. Milestone status

| # | Milestone | State | Notes |
|---|-----------|-------|-------|
| 1 | Sanity Foundation | Code complete, unverified | 6 schemas, seed, workflow. `citesPrecedent` graph never fetched from a live dataset. |
| 2 | Next.js Foundation | **Done** | All routes deep-linked, design system, read/write clients. |
| 3 | Dashboard + Clause Views | **Done** | Stats, list, detail, demo reset. |
| 4 | Ambiguity Engine | **Done** | 4 rule families, structured report with offset. |
| 5 | Debate Chamber + Gemini | Code complete, unverified | SSE streaming implemented. No live Gemini call has run. |
| 6 | Human Ruling + Dissent | Code complete, unverified | Judge panel, gavel, dissent. |
| 7 | Precedent System | **Done** | Library, detail, relevance, derived citation count. |
| 8 | Killer Demo (2nd debate) | Seeded, unverified | `clause-service-interruption` cites the refund precedent. This is the money shot and it has never been seen. |
| 9 | Polish | Partial | See §6. Animations and responsive done; accessibility, disclaimer, demo assets not. |

---

## 3. Done

### Sanity content model
- `sanity.config.ts`, `sanity.cli.ts`, Vision plugin, custom desk structure.
- Six schemas: `definition`, `clause`, `interpretation`, `debate`, `ruling`, `precedent`.
- v1.1 fields present: `dissent` + `dissentAdvocate`, `relevanceScore`, `citationCount`, `citesPrecedent`, `applicableTerms`.
- Read client + token-bearing write client; `useCdn: false` on writes.

### Deterministic ambiguity engine — `src/lib/ambiguity/detector.ts`
- Rule A vague quantifier, Rule B missing definition, subjective standard, open-ended discretion.
- Pure and rule-based. Every signal names the rule and the character offset.
- Rule B respects a defined head set, so a clause with definitions is not falsely accused of omitting one.
- Improved in this pass: singularization for plural/singular term matching, deduped missing-definition signals, definition-derived head set.
- Clause detail runs it on every render and is **read-only** — it used to patch Sanity during a GET.

### Seed data — `src/lib/seed/`
- 12 clauses, 4 definitions, 3 ambiguity-flagged, 1 fully litigated chain.
- `clause-refund-policy` → 2 interpretations → debate → ruling → `precedent-refund-reasonable-time`.
- `clause-service-interruption` cites that precedent (the reuse demonstration).
- `citationCount` recomputed by walking the reference graph, never incremented by hand.
- `POST /api/seed` is destructive, dynamic, and refuses without `SANITY_API_TOKEN`.

### Workflow — `src/sanity/workflow.ts`
Shared by Studio and the app, so a step legal in one is legal in the other.

Fixed in this pass — these were real holes, not cosmetic:
- `availableTransitions` short-circuited on `actor === 'human'` and returned *every* transition, so a person was offered steps owned by the pipeline. Now each actor sees only its own steps.
- `assertHumanTransition` tested `owner === 'human' && !requiresConfirmation`, a condition that can never be true, so deterministic transitions passed the gate. It now rejects any non-human-owned transition.
- `clauseDocumentActions` retained Sanity's default publish action, letting a reviewer push a `ruled` clause public without accepting the ruling. Publish/unpublish are now filtered out.
- `ClauseWorkflowActions` called `useCallback` after an early return, violating hook order across renders.
- Removed `basePath: '/studio'` from the config — there is no embedded Studio route, so it pointed at nothing.

### Debate engine
- Gemini 2.0 Flash, server-side only. Two advocate personas, JSON mode, one retry on excessive similarity.
- **Real SSE streaming** at `GET /api/debate/stream/[id]` — `meta` / `start` / `token` / `done` / `error` frames, parsed client-side from a `fetch` body. The previous implementation fetched the full response and animated a fake typewriter over it; `generateDebateStream` was dead code. Fixed in this pass.
- Both routes share `runDebate`, so the streaming and non-streaming paths cannot produce different results.
- AbortController cancels an in-flight hearing if the user navigates away.

### Quality gate — `src/lib/debate/quality.ts` (new in this pass)
`validateDebate` was called by the routes but **did not exist**. Now every claim in the PRD that a prompt cannot guarantee is checked in code:
- `textualEvidence` quotes are matched against the clause text. Fabricated quotes are **dropped** — an invented quotation is indistinguishable from a real one to a reader.
- `precedentUsed` claims are matched against documents actually supplied. Hallucinated titles are dropped, so nothing fabricated enters the reference graph.
- Arguments exceeding 75% Jaccard overlap are rejected as not a genuine disagreement, rather than presented as a debate.
- Empty arguments are errors; thin ones are warnings.

### Ruling + dissent
- Judge panel: adopt A / adopt B / custom, plus optional reasoning and a required judge name. No path produces an unattributable ruling.
- Dissent generated post-ruling by the losing advocate, stored on the ruling, cannot overturn the holding, degrades quietly if Gemini fails.
- `createRuling` stops the clause at `ruled`. Resolution is a separate human act.

Fixed in this pass — the ruling engine trusted the client:
- `POST /api/ruling` accepted `interpretationA` / `interpretationB` from the request body (cast to `never` to satisfy TS), so a client could dictate what the permanent record said was argued, and the dissent could be generated from fabricated argument text. It now requires a `debateId` and reads the advocates' arguments back out of Sanity.
- Lineage no longer re-matches free-text precedent titles via a GROQ `match`; it uses the validated `citedPrecedent` references the debate route already checked.
- `ruling.debate` added to the schema and to the seed.

### Precedent system
- `/precedents` library ranked by citations, `/precedents/[id]` detail with lineage and citing clauses.
- Relevance is a deterministic weighted score with HIGH/MEDIUM/LOW badges and matched-term display.
- `relevanceScore` is raised to the best score any citing debate ever achieved, derived from the ranking.
- React Flow graph at `/graph`: Clause → Ruling → Precedent → dependent clause, plus node styles and responsive controls.

### Human approval gate UI
- Clause detail renders the workflow stepper and a gate whose buttons come from `GET /api/workflow`, so the UI cannot offer a move the state machine would reject.
- Confirmation dialog states what the step means before firing.
- The debate chamber's post-ruling panel links to "Complete the workflow" rather than offering the next step inline.

### Deep links
- `/debate/[id]` loads the stored debate and its ruling on the server, so a refresh or a pasted link shows the recorded case instead of an empty room. Fixed in this pass — the page previously ignored `initialDebate` entirely and could not restore anything.
- `DEBATE_BY_CLAUSE_QUERY` extended with `precedentUsed` and the ruling.

### Pages and plumbing
- `/`, `/clauses`, `/clauses/[id]`, `/debate/[id]`, `/precedents`, `/precedents/[id]`, `/graph`.
- `README.md` rewritten: setup, env table, routes, and a section on how each guarantee is mechanically enforced.
- `.env.example` with per-variable purpose and security notes.
- Fixed the dead `<Link href="/api/seed">`, which produced a 405 because the route is POST-only. Replaced with a confirming `SeedButton`.
- Removed `any` from the dashboard and clause pages; fixed the `activedDebates` typo in `DashboardStats` that was silently shadowing a real field mismatch.
- Corrected `GET`/`POST` route placement: both debate routes declared `params.id` from static paths, which failed Next's generated type validation.

---

## 4. Not done

### Blocked on credentials
Nothing below has been run. This is the whole remaining risk.

1. No `.env.local`. `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_TOKEN`, `GEMINI_API_KEY` are all unset.
2. `POST /api/seed` has never executed against a real project. The 12-clause dataset, the reference graph, and `recountCitations` are unproven.
3. No Gemini call has ever run. Streaming, the quality gate, and dissent generation are all unproven.
4. **The killer demo has never been seen.** That `clause-service-interruption` surfaces `precedent-refund-reasonable-time` in the chamber, that the advocates actually use it, and that the graph shows the chain — the central claim of the product — is unverified.

### Auth: absent by design, not by oversight
PRD §36 puts "authentication system" in Priority 2, so this is scoped out. But be explicit about the consequence:
- `POST /api/workflow` has **no authentication**. Anyone who can reach the app can advance any clause to `resolved` or `published`. The approval gate prevents the *AI* from self-approving; it does not prevent an anonymous visitor from doing so.
- `POST /api/ruling` accepts any `judgeName` with no identity check.
- `POST /api/seed` is destructive with no auth, only a token-presence check.

For a public demo this is acceptable. For any real deployment it is the first thing to fix.

### PRD §31 — safety labelling
Required: clearly label the product as a policy/structured-content review prototype, and do not present generated interpretations as legal conclusions.

Not done. The footer reads "AI arguments. Structural precedent. Human judgment." and page metadata includes "legal tech" / "contract analysis". The dissent is labelled a generated opinion, which satisfies the narrow requirement, but there is no prototype disclaimer anywhere and no visible "not legal advice".

### PRD §32 — accessibility
Partial. Present: semantic `<button>`/`<label>` elements, `aria-label` on the stepper, `aria-live` on the live transcript, `role="alert"` on errors, `aria-current="step"`, advocate A/B distinguished by label and icon as well as color, responsive down to 480px.

Missing: no `:focus-visible` styling for buttons and links (only `.input:focus` / `.textarea:focus` are styled, so keyboard focus on controls is near-invisible), no `prefers-reduced-motion` handling despite several infinite animations, no skip link, no `.sr-only` utility.

### PRD §39 Milestone 9 — polish
- Screenshots and video recording: not started.
- Submission writeup: not started. PRD §41 has the outline.
- Workflow transition log visible in UI (PRD §36 Priority 1): not started. There is no audit trail of who approved what and when — the gate records the new state but not the actor or timestamp.
- Studio preview integration and App SDK panel (Priority 1): not started.
- Loading states: pages are dynamic and block on the server, so there are no skeletons. The debate chamber has live state, which covers its own case.
- `npm audit` reports 16 vulnerabilities (13 moderate, 3 high). Unaudited and unfixed — they are most likely in the Sanity/Gemini dependency tree, but that is a guess, not a check.

### Engineering
- **No tests at all.** No unit tests for the ambiguity engine, no tests for the quality gate, no tests for the workflow state machine. These three are the load-bearing pure functions with explicit contracts and would be cheap to cover. The reference graph has no verification that `citesPrecedent` actually resolves.
- No `.git` — the working directory is not a repository, so there is no history and no rollback safety.

---

## 5. Next steps, in order

1. **Get credentials.** Create a Sanity project, an editor token, and a Gemini key. Fill `.env.local`.
2. **Seed and inspect.** `POST /api/seed`, then open the dataset in Studio. Confirm 12 clauses, the refund chain, and that `clause-service-interruption.citedPrecedent` resolves to a real document rather than a dangling reference. This is the single highest-value check available.
3. **Run the happy path end to end.** Seed → open flagged refund clause → read the ambiguity report → begin debate → watch both advocates stream → confirm precedent is absent on the first clause → rule as a human → confirm the ruling, dissent, and precedent documents exist in Studio → approve resolution → publish.
4. **Run the killer demo.** Open `clause-service-interruption`, begin the debate, and confirm the refund precedent appears with a relevance badge and the advocates actually cite it. Then open `/graph` and confirm the chain renders. PRD §40 step 14.
5. **Test the failure paths**, which are the ones most likely to be wrong because they have never executed: Gemini key missing, Gemini returning malformed JSON, advocates coming back too similar, a ruling attempted against a clause in the wrong state, a workflow POST for an illegal transition.
6. **Write tests for the three pure cores** — `detectAmbiguity`, `validateDebate`, and the workflow state machine. These encode the product's guarantees and are the easiest thing to regress silently.
7. **Add the §31 disclaimer** to the layout footer and the judge panel. Small, and it is an explicit PRD requirement.
8. **Add `:focus-visible` and `prefers-reduced-motion`.** Small, and §32 requires both.
9. **Decide on auth.** Out of MVP scope, but `POST /api/workflow` being open means the approval gate is a UI convention rather than an enforced control. Do not deploy publicly without a decision here.
10. **Record the demo**, then write up PRD §41.

---

## 6. Design decisions worth knowing

Recorded because they will look like omissions later.

- **The ambiguity engine never uses a model.** The PRD's central claim is that detection is deterministic and inspectable. Adding an LLM anywhere in `detectAmbiguity` would void the main differentiator.
- **The model cannot flag, rule, or resolve.** It only argues. Flagging is rule-based, ruling is human, resolution is human.
- **A ruling is never `resolved` by a pipeline.** `createRuling` deliberately stops at `ruled`.
- **Advocate B is given Advocate A's finished argument** so it responds rather than guessing at the opposition. This is why streaming is sequential — A must finish before B can answer.
- **Precedent is retrieved server-side, never by the client.** The browser never decides what precedent a debate sees.
- **Quality failures discard data rather than inventing replacements.** A fabricated quote is dropped, not "corrected". Better an empty evidence list than a plausible lie.
- **The live transcript shows raw JSON, not prose.** The model emits JSON; showing it as a court record is honest, and it is replaced by the formatted argument once parsed.
- **Workflow is a local state machine, not Sanity Workflows.** `@sanity/workflow` is not published on npm (`404`). Behaviour is identical for the product's purposes and the state machine is shared by both surfaces, which is what actually matters.
- **The Studio is a separate dev server** (`npx sanity dev` on :3333), not embedded in the app router.
