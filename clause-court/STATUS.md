# Clause Court — Build Status

**Last updated:** 2026-09-29
**Source of truth:** `D:\sanity\Clause_Court_Full_PRD.md`
**Codebase:** `D:\sanity\clause-court`

```
TypeScript   npx tsc --noEmit   PASS
ESLint       npm run lint       PASS (0 errors, 0 warnings)
Build        npm run build      PASS (13 routes)
Runtime      verified live against Sanity + Gemini (see §2)
```

---

## 1. Where things stand

Every Priority 0 item in PRD §36 is implemented **and has now been executed against
the real dataset and the real model.** The pipeline ran end to end: seed → flagged
clause → streamed hearing → precedent reuse → human ruling → dissent → workflow →
published.

The central claim of the product — that a second clause surfaces the first
clause's precedent, and that the advocates actually use it — has been observed
working, not inferred. See §2.

This pass also fixed four defects that only a live run could surface, three of
which the green build could never have caught.

---

## 2. Runtime verification log

Verified against project `tmics7hc` / dataset `production` at `localhost:3000`.

### Credentials

| Check | Result |
|---|---|
| Sanity token identity | developer robot, read/write on `production` |
| Sanity dataset | exists, public |
| Gemini key | valid, models listable |
| `gemini-2.0-flash` | **HTTP 404 — retired.** `"This model ... is no longer available"` |
| `gemini-2.5-flash` | HTTP 200 |

The model was moved to `gemini-2.5-flash` and is now selected through a single
`GEMINI_MODEL` env var read in one place (`src/lib/debate/gemini.ts`), defaulting
to `gemini-2.5-flash`. Four call sites previously hard-coded the retired model.

### Seed — `POST /api/seed`

First live run **failed**, HTTP 500:

```
Mutation failed: Document "clause-service-interruption" references
non-existent document "precedent-refund-reasonable-time"
```

Real bug, and a load-bearing one: clauses were written with their
`citedPrecedent` references *before* the precedent document existed. Sanity
enforces reference integrity and rejects the whole mutation, so the seed — the
single highest-value check in the plan — had never worked at all.

Fixed by writing clauses without citation edges, attaching the edges in a later
step once the precedent exists, and then **asserting** that no clause holds a
dangling precedent reference before the seed is allowed to report success. A seed
that reports success with a broken reference graph has failed at the only thing it
exists to demonstrate.

Current result:

```json
{ "success": true, "definitions": 4, "clauses": 12, "interpretations": 2,
  "debates": 1, "rulings": 1, "precedents": 1, "flaggedClauses": 3,
  "ambiguousTerms": ["appropriate","Priority","when appropriate",
                     "as determined","reasonable","promptly","material"] }
```

Verified in the stored dataset: 12 clauses, 8 `draft`, **3 `flagged`**
(PRD asks 2–3), 1 `ruled`, and the refund chain resolving end to end.

### `/graph` — HTTP 500 on first render

```
TypeError: Cannot read properties of null (reading 'includes')
```

Real bug. In GROQ an empty or absent array dereferences to `null`, not `[]`, so any
clause citing no precedent handed the client `citedPrecedentIds: null` and the
`.includes()` on it threw. Only a real clause with no citations triggers it, which
is why it survived a build and only appeared against seeded data.

Fixed at the query with `coalesce(..., [])` on every list projection, so the
null-shape never enters the data instead of being guarded for in every consumer.
`/graph` now returns 200 and renders the chain.

### Streamed hearing — `GET /api/debate/stream/clause-service-interruption`

The killer demo, observed:

- SSE frames: `meta` x1, `token` x17, `done` x1 — real incremental token streaming.
- Precedent surfaced: **"Reasonable Time in Refund Policy", HIGH, relevance 100%**,
  matched on term `reasonable`.
- Both advocates cited it independently.
- Every `textualEvidence` quote resolved verbatim against the clause text, so the
  anti-fabrication gate passed rather than silently dropping claims.
- Two genuinely opposed interpretations ("Immediate Service Restoration and Swift
  Customer Notification" vs "Operational Flexibility in Restoration and
  Notification") — the 75% overlap rejection did not fire, correctly.

Correction to an earlier claim in this file: the route emits `meta`, `token`,
`done`, and `error` frames. There is **no `start` frame**; the client switches
speaker on `token.side`. The earlier "meta / start / token / done / error" list was
aspirational, not observed.

### Ruling — `POST /api/ruling` with the returned `debateId`

- HTTP 200. Ruling, dissent, and a new precedent all persisted.
- Dissent authored by the losing advocate (B), grounded in the actual arguments.
- `clauseRevisionSuggested: true` with a concrete revised clause text.
- New precedent's `citesPrecedent` correctly resolves to
  `precedent-refund-reasonable-time`; `applicableTerms` = `reasonable, promptly`.

### Workflow — human approval gate

| Request | Result |
|---|---|
| `ruled → published` (skipping a step) | **409**, `Illegal workflow transition` |
| transitions offered to a human at `ruled` | `resolved` only — no pipeline steps |
| `ruled → resolved` | 200 |
| `resolved → published` | 200 |

The gate is enforced in code, not merely hidden in the UI.

### Failure paths

| Request | Result |
|---|---|
| Ruling with no `judgeName` | 400 — *"A judge name is required — rulings must be attributable to a person"* |
| Ruling with a fabricated `debateId` | 400 — refuses to rule on a hearing with no recorded arguments |
| Ruling against a clause in the wrong state | 409 |

All three previously reported **500**, which blamed the server for refusals that
are the state machine and validators working correctly. Added
`WorkflowViolationError` so routes answer 409/400 for a refusal and reserve 500 for
genuine faults — otherwise every correctly-blocked request would light up error
monitoring as a crash.

### All routes

`/`, `/clauses`, `/graph`, `/precedents`, `/precedents/[id]`, `/clauses/[id]`,
`/debate/[id]` — **all 200** against the seeded dataset.

Dataset re-seeded afterwards, so the running app is in a clean demo state.

---

## 3. Done

### Sanity content model
- `sanity.config.ts`, `sanity.cli.ts`, Vision plugin, custom desk structure.
- Six schemas: `definition`, `clause`, `interpretation`, `debate`, `ruling`, `precedent`.
- v1.1 fields present: `dissent` + `dissentAdvocate`, `relevanceScore`, `citationCount`, `citesPrecedent`, `applicableTerms`.
- Read client + token-bearing write client; `useCdn: false` on writes.
- `citesPrecedent` graph now **verified** to resolve against a live dataset.

### Deterministic ambiguity engine — `src/lib/ambiguity/detector.ts`
- Rule A vague quantifier, Rule B missing definition, subjective standard, open-ended discretion.
- Pure and rule-based. Every signal names the rule and the character offset.
- Rule B respects a defined head set, so a clause with definitions is not falsely accused of omitting one.
- Singularization for plural/singular matching, deduped missing-definition signals, definition-derived head set.
- Clause detail runs it on every render and is **read-only** — it used to patch Sanity during a GET.
- Confirmed live: 3 flagged clauses, 7 distinct ambiguous terms, matching the seed's own report.

### Seed data — `src/lib/seed/`
- 12 clauses, 4 definitions, 3 ambiguity-flagged, 1 fully litigated chain.
- `clause-refund-policy` → 2 interpretations → debate → ruling → `precedent-refund-reasonable-time`.
- `clause-service-interruption` cites that precedent (the reuse demonstration).
- `citationCount` recomputed by walking the reference graph, never incremented by hand.
- Citation edges written after their targets exist, then verified non-dangling.
- `flaggedClauses` and `ambiguousTerms` are read back from the **stored** documents rather than from the plan that wrote them. They previously reported 4 flagged when the dataset held 3, because the ruled refund clause still carries ambiguity signals — a summary that overstates its own subject is worse than none.
- `POST /api/seed` is destructive, dynamic, and refuses without `SANITY_API_TOKEN`.

### Workflow — `src/sanity/workflow.ts`
Shared by Studio and the app, so a step legal in one is legal in the other.

Real holes closed earlier in this build:
- `availableTransitions` short-circuited on `actor === 'human'` and returned *every* transition, so a person was offered steps owned by the pipeline. Now each actor sees only its own steps.
- `assertHumanTransition` tested `owner === 'human' && !requiresConfirmation`, a condition that can never be true, so deterministic transitions passed the gate. It now rejects any non-human-owned transition.
- `clauseDocumentActions` retained Sanity's default publish action, letting a reviewer push a `ruled` clause public without accepting the ruling. Publish/unpublish are now filtered out.
- `ClauseWorkflowActions` called `useCallback` after an early return, violating hook order across renders.
- Removed `basePath: '/studio'` from the config — there is no embedded Studio route, so it pointed at nothing.
- Added `WorkflowViolationError` so a refusal is distinguishable from a crash, and routes return 409/400 instead of 500.

### Debate engine
- Gemini `gemini-2.5-flash`, server-side only, model chosen by `GEMINI_MODEL`.
- Two advocate personas, JSON mode, one retry on excessive similarity.
- **Real SSE streaming** at `GET /api/debate/stream/[id]` — `meta` / `token` / `done` / `error` frames, parsed client-side from a `fetch` body. The previous implementation fetched the full response and animated a fake typewriter over it; `generateDebateStream` was dead code.
- Both routes share `runDebate`, so the streaming and non-streaming paths cannot produce different results.
- AbortController cancels an in-flight hearing if the user navigates away.

### Quality gate — `src/lib/debate/quality.ts`
`validateDebate` was called by the routes but **did not exist**. Now every claim in the PRD that a prompt cannot guarantee is checked in code:
- `textualEvidence` quotes are matched against the clause text. Fabricated quotes are **dropped** — an invented quotation is indistinguishable from a real one to a reader.
- `precedentUsed` claims are matched against documents actually supplied. Hallucinated titles are dropped, so nothing fabricated enters the reference graph.
- Arguments exceeding 75% Jaccard overlap are rejected as not a genuine disagreement, rather than presented as a debate.
- Empty arguments are errors; thin ones are warnings.
- Verified live: the observed hearing passed all checks.

### Ruling + dissent
- Judge panel: adopt A / adopt B / custom, plus optional reasoning and a required judge name. No path produces an unattributable ruling.
- Dissent generated post-ruling by the losing advocate, stored on the ruling, cannot overturn the holding, degrades quietly if Gemini fails.
- `createRuling` stops the clause at `ruled`. Resolution is a separate human act.
- `/api/ruling` originally accepted `interpretationA` / `interpretationB` from the request body (cast to `never` to satisfy TS), so a client could dictate what the permanent record said was argued, and the dissent could be generated from fabricated argument text. It now requires a `debateId` and reads the advocates' arguments back out of Sanity.
- Lineage no longer re-matches free-text precedent titles via a GROQ `match`; it uses the validated `citedPrecedent` references the debate route already checked.
- `ruling.debate` added to the schema and to the seed.
- Verified live: ruling, dissent, and precedent all persisted, with lineage intact.

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
- `/debate/[id]` loads the stored debate and its ruling on the server, so a refresh or a pasted link shows the recorded case instead of an empty room. The page previously ignored `initialDebate` entirely and could not restore anything.
- `DEBATE_BY_CLAUSE_QUERY` extended with `precedentUsed` and the ruling.

### Pages and plumbing
- `/`, `/clauses`, `/clauses/[id]`, `/debate/[id]`, `/precedents`, `/precedents/[id]`, `/graph`.
- `README.md` rewritten: setup, env table, routes, and a section on how each guarantee is mechanically enforced.
- `.env.example` with per-variable purpose, `GEMINI_MODEL` override, and security notes.
- Fixed the dead `<Link href="/api/seed">`, which produced a 405 because the route is POST-only. Replaced with a confirming `SeedButton`.
- Removed `any` from the dashboard and clause pages; fixed the `activedDebates` typo in `DashboardStats` that was silently shadowing a real field mismatch.
- Corrected `GET`/`POST` route placement: both debate routes declared `params.id` from static paths, which failed Next's generated type validation.

---

## 4. Not done

### Auth: absent by design, not by oversight
PRD §36 puts "authentication system" in Priority 2, so this is scoped out. But be explicit about the consequence:
- `POST /api/workflow` has **no authentication**. Anyone who can reach the app can advance any clause to `resolved` or `published`. The approval gate prevents the *AI* from self-approving; it does not prevent an anonymous visitor from doing so.
- `POST /api/ruling` accepts any `judgeName` with no identity check.
- `POST /api/seed` is destructive with no auth, only a token-presence check. It has now been run against `production` — note the dataset is **public**, so the destructive endpoint and all its data are reachable by anyone with the URL.

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
- Workflow transition log visible in UI (PRD §36 Priority 1): not started. There is no audit trail of who approved what and when — the gate records the new state but not the actor or timestamp. This is the sharpest remaining gap now that the transitions are proven to work.
- Studio preview integration and App SDK panel (Priority 1): not started.
- Loading states: pages are dynamic and block on the server, so there are no skeletons. The debate chamber has live state, which covers its own case.
- `npm audit` reports 16 vulnerabilities (13 moderate, 3 high). Unaudited and unfixed — most likely in the Sanity/Gemini dependency tree, but that is a guess, not a check.

### Engineering
- **No tests at all.** No unit tests for the ambiguity engine, the quality gate, or the workflow state machine. These are the load-bearing pure functions with explicit contracts. The three live defects fixed in this pass — the seed's dangling reference, the graph's `null` dereference, and the seed's inflated count — were each found by running the app, which is the most expensive possible way to discover a one-line bug. See §5.
- No `.git` — the working directory is not a repository, so there is no history and no rollback safety.
- Gemini error handling beyond malformed JSON (key missing, rate limit, quota) is written but **not** exercised. Only the happy path and one retired-model case have run.

---

## 5. Next steps, in order

1. **Write tests for the three pure cores** — `detectAmbiguity`, `validateDebate`, and the workflow state machine. This is now the top item. Every defect found in the live pass was in a function that a 20-line test would have caught, and the seed in particular should never have been able to return success with a broken reference graph.
2. **Add a seed self-test** that asserts the reference graph closed and the reported counts match stored documents, so a bad seed fails loudly rather than needing a manual recount.
3. **Exercise the untested Gemini failure paths** — missing key, malformed JSON, advocates too similar, quota. The retry and drop logic is written and unproven.
4. **Add the §31 disclaimer** to the layout footer and the judge panel. Small, and it is an explicit PRD requirement.
5. **Add `:focus-visible` and `prefers-reduced-motion`.** Small, and §32 requires both.
6. **Record the workflow transition log** with actor and timestamp, and surface it on the clause page.
7. **Decide on auth.** Out of MVP scope, but the approval gate is a UI convention rather than an enforced control, and the seed endpoint is destructive against a public dataset. Do not deploy publicly without a decision here.
8. **Record the demo**, then write up PRD §41. The live run in §2 is the script.

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
- **Derived numbers are recomputed, never incremented.** `citationCount` is walked from the reference graph; the seed's flagged count is read back from stored documents. Both once lied — `citationCount` by hand, the flagged count by counting the wrong set.
- **The model is configured in exactly one place.** Four hard-coded call sites had drifted onto a retired model that only a live call would reveal. `GEMINI_MODEL` is now the single switch.
- **A refusal is not a server fault.** Blocked-by-design is 409/400; only genuine failures are 500.
- **Workflow is a local state machine, not Sanity Workflows.** `@sanity/workflow` is not published on npm (`404`). Behaviour is identical for the product's purposes and the state machine is shared by both surfaces, which is what actually matters.
- **The Studio is a separate dev server** (`npx sanity dev` on :3333), not embedded in the app router.
