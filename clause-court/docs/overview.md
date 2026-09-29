# Clause Court - Complete Project Overview

## What Is This?

**Clause Court** is an AI-powered courtroom for policy documents. Think of it as a system that:

1. **Finds** ambiguous language in policy and contract clauses (like "reasonable time" or "as needed")
2. **Stages a debate**: two AI advocates argue opposite sides of what the clause means
3. **Lets you judge**: you pick a side or write your own ruling
4. **Saves the ruling as precedent**: future clauses with similar language automatically reference your past decisions
5. **Audits every lifecycle transition**: every state change records an attributable timestamped log

The magic moment: when you open a second clause with similar wording and it says _"Previous ruling found: reasonable time = 30 calendar days."_ The AI advocates then factor that precedent into their arguments. Your past decisions shape future debates.

---

## The Big Picture

```
You write a clause
    ↓
The system scans it with hard-coded rules (no AI guesswork)
    ↓
[FLAG] "This clause uses 'reasonable time' - that is vague"
    ↓
You click "Enter Debate"
    ↓
AI Advocate A argues the customer-friendly interpretation
AI Advocate B argues the company/operations interpretation
    ↓
You read both arguments, then rule:
    • Adopt Side A
    • Adopt Side B
    • Write your own ruling
    ↓
[RULING] Ruling recorded -> becomes a Precedent
    ↓
Next time a clause uses "reasonable time", the system says:
"Precedent found - last time this was ruled as 30 calendar days"
```

---

## Tech Stack

| What | Technology |
|------|-----------|
| Frontend and Backend | **Next.js 16** with App Router (React 19, TypeScript) |
| Content Management | **Sanity CMS**: stores all clauses, debates, rulings, precedents, and audit logs |
| AI Model | **Google Gemini 2.5 Flash**: generates advocate arguments and dissents |
| Graph Visualization | **D3.js**: renders the precedent relationship graph |
| Styling | Vanilla CSS with a "Dark Judicial" design system and full accessibility controls |

---

## How the Code Is Organized

The project lives in `clause-court/`. Here is what each part does:

### Pages (what users see)

| Page | URL | What It Shows |
|------|-----|--------------|
| **Dashboard** | `/` | Stats overview: total clauses, flagged count, recent rulings, quick actions, demo reset button |
| **Clauses List** | `/clauses` | All clauses, filterable by status (draft, flagged, debated, ruled, resolved, published) |
| **Clause Detail** | `/clauses/[id]` | One clause with its ambiguity signals, linked precedent, current ruling, interactive audit trail timeline, and human approval gate |
| **Debate Chamber** | `/debate/[id]` | The main show: two advocates arguing side by side, with streaming text, precedent badges, judge ruling panel, and PRD §31 legal disclaimer |
| **Precedent Library** | `/precedents` | All human-approved rulings as browsable cards |
| **Precedent Detail** | `/precedents/[id]` | Full precedent record: holding, ruling, dissent, which clauses cite it |
| **Precedent Graph** | `/graph` | Visual force-directed graph showing how clauses, rulings, and precedents connect |

### API Routes (what happens behind the scenes)

| Route | What It Does |
|-------|-------------|
| `POST /api/debate` | Starts a debate: calls Gemini, validates arguments, saves to Sanity, logs transition |
| `GET /api/debate/stream/[id]` | Streams advocate text live via Server-Sent Events (SSE) - this is what the Debate Chamber uses |
| `POST /api/ruling` | Records your ruling: generates the dissent, creates the precedent, appends audit trail entry |
| `POST /api/seed` | Wipes everything and re-creates the demo dataset with a closed reference graph |
| `GET /api/workflow?clauseId=...` | Returns what workflow actions and transition audit logs are available for a clause |
| `POST /api/workflow` | Advances a clause to the next workflow state with reviewer identity validation |

### Core Engines (the brains)

#### 1. Ambiguity Detection Engine
**File:** `src/lib/ambiguity/detector.ts`

This is 100% deterministic: no AI involved. It scans clause text against coded rules:

- **Rule A (Vague Quantifier):** Flags words like "reasonable", "appropriate", "timely", "substantial", "promptly", "excessive" (19 flagged terms)
- **Rule B (Missing Definition):** Flags capitalized domain terms (like "Eligible Users" or "Priority Support") that lack a linked Definition document
- **Rule D (Conditional Ambiguity):** Flags phrases like "when appropriate", "as necessary", "at the company's discretion", "subject to availability"

If a term has a linked definition document, Rule B stays quiet. This is how the system knows "Eligible User" is defined but "Priority" is not.

#### 2. Debate Engine (Gemini Integration)
**Files:** `src/lib/debate/gemini.ts`, `runDebate.ts`, `quality.ts`

The debate flow:
1. **Find relevant precedent** for the clause (term overlap scoring)
2. **Generate Advocate A's argument** (customer-friendly perspective) via Gemini
3. **Generate Advocate B's argument** (operations perspective): B receives A's finished argument so it can genuinely counter it
4. **Quality gate checks:**
   - Remove quotes that do not actually appear in the clause (anti-hallucination)
   - Remove precedent citations that were not supplied
   - Check if both arguments are too similar (>75% Jaccard word overlap triggers regeneration)
5. **Save everything to Sanity**: interpretation docs, debate doc, transition audit entry, clause status updated to "debated"

#### 3. Precedent Relevance Engine
**Files:** `src/lib/precedent/findRelevant.ts`, `relevance.ts`

Scores how relevant an existing precedent is to a new clause:
- If the clause explicitly cites a precedent: score = 100 (always shown)
- Otherwise, score based on term overlap:
  - The flagged ambiguous term matches a precedent's `applicableTerms`: 75 base points
  - Extra flagged term matches: +10 each
  - Other term matches: +8 each
  - Precedent's holding mentions the term: +10
- **HIGH** relevance >= 70, **MEDIUM** 40-69, **LOW** < 40
- Only MEDIUM+ precedent enters the AI debate prompt (max 3)

#### 4. Ruling Engine
**File:** `src/lib/ruling/createRuling.ts`

When you submit a ruling:
1. Validates the clause is in `debated` state (cannot rule on something that has not been debated)
2. Reads advocate arguments from the stored debate, never from the browser request
3. Creates the ruling document in Sanity
4. Generates a **dissent** from the losing advocate via Gemini (Persona C): a short, respectful note about operational implications
5. Creates a **precedent** document with the terms it settles and a lineage of what precedent it was argued against
6. Appends a transition log entry noting the judge and rationale
7. Updates the clause to `ruled` status (NOT `resolved` - that requires separate human approval)
8. Recounts citation counts across all precedents

---

## Workflow: The State Machine and Audit Trail

Every clause walks through this lifecycle:

```
Draft -> Flagged -> Debated -> Ruled -> Resolved -> Published
```

**Who controls each transition:**

| Transition | Who | Why | Audit Recorded |
|-----------|-----|-----|----------------|
| Draft -> Flagged | The ambiguity engine (code) | A rule fired | Yes (Rule signal summary) |
| Flagged -> Debated | The debate pipeline (code) | Both advocates produced arguments | Yes (Hearing completed) |
| Debated -> Ruled | **You** (human) | You selected or wrote a ruling | Yes (Judge name and holding) |
| Ruled -> Resolved | **You** (human) | You approved the ruling and closed the case | Yes (Reviewer identity and notes) |
| Resolved -> Published | **You** (human) | You released the clause for publication | Yes (Reviewer identity and notes) |

**The key rule:** The system can never skip from `debated` to `resolved` automatically. A ruling always requires human action. This is the "human approval gate."

In **Sanity Studio**, the default Publish button is replaced with workflow-specific actions, and the custom document views include:
1. **Interactive App Preview** (`ClauseCourtPreview.tsx`): opens a live preview of the clause inside Sanity Studio.
2. **Workflow and Audit Panel** (`ClauseWorkflowPanel.tsx`): displays the current state stepper, gate constraints, and the full historical audit log.

---

## Safety and Accessibility

### Legal and Product Safety Disclaimers (PRD §31)
- **Global Footer**: A prominent prototype notice explaining that Clause Court is an experimental policy review tool, not legal counsel.
- **Judge Panel Notice**: An advisory notice right above the ruling submission controls reminding reviewers that generated arguments are adversarial stress-tests.

### Accessibility (PRD §32)
- High-contrast `:focus-visible` gold outline rings for keyboard navigation.
- Accessible skip-link allowing keyboard users to bypass navigation straight to `#main-content`.
- Screen-reader-only utility classes (`.sr-only`).
- Full support for `prefers-reduced-motion` to disable animations for users sensitive to motion.

---

## Automated Test Suite (PRD §40)

Clause Court includes 21 automated unit tests across 4 test suites running on Node's native test runner (`npm test`):

1. **`tests/ambiguity.test.ts`** (5 tests):
   - Validates Rule A vague quantifier detection ("reasonable", "promptly").
   - Validates Rule D conditional ambiguity detection ("when appropriate").
   - Validates Rule B missing definition suppression when definitions exist.
   - Confirms clean clauses are not erroneously flagged.
2. **`tests/quality.test.ts`** (4 tests):
   - Verifies genuine disagreement and accurate quotes pass.
   - Drops fabricated quotes not appearing verbatim in clause text.
   - Drops hallucinated precedent titles.
   - Rejects debates with more than 75% argument overlap.
3. **`tests/seed-integrity.test.ts`** (5 tests):
   - Confirms dataset scope (12 clauses, 4 definitions, exactly 3 flagged).
   - Verifies all definition references resolve to real documents.
   - Validates the complete litigated reference chain.
   - Ensures zero dangling precedent references.
4. **`tests/workflow.test.ts`** (7 tests):
   - Enforces the 6-stage lifecycle sequence.
   - Validates state indexing and type guards.
   - Prohibits automated pipelines from bypassing the human gate (`ruled -> resolved`).
   - Verifies deterministic pipeline boundaries and metadata.

---

## The Sanity Data Model

Six document types, all interconnected:

```
┌─────────────┐     ┌────────────────┐     ┌─────────┐
│   Clause    │────▶│ Interpretation │     │Definition│
│             │     │  (A or B)      │     │         │
│ title       │     │ title          │     │ term    │
│ text        │     │ argument       │     │ definition│
│ status      │     │ textualEvidence│     └─────────┘
│ ambiguity   │     │ citedPrecedent │          │
│ Signals[]   │     └────────────────┘     linked via
│ definitions▶│◀──────────┐                  reference
│ citedPrec.▶ │     ┌─────┴──────┐
│ debates▶    │     │   Debate   │
│ currentRul.▶│     │ interpA▶   │
│ transLog[]  │     │ interpB▶   │
└─────────────┘     │ status     │
       ▲            └────────────┘
       │                  │
       │            ┌─────▼──────┐     ┌────────────┐
       └────────────│  Ruling    │────▶│ Precedent  │
                    │ judgeName   │     │ title      │
                    │ customRuling│     │ holding    │
                    │ reasoning  │     │ applicable │
                    │ dissent    │     │  Terms[]   │
                    │ dissentAdv │     │ citesPre.▶ │
                    └────────────┘     │ citationCt │
                                       └────────────┘
                                            ▲  │
                                            └──┘ (lineage)
```

---

## The Seed Dataset (Demo Data)

When you click "Reset Demo" or call `POST /api/seed`, the system rebuilds everything from scratch:

- **12 clauses**: 3 are deliberately ambiguous (refund policy, service interruption, priority support), 9 are clean
- **4 definitions**: Enterprise, Business Day, Eligible User, Force Majeure
- **1 fully litigated case**: the refund policy clause has been through the whole cycle:
  - 2 interpretations (Advocate A: "30 days for the customer", Advocate B: "short operational window")
  - 1 ruling by Judge Priya Raman: "reasonable time = 30 calendar days"
  - 1 precedent created from that ruling
- **Clause #0043** (Service Interruption) already cites the refund precedent: this is the "killer demo" clause

The seed process runs the actual ambiguity engine on every clause, so the dashboard shows real signal counts from the first page load.

---

## Running the Project

### Environment Setup

Create `clause-court/.env.local`:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your-write-token
GEMINI_API_KEY=your-gemini-api-key
# Optional:
GEMINI_MODEL=gemini-2.5-flash
```

### Commands

```bash
cd clause-court

# Install dependencies
npm install

# Run automated unit test suite
npm test

# Run Next.js dev server
npm run dev

# Run Sanity Studio (separate terminal)
npx sanity dev

# Seed demo data (or use the "Reset Demo" button in the UI)
# POST to http://localhost:3000/api/seed
```

---

## Demo Script (2-3 minutes)

1. **0:00-0:20 - The Problem:** Open the dashboard. "Policies contain phrases that sound clear until two people interpret them differently." Open the flagged refund clause.

2. **0:20-0:40 - Detection:** Show the ambiguity signal: "Vague quantifier: reasonable." Explain this is rule-based, not AI deciding.

3. **0:40-1:20 - Debate:** Click "Enter Debate." Two advocates stream their arguments live. Show they cite exact clause text. Note: no precedent exists yet.

4. **1:20-1:45 - Ruling:** Open the judge panel. Write a custom ruling: "Reasonable time = 30 calendar days." Submit. Gavel animation plays. The dissent appears below.

5. **1:45-2:05 - Precedent:** Open the precedent. Show it is a first-class Sanity document with holding, reasoning, applicable terms.

6. **2:05-2:35 - The Killer Moment:** Open Clause #0043 (Service Interruption). The system shows "Related Precedent: Reasonable Time = 30 calendar days." Start the debate. The advocates reference the prior ruling. _This debate cites a previous human ruling._ Finish on the graph page showing the chain: Clause A -> Ruling A -> Precedent A -> Clause B.

---

## Design: Dark Judicial Theme

| Element | Value |
|---------|-------|
| Background | `#0D0F14` deep charcoal |
| Panel background | `#131720` dark navy |
| Gold accent | `#C9A84C` judicial gold |
| Advocate A | `#3B82F6` cool blue |
| Advocate B | `#F59E0B` warm amber |
| Success/Ruling | `#10B981` emerald |
| Danger/Flagged | `#EF4444` crimson |
| Body font | Inter |
| Heading font | Playfair Display |
| Mono font | JetBrains Mono |

---

## Core Principle

> **AI generates arguments. Structure preserves institutional memory. Humans make the ruling.**

That separation is the core of Clause Court. The AI is powerful but never authoritative. The human is always the final word. And Sanity is the persistent memory that makes past decisions reusable.

---

## Work Done vs Work Waiting to Be Done

### What Has Been Done

1. **End-to-End Core Loop (Priority 0)**:
   - Complete ambiguity scanning, SSE streaming debate, quality gate, judicial ruling, dissent generation, precedent creation, and graph visualizer.
2. **Workflow Transition Audit Log (Priority 1)**:
   - Full audit trail schema, backend atomic logging, Studio integration, and interactive vertical timeline UI on clause details with reviewer inputs.
3. **Sanity Studio Custom Document Views (Priority 1)**:
   - Live interactive Next.js app preview tab and workflow inspector panel inside Sanity Studio.
4. **Safety Disclaimers (PRD §31)**:
   - Global footer disclaimer and Judge Chamber advisory banner.
5. **Accessibility Standards (PRD §32)**:
   - Focus ring indicators, skip navigation link, screen reader utilities, and reduced motion overrides.
6. **Automated Test Suite (PRD §40)**:
   - 21 unit tests across 4 test suites verifying pure functions, seed integrity, quality gates, and state machine transitions.

### What Is on Its Way / Waiting to Be Done

1. **Milestone 9 Polish & Submission Assets**:
   - Demo video recording following the 2-3 minute script.
   - Final submission writeup per PRD §41 specifications.
   - Screen capture imagery bundle.
2. **Production Authentication (Priority 2)**:
   - Currently open for hackathon judging convenience.
   - Production deployment will require session/token authentication on mutation endpoints (`/api/workflow`, `/api/ruling`, `/api/seed`).
3. **End-to-End Browser Testing**:
   - Browser automation tests for automated regression verification across all interactive views.
