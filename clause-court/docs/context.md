# CLAUSE COURT - AI AGENT CONTEXT

> **Purpose of this file:** Structured context for AI coding agents. Optimized for fast parsing, not human readability. For the human-readable version see `overview.md` in this same directory.

---

## IDENTITY

- **Product:** Clause Court (The Debate Chamber)
- **One-liner:** An AI courtroom where two AI advocates argue ambiguous policy clauses, a human judge rules, and every ruling becomes persistent precedent that shapes future debates.
- **Target:** Sanity Challenge 2026 - Path Two: Vibe-Code Something Strange
- **Stack:** Next.js 16 (App Router) + Sanity CMS + Google Gemini API + TypeScript
- **AI Model:** Gemini 2.5 Flash (configurable via `GEMINI_MODEL` env var)
- **Design System:** Dark Judicial theme: charcoal backgrounds, judicial gold accents, Inter + Playfair Display fonts

---

## CORE PRODUCT LOOP

```
CREATE/EDIT CLAUSE
      ↓
DETERMINISTIC AMBIGUITY CHECK (Rule A: vague quantifiers, Rule B: missing definitions, Rule D: conditional ambiguity)
      ↓
AMBIGUITY FLAG (clause status: draft → flagged)
      ↓
DEBATE CHAMBER (clause status: flagged → debated)
      ↓
AI INTERPRETATION A (customer-friendly)  <->  AI INTERPRETATION B (operations-focused)
      ↓
PRECEDENT / EVIDENCE CITED
      ↓
HUMAN JUDGE RULES (clause status: debated → ruled)
      ↓
RULING DOCUMENT + DISSENT (Persona C, post-ruling)
      ↓
PREDECEDENT DOCUMENT CREATED
      ↓
CLAUSE RESOLVED (clause status: ruled → resolved - HUMAN APPROVAL GATE)
      ↓
FUTURE CLAUSE CITES PRECEDENT → cycle repeats
```

**Killer feature:** A human ruling becomes structured precedent that changes a future AI debate. The second debate citing the first ruling is the demo proof.

---

## RESPONSIBILITY BOUNDARIES

| Layer | Owns | Must NEVER Do |
|---|---|---|
| **Deterministic (code)** | Ambiguity flagging, rule detection, precedent references, workflow transitions, data integrity, relevance scoring | Delegate detection to the LLM |
| **AI (Gemini)** | Interpretation generation, opposing arguments, natural-language explanation, dissent | Issue a ruling, invent precedent, fabricate evidence |
| **Human** | Final ruling, custom resolution, workflow approval (`ruled → resolved`, `resolved → published`) | Be bypassed by AI or automatic code |

---

## WORKFLOW STATE MACHINE & TRANSITION AUDIT LOG

```
draft → flagged → debated → ruled → resolved → published
```

| Transition | Owner | Confirmation Required | Audit Log Entry Created |
|---|---|---|---|
| `draft → flagged` | deterministic | No | Yes (deterministic ambiguity engine) |
| `flagged → debated` | deterministic | No | Yes (hearing concluded by dual advocates) |
| `debated → ruled` | **human** | **Yes** | Yes (judicial ruling recorded with judge identity) |
| `ruled → resolved` | **human** | **Yes** (APPROVAL GATE) | Yes (reviewer identity and operational rationale required) |
| `resolved → published` | **human** | **Yes** | Yes (reviewer identity and publication notes required) |

**Source of truth:** `src/sanity/workflow.ts` - shared between Next.js app and Sanity Studio.
**Audit trail:** Persisted in `clause.transitionLog[]` containing `{ timestamp, from, to, actor, actorType, note }`.

---

## DIRECTORY STRUCTURE

```
clause-court/
├── sanity.config.ts          # Sanity Studio config (schema, desk structure, custom actions, defaultDocumentNode)
├── sanity.cli.ts             # Sanity CLI config
├── package.json              # Next.js 16, @google/generative-ai, @sanity/client, d3, reactflow, test scripts
├── tests/                    # Native Node test runner suite (PRD §40)
│   ├── ambiguity.test.ts     # Pure unit tests for deterministic detection (Rules A, B, D)
│   ├── quality.test.ts       # Pure unit tests for anti-fabrication quality gate
│   ├── seed-integrity.test.ts # Seed graph closure, reference integrity, scope validation
│   └── workflow.test.ts      # State machine lifecycle sequence, human gate guards
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout (Navigation, footer disclaimer banner, a11y skip link)
│   │   ├── globals.css       # Design system, :focus-visible rings, reduced motion, a11y classes
│   │   ├── page.tsx          # Dashboard (server component → DashboardClient)
│   │   ├── DashboardClient.tsx # Dashboard UI (stats grid, recent rulings, demo reset)
│   │   ├── clauses/
│   │   │   ├── page.tsx      # Clause list (server fetch → ClauseListClient)
│   │   │   ├── ClauseListClient.tsx # Filterable clause list with status badges
│   │   │   └── [id]/
│   │   │       ├── page.tsx  # Clause detail (runs ambiguity engine + precedent finder)
│   │   │       └── ClauseDetailClient.tsx # Clause detail UI (signals, precedent, audit timeline, approval gate)
│   │   ├── debate/
│   │   │   └── [id]/
│   │   │       └── page.tsx  # Debate chamber page (loads clause + existing debate + precedent)
│   │   ├── precedents/
│   │   │   ├── page.tsx      # Precedent library (server fetch → PrecedentLibrary)
│   │   │   ├── PrecedentLibrary.tsx # Precedent cards with citations
│   │   │   └── [id]/
│   │   │       ├── page.tsx  # Precedent detail (server fetch → PrecedentDetailClient)
│   │   │       └── PrecedentDetailClient.tsx # Full precedent with ruling, dissent, citations
│   │   ├── graph/
│   │   │   ├── page.tsx      # Graph page (server fetch → PrecedentGraph)
│   │   │   └── PrecedentGraph.tsx # D3.js force-directed precedent graph
│   │   └── api/
│   │       ├── debate/
│   │       │   ├── route.ts  # POST /api/debate: non-streaming hearing
│   │       │   └── stream/[id]/
│   │       │       └── route.ts # GET /api/debate/stream/[id]: SSE streaming hearing
│   │       ├── ruling/
│   │       │   └── route.ts  # POST /api/ruling: record human ruling + generate dissent + create precedent + audit log
│   │       ├── seed/
│   │       │   └── route.ts  # POST /api/seed: one-click demo reset with closed reference graph
│   │       └── workflow/
│   │           └── route.ts  # GET/POST /api/workflow: query/advance workflow state with reviewer identity validation
│   ├── components/
│   │   ├── Navigation.tsx    # Top nav bar (Dashboard, Clauses, Precedents, Graph)
│   │   └── DebateChamber.tsx # Visual centerpiece: dual-panel debate, SSE streaming, judge panel, safety notice
│   ├── lib/
│   │   ├── sanity/
│   │   │   └── client.ts     # Sanity clients (read/write) + GROQ queries with transitionLog projections
│   │   ├── ambiguity/
│   │   │   └── detector.ts   # Deterministic ambiguity detection engine (Rules A, B, D)
│   │   ├── debate/
│   │   │   ├── gemini.ts     # Gemini API integration (advocate prompts, streaming, dissent)
│   │   │   ├── quality.ts    # Debate quality gate (fabricated quote removal, similarity check, precedent validation)
│   │   │   └── runDebate.ts  # Debate orchestration (precedent retrieval → generation → validation → persistence → audit log)
│   │   ├── precedent/
│   │   │   ├── findRelevant.ts  # Precedent retrieval (explicit citations + inferred relevance)
│   │   │   └── relevance.ts    # Deterministic relevance scoring engine (HIGH/MEDIUM/LOW badges)
│   │   ├── ruling/
│   │   │   └── createRuling.ts # Ruling engine (ruling → dissent → precedent → workflow transition → audit log)
│   │   └── seed/
│   │       ├── dataset.ts    # 12 seed clauses, 4 definitions, 2 interpretations, 1 ruling, 1 precedent, seed audit logs
│   │       └── seed.ts       # Seed executor (wipe → rebuild in dependency order → verify references)
│   ├── sanity/
│   │   ├── schemaTypes/
│   │   │   ├── index.ts      # Schema registry (exports all 6 types)
│   │   │   ├── clause.ts     # Clause schema (content, analysis, graph, workflow, transitionLog)
│   │   │   ├── interpretation.ts # Interpretation schema (argument, evidence, graph groups)
│   │   │   ├── debate.ts     # Debate schema (clause ref, both interpretations, status)
│   │   │   ├── ruling.ts     # Ruling schema (holding, dissent, graph groups)
│   │   │   ├── precedent.ts  # Precedent schema (holding, scope, graph groups)
│   │   │   └── definition.ts # Definition schema (term, definition, category)
│   │   ├── components/
│   │   │   ├── ClauseCourtPreview.tsx # Live interactive Next.js app iframe tab inside Sanity Studio
│   │   │   └── ClauseWorkflowPanel.tsx # Studio App SDK workflow panel: state stepper, gate rules, audit log
│   │   ├── workflow.ts       # Workflow state machine (states, transitions, guards, errors)
│   │   ├── structure.ts      # Studio desk structure with defaultDocumentNode view routing
│   │   └── ClauseWorkflowActions.tsx # Custom document actions (appends audit log entries on transitions)
│   └── types/
│       └── index.ts          # All TypeScript interfaces including WorkflowTransitionLogEntry
```

---

## SANITY CONTENT MODEL (6 document types)

### `clause`
The unit of policy language under review.
- `title`, `text`, `category`, `caseNumber`, `status` (workflow state)
- `ambiguitySignals[]`: written by deterministic engine only, readOnly in Studio
- `definitions[]` -> Reference to `definition` (satisfies Rule B)
- `citedPrecedent[]` -> Reference to `precedent` (the graph edge)
- `debates[]` -> Reference to `debate`
- `currentRuling` -> Reference to `ruling`
- `transitionLog[]`: full audit trail of all lifecycle transitions with timestamps, actors, actorType, and notes

### `definition`
Structured definition for a domain term. Linked to a clause to suppress Rule B.
- `term`, `definition`, `category` (tier/time/metric/entitlement/other)

### `interpretation`
One advocate's reading of a clause. Generated by Gemini.
- `clause` -> Reference to `clause`
- `side` ('A' | 'B')
- `title`, `summary`, `argument`
- `textualEvidence[]`: verbatim quotes from the clause
- `citedPrecedent[]` -> Reference to `precedent` (validated, never fabricated)

### `debate`
A single hearing: two advocates arguing.
- `clause` -> Reference to `clause`
- `interpretationA`, `interpretationB` -> Reference to `interpretation`
- `status` (pending/active/completed)
- `startedAt`, `completedAt`

### `ruling`
A human decision. The only document that constitutes authoritative interpretation.
- `clause` -> Reference to `clause`
- `debate` -> Reference to `debate` (arguments are read back from this)
- `chosenInterpretation` -> Reference to `interpretation` (or null for custom)
- `customRuling`, `reasoning`, `judgeName`
- `dissent` (AI-generated, readOnly), `dissentAdvocate` ('A' | 'B')
- `clauseRevisionSuggested`, `suggestedRevision`
- `precedentId` (denormalized pointer to created precedent)

### `precedent`
A human ruling promoted to reusable institutional reasoning.
- `ruling` -> Reference to `ruling`
- `sourceClause` -> Reference to `clause`
- `title`, `holding`, `reasoning`
- `applicableTerms[]`: the retrieval key for future debates
- `citesPrecedent[]` -> Reference to `precedent` (the lineage/graph edge)
- `relevanceScore` (0-100, cached peak), `citationCount` (derived, never hand-incremented)

### Reference Graph
```
Clause -> has -> Interpretations
Clause -> resultedIn -> Ruling -> creates -> Precedent -> citedBy -> Future Clause
Clause -> cites -> Precedent
Precedent -> citesPrecedent -> Earlier Precedent
```

---

## KEY FUNCTIONS - CALL GRAPH

### Ambiguity Detection (`src/lib/ambiguity/detector.ts`)
- `detectAmbiguity(clauseText, definitions)` -> `AmbiguityReport`
  - Rule A: regex match against `VAGUE_QUANTIFIERS` list (19 terms)
  - Rule B: capitalized domain terms not covered by linked `definition` documents
  - Rule D: `CONDITIONAL_AMBIGUITY_PHRASES` match (10 phrases)
  - Returns `{ flagged: boolean, signals: AmbiguitySignal[], analyzedAt: string }`
- `highlightAmbiguousTerms(text, signals)`: returns HTML with `<mark>` tags

### Debate Engine (`src/lib/debate/`)
- `runDebate(clauseId, clauseText, signals)` -> `DebateRunResult`
  1. `getPrecedentForDebate()`: retrieves and ranks precedent
  2. `generateDebate()`: calls Gemini for Advocate A then B (A's argument given to B)
  3. `validateDebate()`: quality gate (remove fabricated quotes, verify precedent, check similarity)
  4. `persistDebate()`: creates interpretation docs, debate doc, patches clause status to `debated`, writes transition log
  5. `refreshPrecedentStats()`: updates relevance scores
- `runDebateStreaming(...)`: same pipeline but tokens pushed via SSE callback
- `generateInterpretationStream(side, ...)`: streams one advocate via Gemini `generateContentStream`

### Quality Gate (`src/lib/debate/quality.ts`)
- `filterFabricatedQuotes(quotes, clauseText)`: drops quotes not in source
- `filterUnsuppliedPrecedent(claims, supplied)`: drops precedent not given to advocates
- `argumentSimilarity(a, b)`: Jaccard on significant words
- `validateDebate(debate, clauseText, suppliedPrecedent)`: repairs or throws `DebateQualityError`

### Precedent Relevance (`src/lib/precedent/`)
- `findRelevantPrecedent(clauseId, clauseText, signals)` -> `PrecedentWithRelevance[]`
  - Explicit citations (from clause's `citedPrecedent`) = score 100
  - Inferred: `computePrecedentRelevance()` scoring based on term overlap
- `computePrecedentRelevance(clauseText, signals, precedent)`: scoring:
  - Matched flagged term base: 75 points
  - Additional flagged terms: +10 each (max 2)
  - Corroborating terms: +8 each (max 3)
  - Holding names the term: +10
  - Badges: HIGH (>=70), MEDIUM (40-69), LOW (<40)
- `selectDebatePrecedent()`: only MEDIUM+ enters the prompt (<=3 precedents)

### Ruling Engine (`src/lib/ruling/createRuling.ts`)
- `createRuling(input)` -> `CreateRulingResult { ruling, precedent, citesPrecedent }`
  1. Validates clause exists and is in correct workflow state
  2. Loads advocate arguments from stored debate (never from request body)
  3. `assertHumanTransition(status, 'ruled')`: workflow guard
  4. Creates ruling document in Sanity
  5. `attachDissent()`: generates dissent via Gemini, patches ruling
  6. Creates precedent document (with `applicableTerms`, `citesPrecedent` lineage)
  7. Patches clause to `ruled` status, sets `currentRuling`, appends audit log entry
  8. `recountCitations()`: recomputes all `citationCount` from graph
- `advanceClauseWorkflow(clauseId, to, context)`: human-only workflow transitions with audit logging

### Seed System (`src/lib/seed/`)
- `seedDemoData()` -> `SeedResult`
  - Wipes all 6 document types
  - Creates in dependency order: definitions -> clauses -> interpretations -> debate -> ruling -> precedent
  - Runs `detectAmbiguity()` at seed time (signals on first load)
  - Attaches citation edges after precedent exists
  - Populates initial transition log records
  - Verifies zero dangling references

---

## API ROUTES

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/debate` | Non-streaming hearing (for scripted use) |
| `GET` | `/api/debate/stream/[id]` | SSE streaming hearing (browser) |
| `POST` | `/api/ruling` | Record human ruling + dissent + precedent + audit log |
| `POST` | `/api/seed` | One-click demo reset with graph verification |
| `GET` | `/api/workflow?clauseId=...` | Query available human transitions and transitionLog |
| `POST` | `/api/workflow` | Advance clause workflow state (validates reviewer identity and note) |

---

## GROQ QUERIES (defined in `src/lib/sanity/client.ts`)

- `CLAUSE_LIST_QUERY`: all clauses with status, signals, current ruling, cited precedent, transitionLog
- `CLAUSE_BY_ID_QUERY`: single clause with definitions, debates, ruling with dissent, transitionLog
- `DEBATE_BY_CLAUSE_QUERY`: latest debate for a clause with both interpretations, ruling, precedent
- `PRECEDENT_LIST_QUERY`: all precedents with ruling, source clause, citations, citedBy clauses
- `PRECEDENT_BY_ID_QUERY`: single precedent with full ruling, source clause, citedBy
- `DASHBOARD_QUERY`: aggregate stats (counts) + 5 recent rulings
- `GRAPH_QUERY`: lightweight nodes/edges for the D3 visualization

---

## ENVIRONMENT VARIABLES

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Yes | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Yes | Sanity dataset (default: `production`) |
| `SANITY_API_TOKEN` | Yes | Write token (server-side only) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key (server-side only) |
| `GEMINI_MODEL` | No | Model ID (default: `gemini-2.5-flash`) |

---

## SEED DATASET

- **12 clauses** (3 flagged: refund policy, service interruption, priority support; 9 clean)
- **4 definitions** (Enterprise, Business Day, Eligible User, Force Majeure)
- **2 interpretations** (Advocate A + B for the refund policy clause)
- **1 debate** (refund policy, completed)
- **1 ruling** (refund policy: "reasonable time = 30 calendar days", judge: Priya Raman)
- **1 precedent** (Reasonable Time in Refund Policy, cited by clause #0043)
- **Closed reference graph**: verified via automated test suite and seed validator

---

## DESIGN TOKENS (from `globals.css`)

- Background: `#0D0F14` (deep charcoal), panels: `#131720`
- Gold accent: `#C9A84C` / `#D4AF37`
- Advocate A (blue): `#3B82F6`
- Advocate B (amber): `#F59E0B`
- Success: `#10B981`, Danger: `#EF4444`
- Fonts: Inter (body), Playfair Display (headings), JetBrains Mono (code/labels)
- Focus rings: 2px solid gold outline with 2px offset (`:focus-visible`)
- Reduced motion: `@media (prefers-reduced-motion: reduce)` overrides for all keyframe animations

---

## IMPORTANT IMPLEMENTATION NOTES

1. **Sanity Studio runs separately**: no `/studio` route in Next.js. Run via `npx sanity dev`.
2. **All write operations are server-side**: the `sanityClient` with token is never exposed to the browser.
3. **Ambiguity detection is deterministic**: never delegated to LLM. Runs on every clause detail page render.
4. **Advocate B receives Advocate A's finished argument**: B genuinely responds rather than guessing.
5. **Quality gate removes fabricated content**: quotes not in clause text are dropped, precedent not supplied is dropped, >75% similarity triggers regeneration.
6. **Ruling reads arguments from stored debate**: never from request body. A ruling that quotes an argument the court never heard is a fabricated record.
7. **`citationCount` is derived**: recomputed by `recountCitations()` from actual references, never hand-incremented.
8. **Workflow violations return 409 Conflict**: not 500. A refused transition is the state machine working.
9. **Dissent failure degrades gracefully**: a ruling is valid without a dissent. The UI omits the dissent block rather than showing a placeholder.
10. **The seeder runs the actual ambiguity engine**: signals on first load are real, not hardcoded.
11. **Human gates require attributable identity**: transitioning `ruled -> resolved` requires an actor name and review notes for auditability.

---

## CURRENT STATUS: COMPLETED WORK VS WORK WAITING TO BE DONE

### Work Completed

1. **Priority 0 End-to-End Pipeline (PRD §36)**:
   - Deterministic ambiguity scanning (Rules A, B, D).
   - Real SSE streaming debate chamber with sequential advocacy.
   - Anti-fabrication quality gate (quote matching, precedent verification, overlap filter).
   - Human ruling recording with AI dissent (Persona C) and structured precedent creation.
   - Precedent graph generation with D3 force-directed visualizer.
   - Citation recount and dependency-ordered seed pipeline.

2. **Priority 1 Workflow Transition Audit Log (PRD §36 & §46)**:
   - Schema field `transitionLog` on clauses.
   - Full audit trail captured across backend, Studio, and UI.
   - Interactive `WorkflowAuditTrail` component on clause details with reviewer identity inputs.

3. **Priority 1 Sanity Studio Custom Views & App SDK Panel (PRD §36 & §46)**:
   - `ClauseCourtPreview.tsx`: live interactive application preview inside Sanity Studio.
   - `ClauseWorkflowPanel.tsx`: Studio workflow inspector, progress stepper, and audit log viewer.
   - Wired via `defaultDocumentNode` in `src/sanity/structure.ts`.

4. **Product & Legal Safety Disclaimers (PRD §31)**:
   - Prototype notice banner in root layout footer.
   - Advisory notice callout in Debate Chamber judge panel.

5. **Accessibility Enhancements (PRD §32)**:
   - `:focus-visible` styling on all interactive controls.
   - Keyboard skip-link to `#main-content`.
   - `.sr-only` utility for screen readers.
   - `@media (prefers-reduced-motion: reduce)` overrides for all animations.

6. **Core Logic Automated Test Suite (PRD §40)**:
   - 21 unit tests across 4 suites (`tests/ambiguity.test.ts`, `tests/quality.test.ts`, `tests/seed-integrity.test.ts`, `tests/workflow.test.ts`).
   - Integrated into `package.json` (`npm test`). Passing 100% clean.

### Work On Its Way / Waiting to Be Done

1. **Milestone 9 Polish & Submission Assets (PRD §39 & §41)**:
   - Demo video recording (2-3 minute scripted walk-through demonstrating the killer flow).
   - Submission writeup formatted strictly per PRD §41 requirements.
   - Screenshots and UI capture artifact bundle.

2. **Production Authentication Layer (PRD §36 Priority 2)**:
   - Explicitly deferred for hackathon submission to allow frictionless judge evaluation.
   - Needs session/role authentication on `POST /api/workflow`, `POST /api/ruling`, and `POST /api/seed` prior to commercial deployment.

3. **End-to-End Browser Automation**:
   - Playwright/Cypress end-to-end browser tests testing the complete interactive click-through from dashboard to ruling to graph.

4. **Advanced Model Monitoring**:
   - Telemetry logging for Gemini quota exhaustion, rate limiting, and advocacy generation latency.
