# Clause Court - Build Status

**Last updated:** 2026-09-29
**Source of truth:** `Clause_Court_Full_PRD.md`
**Codebase:** `clause-court`

```
TypeScript   npx tsc --noEmit   PASS (0 errors)
ESLint       npm run lint       PASS (0 errors, 0 warnings)
Tests        npm test           PASS (21/21 passing, 4 suites)
Build        npm run build      PASS (13 routes compiled)
Runtime      verified live against Sanity + Gemini (see §2)
```

---

## 1. Where Things Stand

Every Priority 0 item in PRD §36 is implemented **and has now been executed against the real dataset and the real model.** The pipeline ran end to end: seed -> flagged clause -> streamed hearing -> precedent reuse -> human ruling -> dissent -> workflow -> published.

The central claim of the product (that a second clause surfaces the first clause's precedent, and that the advocates actually use it) has been observed working, not inferred. See §2.

In addition, all Priority 1 items (Workflow Transition Audit Log, Sanity Studio Custom Document Views & App SDK Panel), Product & Legal Safety Disclaimers (PRD §31), Accessibility Enhancements (PRD §32), and the Automated Unit Test Suite (PRD §40) are complete and verified live.

---

## 2. Runtime Verification Log

Verified against project `tmics7hc` / dataset `production` at `localhost:3000`.

### Credentials

| Check | Result |
|---|---|
| Sanity token identity | developer robot, read/write on `production` |
| Sanity dataset | exists, public |
| Gemini key | valid, models listable |
| `gemini-2.0-flash` | **HTTP 404 - retired.** `"This model ... is no longer available"` |
| `gemini-2.5-flash` | HTTP 200 |

The model was moved to `gemini-2.5-flash` and is selected through a single `GEMINI_MODEL` env var read in one place (`src/lib/debate/gemini.ts`), defaulting to `gemini-2.5-flash`.

### Seed - `POST /api/seed`

Fixed reference ordering: clauses were originally written with `citedPrecedent` references before the precedent document existed, which Sanity reference integrity rejected. Fixed by writing clauses, attaching citation edges once the precedent exists, and asserting that zero clauses hold a dangling reference.

Current result:

```json
{ "success": true, "definitions": 4, "clauses": 12, "interpretations": 2,
  "debates": 1, "rulings": 1, "precedents": 1, "flaggedClauses": 3,
  "ambiguousTerms": ["appropriate","Priority","when appropriate",
                     "as determined","reasonable","promptly","material"] }
```

Verified in the stored dataset: 12 clauses, 8 `draft`, **3 `flagged`** (PRD asks 2-3), 1 `ruled`, and the refund chain resolving end to end.

### `/graph`

Fixed GROQ null array handling with `coalesce(..., [])` on every list projection so clauses without citations do not cause runtime errors. `/graph` returns 200 and renders the interactive force-directed graph.

### Streamed Hearing - `GET /api/debate/stream/clause-service-interruption`

The killer demo, observed:

- SSE frames: `meta` x1, `token` x17, `done` x1: real incremental token streaming.
- Precedent surfaced: **"Reasonable Time in Refund Policy", HIGH, relevance 100%**, matched on term `reasonable`.
- Both advocates cited it independently.
- Every `textualEvidence` quote resolved verbatim against the clause text, so the anti-fabrication gate passed rather than silently dropping claims.
- Two genuinely opposed interpretations ("Immediate Service Restoration and Swift Customer Notification" vs "Operational Flexibility in Restoration and Notification"): the 75% overlap rejection did not fire, correctly.

### Ruling - `POST /api/ruling` with the returned `debateId`

- HTTP 200. Ruling, dissent, and a new precedent all persisted.
- Dissent authored by the losing advocate (B), grounded in the actual arguments.
- `clauseRevisionSuggested: true` with a concrete revised clause text.
- New precedent's `citesPrecedent` correctly resolves to `precedent-refund-reasonable-time`; `applicableTerms` = `reasonable, promptly`.

### Workflow - Human Approval Gate & Audit Trail

| Request | Result |
|---|---|
| `ruled -> published` (skipping a step) | **409**, `Illegal workflow transition` |
| transitions offered to a human at `ruled` | `resolved` only: no pipeline steps |
| `ruled -> resolved` | 200 (logs reviewer name and rationale into transitionLog) |
| `resolved -> published` | 200 (logs reviewer name and publication note into transitionLog) |

The gate and audit log are enforced in code, not merely hidden in the UI.

### Failure Paths

| Request | Result |
|---|---|
| Ruling with no `judgeName` | 400 - *"A judge name is required - rulings must be attributable to a person"* |
| Ruling with a fabricated `debateId` | 400 - refuses to rule on a hearing with no recorded arguments |
| Ruling against a clause in the wrong state | 409 |

Added `WorkflowViolationError` so routes answer 409/400 for a refusal and reserve 500 for genuine faults.

### All Routes

`/`, `/clauses`, `/graph`, `/precedents`, `/precedents/[id]`, `/clauses/[id]`, `/debate/[id]`: **all 200** against the seeded dataset.

---

## 3. Work Done (Completed Features)

### Priority 0 Core Pipeline (PRD §36)
- **Sanity Content Model**: 6 schema types (`definition`, `clause`, `interpretation`, `debate`, `ruling`, `precedent`). Read client + token-bearing write client (`useCdn: false` on writes).
- **Deterministic Ambiguity Engine** (`src/lib/ambiguity/detector.ts`):
  - Rule A vague quantifiers, Rule B missing definitions, Rule D conditional ambiguity.
  - Pure, rule-based, character-offset tracking. Singularization matching and defined-term head set suppression.
- **Seed Pipeline** (`src/lib/seed/`):
  - 12 clauses, 4 definitions, 3 ambiguity-flagged, 1 fully litigated chain.
  - `clause-refund-policy` -> 2 interpretations -> debate -> ruling -> `precedent-refund-reasonable-time`.
  - `clause-service-interruption` cites that precedent (the reuse demonstration).
  - Derived citation counts walked from the reference graph. Zero dangling references verified.
- **Debate Engine & Streaming** (`src/lib/debate/`):
  - Gemini `gemini-2.5-flash` in JSON mode with sequential prompt chaining (Advocate B counters Advocate A).
  - Real SSE streaming at `GET /api/debate/stream/[id]` with `meta`, `token`, `done`, and `error` frames.
- **Quality Gate** (`src/lib/debate/quality.ts`):
  - Drops fabricated quotes not appearing verbatim in clause text.
  - Drops hallucinated precedent titles not among supplied precedents.
  - Rejects debates with >75% Jaccard word overlap.
- **Ruling & Dissent Engine** (`src/lib/ruling/createRuling.ts`):
  - Attributable judicial ruling (requires judge name).
  - Post-ruling AI dissent generated by losing advocate (Persona C).
  - Structured precedent creation with lineage edges and citation recount.
- **Precedent System & Graph**:
  - `/precedents` library ranked by citations.
  - `/graph` force-directed D3 visualizer showing full reference lineage.

### Priority 1 Workflow Transition Audit Log (PRD §36 & §46)
- **Schema**: Added `transitionLog` array field to `clause` schema (`src/sanity/schemaTypes/clause.ts`) tracking timestamp, fromState, toState, actor, actorType (human, deterministic, system), and note.
- **Backend & APIs**:
  - `createRuling.ts`: Atomically appends judicial ruling (`debated -> ruled`) and advance records (`ruled -> resolved`, `resolved -> published`) with reviewer identity and rationale.
  - `runDebate.ts`: Atomically appends debate completion record (`flagged -> debated`).
  - `/api/workflow`: Validates and records reviewer name and notes on human gates, returning full transition log in GET/POST.
  - `ClauseWorkflowActions.tsx`: Appends audit log entries on Sanity Studio transitions.
- **UI**: Added reviewer identity/notes inputs in Human Approval Gate and rendered full `WorkflowAuditTrail` vertical timeline on `/clauses/[id]`. Verified live on `clause-refund-policy`.

### Priority 1 Sanity Studio Custom Document Views & App SDK Panel (PRD §36 & §46)
- Built `ClauseCourtPreview.tsx`: Live interactive preview tab inside Sanity Studio iframe linking to `/clauses/:id` with real-time refresh.
- Built `ClauseWorkflowPanel.tsx`: Studio workflow panel displaying state, progress stepper, human approval gate rules, and complete transition audit log.
- Wired into Studio structure via `defaultDocumentNode` in `src/sanity/structure.ts` and `sanity.config.ts`.

### Product & Legal Safety Disclaimers (PRD §31)
- Added explicit prototype disclaimer banner in the global footer (`src/app/layout.tsx`): "PROTOTYPE NOTICE · NOT LEGAL ADVICE (PRD §31): Clause Court is an experimental structured-content and policy review prototype..."
- Added warning callout banner directly in the Debate Chamber Judge Panel (`src/components/DebateChamber.tsx`) above judicial action buttons.

### Accessibility Enhancements (PRD §32)
- Added `:focus-visible` styling with 2px gold outlines across buttons, links, inputs, and textareas (`src/app/globals.css`).
- Added accessible skip link (`.skip-link`) navigating directly to `<main id="main-content">`.
- Added `.sr-only` utility for assistive screen readers.
- Added `@media (prefers-reduced-motion: reduce)` overrides disabling transitions and infinite pulsing animations.

### Core Logic Automated Test Suite (PRD §40)
- 4 test suites with 21 unit tests running via Node native test runner (`npm test`):
  - `tests/ambiguity.test.ts` (5 tests): Rule A quantifier detection, Rule D conditional ambiguity, Rule B suppression with definitions, clean text filtering.
  - `tests/quality.test.ts` (4 tests): Verbatim quote accuracy, fabricated quote dropping, hallucinated precedent dropping, >75% advocacy overlap rejection.
  - `tests/seed-integrity.test.ts` (5 tests): Scope integrity (12 clauses, 4 definitions, 3 flagged), definition reference resolution, litigated chain validation, zero dangling references.
  - `tests/workflow.test.ts` (7 tests): Lifecycle sequence, state indexing, human gate enforcement, illegal transition rejection, pipeline ownership, metadata completeness.

---

## 4. Work on Its Way / Waiting to Be Done

### Milestone 9 Polish & Submission (PRD §39 & §41)
- **Demo Video Recording**: 2-3 minute recorded walk-through following the demo script (§2) showing ambiguity detection, streaming debate, judicial ruling, precedent formation, and precedent reuse in Clause #0043.
- **Submission Writeup**: Formal writeup adhering strictly to the PRD §41 submission outline covering problem statement, architecture, deterministic vs AI boundaries, and hackathon deliverables.
- **Visual Capture Bundle**: High-resolution screenshots of the Dashboard, Debate Chamber, Precedent Graph, and Sanity Studio views for project submission artifacts.

### Production Authentication (PRD §36 Priority 2)
- **Scope Note**: Intentionally deferred for hackathon judging to allow frictionless evaluation.
- **Production Requirement**: Prior to commercial deployment, session or token-based authentication must be added to mutating endpoints:
  - `POST /api/workflow`: restrict human state transitions to authenticated reviewer accounts.
  - `POST /api/ruling`: verify judge identity against authenticated credentials.
  - `POST /api/seed`: protect or disable destructive database wipes on public deployments.

### End-to-End Browser Automation & Telemetry
- **Browser Automation Suite**: Automated Playwright or Cypress tests to run full end-to-end interactive journeys in CI.
- **Model Health Telemetry**: Structured alerting for Gemini API rate limits, quota exhaustion, and advocate streaming latency under high load.

---

## 5. Design Decisions Worth Knowing

Recorded because they will look like omissions later.

- **The ambiguity engine never uses a model.** The PRD central claim is that detection is deterministic and inspectable. Adding an LLM anywhere in `detectAmbiguity` would void the main differentiator.
- **The model cannot flag, rule, or resolve.** It only argues. Flagging is rule-based, ruling is human, resolution is human.
- **A ruling is never `resolved` by a pipeline.** `createRuling` deliberately stops at `ruled`.
- **Advocate B is given Advocate A's finished argument** so it responds rather than guessing at the opposition. This is why streaming is sequential: A must finish before B can answer.
- **Precedent is retrieved server-side, never by the client.** The browser never decides what precedent a debate sees.
- **Quality failures discard data rather than inventing replacements.** A fabricated quote is dropped, not "corrected". Better an empty evidence list than a plausible lie.
- **The live transcript shows raw JSON, not prose.** The model emits JSON; showing it as a court record is honest, and it is replaced by the formatted argument once parsed.
- **Derived numbers are recomputed, never incremented.** `citationCount` is walked from the reference graph; the seed's flagged count is read back from stored documents. Both once lied: `citationCount` by hand, the flagged count by counting the wrong set.
- **The model is configured in exactly one place.** Four hard-coded call sites had drifted onto a retired model that only a live call would reveal. `GEMINI_MODEL` is now the single switch.
- **A refusal is not a server fault.** Blocked-by-design is 409/400; only genuine failures are 500.
- **Workflow is a local state machine, not Sanity Workflows.** `@sanity/workflow` is not published on npm (`404`). Behaviour is identical for the product purposes and the state machine is shared by both surfaces, which is what actually matters.
- **The Studio is a separate dev server** (`npx sanity dev` on :3333), not embedded in the app router.
