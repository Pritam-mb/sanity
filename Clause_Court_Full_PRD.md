# Product Requirements Document
# The Debate Chamber — Clause Court

**Version:** 1.1 (Enhanced)  
**Status:** Build-ready PRD — Updated with UX & Architecture Enhancements  
**Target:** Sanity Challenge 2026 — Path Two: Vibe-Code Something Strange  
**Submission deadline:** October 4, 2026  
**Primary stack:** Next.js + Sanity + Google Gemini API  
**AI model:** Google Gemini 2.0 Flash (streaming, JSON mode)  
**Core metaphor:** An AI courtroom for ambiguous structured clauses, where debates produce human-approved precedent that shapes future AI arguments.

---

## 1. Executive Summary

The Debate Chamber, internally called **Clause Court**, is a Sanity-powered application that finds potentially ambiguous clauses, asks two AI personas to argue opposing interpretations, lets a human act as judge, and stores the human ruling as structured precedent that can be cited in future debates.

The product is intentionally not a generic “two chatbots argue” interface.

Its core mechanic is a persistent legal-style knowledge graph:

**Clause → Interpretations → Human Ruling → Precedent → Future Clause**

Sanity is the source of truth for clauses, interpretations, rulings, and precedent relationships. The application uses Sanity references and workflow states so that decisions become reusable structured content rather than disappearing into a chat transcript.

The challenge source explicitly positions Path Two around an AI-native build, a Next.js/Astro frontend, Sanity behind the application, and rewards functionality, schema quality, creativity, and originality. The official challenge also highlights App SDK and Workflows as particularly useful ways to go beyond a conventional Studio/frontend build.

---

# 2. Product Vision

Create a place where ambiguous policy and contract language can be **stress-tested before it becomes a dispute**.

The long-term product vision is:

> “GitHub-style review for rules and policies, combined with an AI courtroom and a persistent precedent database.”

A user should be able to open the application and understand, in less than one minute:

1. Which clauses may be ambiguous.
2. Why each clause was flagged.
3. How two defensible interpretations differ.
4. What the human reviewer decided.
5. Which earlier rulings influence the current debate.
6. How the new ruling becomes reusable precedent.

---

# 3. Challenge Alignment

## Target Track

**Path Two — Vibe-Code Something Strange**

The official challenge requires:

- An AI-native IDE build.
- Next.js or Astro frontend.
- Sanity behind the application.

The judging criteria are:

- Quality and honesty of the build-process writeup.
- Functionality of the finished app.
- Thoughtfulness of the schema.
- Creativity and originality.

The challenge also explicitly rewards App SDK and Workflows usage. Both are elevated to **Priority 0** in v1.1.

The challenge also states that submissions using App SDK or Workflows effectively can stand out beyond a standard read-only frontend.

## Why This Product Fits

The product naturally demonstrates all four criteria:

| Criterion | Product Evidence |
|---|---|
| Build-process writeup | AI-native IDE prompts, failures, corrections, schema iterations |
| Finished app | Full flow from flag → debate → human ruling → precedent → future citation |
| Schema | Clause, interpretation, ruling, precedent, references, workflow states |
| Creativity | AI courtroom + persistent precedent graph |

---

# 4. Problem Statement

Ambiguous language often survives because a document looks understandable to the person who wrote it.

A phrase such as:

> “Refunds will be processed within a reasonable time.”

can produce multiple defensible interpretations.

Traditional content management systems store the clause, but they usually do not turn ambiguity into a reviewable process.

A generic LLM can generate arguments, but it does not naturally preserve:

- which clause was debated,
- which interpretations were considered,
- who issued the ruling,
- why the ruling was made,
- which prior ruling influenced it,
- whether a future clause cites that precedent.

The Debate Chamber converts that process into structured, persistent content.

---

# 5. Goals

## Primary Goals

### G1 — Detect structurally ambiguous clauses

Identify clauses using explicit, inspectable rules rather than asking the LLM to arbitrarily decide what is ambiguous.

### G2 — Generate two distinct interpretations

Produce two opposing but defensible readings of the same clause.

### G3 — Make human judgment the final authority

The AI does not decide the ruling.

A human reviewer chooses or writes the ruling.

### G4 — Persist rulings as structured precedent

A ruling is stored as a first-class Sanity document.

### G5 — Reuse precedent in future debates

A later clause can cite an earlier ruling, creating a growing precedent graph.

### G6 — Make Sanity essential

Removing Sanity references or workflow state should break an essential product mechanic, not merely replace a database.

### G7 — Deliver a compelling 2–3 minute demo

The demo must show the complete lifecycle, including a second debate that cites the first ruling.

---

# 6. Non-Goals

The MVP will NOT attempt to:

- provide real-world legal advice;
- determine whether text is legally enforceable;
- replace lawyers, editors, or policy owners;
- claim that one interpretation is objectively legally correct;
- build a general-purpose contract management platform;
- support every possible ambiguity pattern;
- automatically publish final legal/policy documents without human approval.

This is a structured-content review and reasoning prototype.

---

# 7. Target Users

## Primary User — Policy/Content Reviewer

A person responsible for approving policies, terms, rules, or structured documents.

Typical actions:

- review flagged clauses;
- inspect competing interpretations;
- check precedent;
- issue a ruling;
- approve the resolved clause.

## Secondary User — Content Author

Creates or edits clauses and wants potential ambiguity caught before publication.

## Demo User — Judge

A reviewer who enters the Debate Chamber, sees the arguments, and makes a ruling.

---

# 8. Core Product Loop

```text
CREATE / EDIT CLAUSE
        ↓
STRUCTURAL AMBIGUITY CHECK
        ↓
AMBIGUITY FLAG
        ↓
DEBATE CHAMBER
        ↓
AI INTERPRETATION A
        ↔
AI INTERPRETATION B
        ↓
PRECEDENT / EVIDENCE
        ↓
HUMAN JUDGE
        ↓
RULING DOCUMENT
        ↓
CLAUSE RESOLVED
        ↓
RULING BECOMES PRECEDENT
        ↓
FUTURE CLAUSE CITES PRECEDENT
```

The second debate is the critical proof that this is a persistent system rather than a one-off AI demo.

---

# 9. Core User Stories

## US-01 — Flag a Clause

As a content reviewer, I want the system to identify a clause with a structural ambiguity signal so I can investigate it before publishing.

### Acceptance Criteria

- Clause can be opened in the application.
- System displays the specific ambiguity signal.
- System does not simply say “AI thinks this is ambiguous.”
- At least one deterministic flag rule is visible.

---

## US-02 — Enter Debate

As a reviewer, I want to open a flagged clause in a courtroom interface.

### Acceptance Criteria

- Clause text is shown.
- Reason for flag is shown.
- Any relevant precedent is shown.
- Debate can be started.

---

## US-03 — Compare Interpretations

As a reviewer, I want two distinct interpretations of a clause.

### Acceptance Criteria

- Two personas produce separate interpretations.
- Each interpretation identifies the wording it relies on.
- Arguments must disagree materially.
- Arguments must not fabricate precedent.

---

## US-04 — Judge the Debate

As a human reviewer, I want to select an interpretation or provide a custom ruling.

### Acceptance Criteria

- Judge can choose Interpretation A.
- Judge can choose Interpretation B.
- Judge can write a custom ruling.
- Judge can optionally add reasoning.
- No AI-generated ruling is final until human approval.

---

## US-05 — Create Precedent

As a reviewer, I want the ruling stored so future debates can reference it.

### Acceptance Criteria

- Ruling becomes a Sanity document.
- Ruling stores the source clause.
- Ruling stores the selected interpretation or custom outcome.
- Ruling is linked into the precedent graph.
- Ruling can be cited by a later clause.

---

## US-06 — Reuse Precedent

As a reviewer, I want future debates to surface relevant prior rulings.

### Acceptance Criteria

- A later clause can have `citesPrecedent` references.
- The debate UI shows cited rulings.
- AI personas receive the cited precedent as context.
- The second debate visibly cites the previous ruling.

---

# 10. MVP Demo Scenario

Use a small fictional policy dataset.

## Clause 1

**Refund Policy**

> “Refund requests submitted within a reasonable time after cancellation will be considered for approval.”

### Deterministic ambiguity signal

`reasonable time` is a vague quantifier/undefined threshold.

### Debate

**Interpretation A — Customer-friendly**

“Reasonable time” means a meaningful period after cancellation during which a normal user could reasonably submit a refund request.

**Interpretation B — Operations-focused**

“Reasonable time” means the short processing window expected by the company, subject to operational constraints.

The application should show why each interpretation is defensible.

### Human ruling

The judge decides:

> “For this policy, reasonable time means 30 calendar days.”

The ruling is stored as structured precedent.

---

## Clause 2

Create another clause containing similar language, for example:

> “Requests must be made within a reasonable period after the service interruption.”

The Debate Chamber should detect the ambiguity.

The application then displays:

**Existing precedent found**

`Refund Policy — Reasonable Time = 30 calendar days`

The new debate references this precedent.

This creates the key moment in the demo:

> “This debate cites a previous human ruling.”

---

# 11. Ambiguity Detection Engine

This is the most important engineering component of the MVP.

The flagging engine must be deterministic.

## Initial Rule Set

### Rule A — Vague Quantifier

Flag terms such as:

- reasonable
- appropriate
- timely
- significant
- substantial
- promptly
- frequently
- generally

### Rule B — Missing Definition

Flag domain-specific terms that are referenced by a clause but have no corresponding definition document.

Example:

```text
“Eligible users receive priority support.”
```

If `eligible` is not defined or linked to a definition, flag it.

### Rule C — Conflicting Cross-Reference

Flag when:

- Clause references Policy A,
- Policy A references a different version of the same requirement.

### Rule D — Conditional Ambiguity

Detect phrases such as:

- when appropriate;
- as necessary;
- where possible;
- at the company’s discretion;
- subject to availability.

## MVP Requirement

Implement at least:

1. vague quantifier detection;
2. missing definition detection.

The system should return structured data:

```json
{
  "flagged": true,
  "signals": [
    {
      "type": "vague_quantifier",
      "term": "reasonable",
      "position": 41,
      "message": "The term 'reasonable' has no structured threshold."
    }
  ]
}
```

The AI should not control whether a clause is flagged.

---

# 12. AI Debate Engine

The AI's job is to **interpret**, not rule.

## AI Model

**Google Gemini 2.0 Flash** via the Gemini API.

- Use **streaming mode** (`generateContentStream`) for real-time typewriter output in the debate chamber.
- Use **JSON mode** (`responseMimeType: 'application/json'`) for structured interpretation output.
- Keep all API calls **server-side** (Next.js Server Actions / Route Handlers). Never expose the API key to the client.

## Persona A — Advocate

Role:

- construct Interpretation A;
- identify textual support;
- produce the strongest defensible reading;
- cite precedent when supplied.

## Persona B — Counter-Advocate

Role:

- construct Interpretation B;
- challenge assumptions;
- identify another defensible reading;
- cite precedent when supplied.

## Persona C — The Dissent (NEW in v1.1)

After the human issues a ruling, generate a short **dissent summary** from the losing advocate:

> "Advocate B notes that the 30-day interpretation may create operational burden for the company, and recommends a clause revision."

The dissent is stored inside the `ruling` document and displayed in the precedent card. It adds depth and is memorable for judges.

Rules:
- Dissent is generated only after a human ruling is submitted.
- Dissent cannot overturn the ruling.
- Dissent is labeled clearly as a generated opinion, not a legal finding.
- Dissent is stored as `dissent` field in the `ruling` document.

## Required Output (Debate)

```json
{
  "clauseId": "...",
  "interpretationA": {
    "title": "...",
    "summary": "...",
    "argument": "...",
    "textualEvidence": ["..."],
    "precedentUsed": ["..."]
  },
  "interpretationB": {
    "title": "...",
    "summary": "...",
    "argument": "...",
    "textualEvidence": ["..."],
    "precedentUsed": ["..."]
  }
}
```

## Required Output (Dissent)

```json
{
  "losingAdvocate": "A" | "B",
  "dissent": "...",
  "clauseRevisionSuggested": true | false,
  "suggestedRevision": "..."
}
```

## AI Guardrails

The AI must not:

- invent a precedent;
- claim a human approved something when they did not;
- manufacture a source;
- declare the clause legally valid/invalid;
- silently change the original clause;
- decide the final ruling;
- override, minimize, or contradict the human ruling in the dissent.

---

# 13. Human Ruling Layer

The human is the final authority in the MVP.

## Ruling Options

### Option 1 — Adopt Interpretation A

### Option 2 — Adopt Interpretation B

### Option 3 — Custom ruling

The reviewer can enter a new interpretation.

### Optional reasoning

The reviewer may document:

- why the ruling was selected;
- implementation implications;
- whether the clause should be rewritten.

## Result

A structured `ruling` document is created, including:
- The chosen interpretation or custom ruling.
- The judge's reasoning.
- A generated **Dissent** from the losing advocate (see §12 — Persona C).

---

# 14. Sanity Content Model

The schema is central to the product.

## Document Type: `clause`

```ts
{
  _type: 'clause',
  title,
  text,
  category,
  status,
  definitions: Reference[],
  citedPrecedent: Reference[],
  debates: Reference[],
  currentRuling: Reference | null,
  createdAt,
  updatedAt
}
```

### Status

```text
draft
flagged
debated
ruled
resolved
published
```

---

## Document Type: `interpretation`

```ts
{
  _type: 'interpretation',
  clause: Reference,
  side: 'A' | 'B',
  title,
  summary,
  argument,
  textualEvidence,
  citedPrecedent: Reference[],
  createdAt
}
```

---

## Document Type: `ruling`

```ts
{
  _type: 'ruling',
  clause: Reference,
  chosenInterpretation: Reference | null,
  customRuling,
  reasoning,
  judgeName,
  precedentId,
  dissent,                  // NEW v1.1 — AI-generated dissent summary
  disssentAdvocate,         // 'A' | 'B' — which advocate dissented
  clauseRevisionSuggested,  // boolean
  suggestedRevision,        // optional clause rewrite text
  createdAt
}
```

---

## Document Type: `precedent`

```ts
{
  _type: 'precedent',
  ruling: Reference,
  sourceClause: Reference,
  title,
  holding,
  reasoning,
  applicableTerms,
  citesPrecedent: Reference[],
  relevanceScore,   // NEW v1.1 — 0-100 computed relevance for new clauses
  citationCount,    // NEW v1.1 — how many clauses reference this precedent
  createdAt
}
```

The exact `citesPrecedent` reference is deliberately first-class.

This is the field that turns the product from a chat interface into a persistent precedent system.

### Precedent Relevance Badge (NEW v1.1)

When a new clause debate surfaces a precedent, compute a **relevance score** based on:
- Term overlap between the clause and precedent's `applicableTerms`.
- Exact match on flagged vague quantifier terms.

Display as a badge in the debate chamber:

```text
Precedent #001 — HIGH RELEVANCE
term match: "reasonable"
```

Badge levels: `HIGH` (≥70%), `MEDIUM` (40–69%), `LOW` (<40%).

---

# 15. Reference Graph

Core graph:

```text
Clause
  │
  ├── has → Interpretations
  │
  ├── resultedIn → Ruling
  │                    │
  │                    └── creates → Precedent
  │                                      │
  │                                      └── citedBy → Future Clause
  │
  └── cites → Precedent
```

Example:

```text
Clause A
  ↓
Ruling A
  ↓
Precedent A
  ↓
Clause B
  ↓
Debate B
```

A future debate can therefore inherit institutional reasoning.

---

# 16. Sanity Workflows

Use Sanity Workflows to model the process next to the content.

## Workflow

```text
Draft
  ↓
Flagged
  ↓
Debated
  ↓
Ruled
  ↓
Resolved
  ↓
Published
```

## Human Approval Gate

The `ruled → resolved` transition requires human action.

The system must not automatically mark the clause as resolved based only on AI output.

---

# 17. UI / UX

## Design System (NEW v1.1)

**Theme: Dark Judicial**

- Background: deep charcoal (`#0D0F14`) with dark navy panels (`#131720`)
- Accent: judicial gold (`#C9A84C`) for headings, borders, and key CTAs
- Advocate A: cool blue (`#3B82F6`) — prosecution-style
- Advocate B: warm amber (`#F59E0B`) — defense-style
- Success/Ruling: emerald green (`#10B981`)
- Danger/Flagged: crimson (`#EF4444`)
- Font: `Inter` (body) + `Playfair Display` (headings — formal, legal)
- Animations: subtle fade-ins, typewriter streaming for debate text, gavel SVG animation on ruling submission

## Screen 1 — Dashboard

Show:

- Clauses needing review.
- Number of ambiguous clauses.
- Active debates.
- Recent rulings.
- Precedent count.
- **One-click Demo Reset button** (reseeds Sanity to initial demo state).

Example:

```text
CLAUSE COURT

12 Clauses
3 Need Review
5 Resolved
7 Precedents

[Open Flagged Clauses]          [⟳ Reset Demo]

Recent Rulings
────────────────────────────
Refund Policy
"Reasonable Time"
Ruled: 30 days

Support Policy
"Priority Support"
Ruled: Enterprise + Pro
```

---

# 18. UI Screen 2 — Clause Detail

Show:

```text
REFUND POLICY

"Refund requests submitted within a reasonable
time after cancellation will be considered..."

STATUS
⚠ AMBIGUOUS

Why?
[Vague quantifier]
Term detected: "reasonable"

[Enter Debate]
```

Below:

**Related precedent**

No precedent yet.

---

# 19. UI Screen 3 — Debate Chamber

The visual centerpiece.

```text
┌──────────────────────────────────────────────────────┐
│ CLAUSE COURT                                         │
│                                                      │
│ ⚖ CASE #0042                                         │
│ Refund Policy                                        │
│                                                      │
│ “reasonable time”                                    │
│                                                      │
├──────────────────────┬───────────────────────────────┤
│ ADVOCATE A           │ ADVOCATE B                   │
│                      │                               │
│ Interpretation       │ Interpretation               │
│                      │                               │
│ Evidence             │ Evidence                     │
│                      │                               │
│ Precedent            │ Precedent                    │
│                      │                               │
└──────────────────────┴───────────────────────────────┘

              [ ISSUE RULING ]
```

The two interpretations should visually feel like opposing cases rather than two chat windows.

---

# 20. UI Screen 4 — Judge Panel

```text
THE COURT IS IN SESSION

Choose the ruling:

[ Adopt Interpretation A ]

[ Adopt Interpretation B ]

[ Write Custom Ruling ]

Reasoning:
[........................................]

Judge Name:
[........................................]

[⚖ JUDGE THE CASE]
```

After submission (with gavel animation):

```text
🔨 RULING RECORDED

This ruling is now structured precedent.

─────────── DISSENT ───────────
"Advocate B notes that the 30-day threshold
 may impose operational burden. Recommends
 clause revision."
── Generated opinion, not a legal finding ──

[View Precedent]   [Back to Clauses]
```

**Gavel animation:** On clicking [JUDGE THE CASE], play a gavel SVG drop animation before showing the confirmation state.

---

# 21. UI Screen 5 — Precedent Library

Show cards containing:

- case title;
- clause;
- holding;
- date;
- citations;
- related clauses.

Example:

```text
PRECEDENT #001

Reasonable Time in Refund Policy

Holding:
30 calendar days from cancellation.

Cited by:
2 clauses

[CUSTOMER SUPPORT POLICY]
[VIEW LINEAGE]
```

---

# 22. UI Screen 6 — Precedent Graph

A visual graph should show:

```text
Refund Clause
     │
     ▼
Refund Ruling
     │
     ▼
Precedent #001
   ↙      ↘
Clause B   Clause C
```

This is the strongest visual proof that the system accumulates institutional reasoning.

---

# 23. API / Application Architecture

```text
                    ┌─────────────────────┐
                    │      Next.js        │
                    │   App Router/UI     │
                    └──────────┬──────────┘
                               │
                        Server Actions/
                           API Routes
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      Ambiguity Engine    Debate Engine      Ruling Engine
       deterministic          LLM              human
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                       ┌─────────────────┐
                       │      Sanity     │
                       │ Content Lake    │
                       └─────────────────┘
                               │
                  References + Workflows
```

---

# 24. Recommended Application Boundaries

## `/app`

```text
/app
  /page.tsx
  /clauses
  /clauses/[id]
  /debate/[id]
  /precedents
  /precedents/[id]
  /graph
  /api
```

## Server Modules

```text
/lib
  sanity/
  ambiguity/
  debate/
  ruling/
  precedent/
  prompts/
```

---

# 25. Core Application Functions

## `detectAmbiguity(clause)`

Input:

```ts
Clause
```

Output:

```ts
AmbiguityReport
```

---

## `findRelevantPrecedent(clause)`

Input:

```ts
Clause
```

Output:

```ts
Precedent[]
```

---

## `generateInterpretations(clause, precedent[])`

Output:

```ts
InterpretationA
InterpretationB
```

---

## `createRuling(input)`

Input:

```ts
{
  clauseId,
  selectedInterpretationId?,
  customRuling?,
  reasoning?,
  judgeName
}
```

Output:

```ts
Ruling
```

---

## `createPrecedent(ruling)`

Output:

```ts
Precedent
```

---

# 26. Deterministic vs AI Responsibility

## Deterministic

The application code owns:

- ambiguity flagging;
- rule detection;
- precedent references;
- workflow transitions;
- which ruling is active;
- structured relationships;
- data integrity.

## AI

The model owns:

- interpretation generation;
- opposing argument generation;
- natural-language explanation;
- debate summaries.

## Human

The human owns:

- final ruling;
- custom resolution;
- approval.

This separation must be visible in both the codebase and the submission writeup.

---

# 27. Prompt Design

## Advocate A Prompt

```text
You are Advocate A in a structured-content courtroom.

Your task is to construct the strongest defensible interpretation
of the supplied clause.

Rules:
1. Use only the supplied clause and supplied precedent.
2. Identify exact textual evidence.
3. Do not invent facts or legal sources.
4. Produce a materially different interpretation from Advocate B.
5. Do not issue the final ruling.
6. If precedent applies, explain how it supports your reading.

Return structured JSON.
```

## Advocate B Prompt

```text
You are Advocate B.

Construct the strongest opposing interpretation of the same clause.

Rules:
1. Use only supplied evidence and precedent.
2. Identify exact textual evidence.
3. Challenge assumptions in the first interpretation where appropriate.
4. Do not invent precedent.
5. Do not issue a final ruling.

Return structured JSON.
```

---

# 28. Debate Quality Requirements

The application should reject or regenerate weak outputs when:

- both interpretations are effectively identical;
- an interpretation invents a citation;
- the interpretation ignores the ambiguous term;
- the interpretation simply paraphrases the clause;
- the model issues a ruling instead of an argument.

MVP can use simple validation:

```text
similarity too high → regenerate
missing evidence → regenerate
unknown citation → remove/regenerate
```

---

# 29. Precedent Relevance

For MVP, precedent can be surfaced using structured references and simple semantic/term matching.

A clause may cite precedent explicitly.

Future enhancement:

- embeddings;
- semantic precedent retrieval;
- domain-specific precedent ranking.

Do not make this complexity a prerequisite for the MVP.

The MVP needs to prove the reference graph works.

---

# 30. Error Handling

## No ambiguity detected

Show:

```text
No deterministic ambiguity signal was found.

This clause can still be manually submitted for debate.
```

## No precedent

Show:

```text
No prior precedent found.

This will be a first ruling for this concept.
```

## AI generation failure

Show:

```text
The advocates could not complete the debate.

[Retry Debate]
```

Do not fabricate a completed debate.

## Human has not ruled

The clause must remain:

```text
debated
```

It must not become:

```text
resolved
```

---

# 31. Security and Safety

Because the product may look legal-adjacent:

- clearly label the system as a policy/structured-content review prototype;
- do not market it as a lawyer;
- do not present generated interpretations as legal conclusions;
- sanitize user-generated content;
- never expose server-side Sanity secrets;
- keep write operations server-side;
- validate all document references.

---

# 32. Accessibility

MVP requirements:

- keyboard-accessible controls;
- clear focus states;
- semantic buttons;
- readable contrast;
- debate A/B distinguishable without relying only on color;
- responsive layout.

---

# 33. Demo Script

Target duration: **2–3 minutes**.

## 0:00–0:20 — Problem

Open dashboard.

Say:

> “Policies contain phrases that sound clear until two people interpret them differently.”

Open the flagged refund clause.

---

## 0:20–0:40 — Deterministic Detection

Show:

```text
FLAGGED

Signal:
Vague quantifier

Term:
"reasonable"
```

Explain that the system is not asking an LLM to decide whether something feels ambiguous.

---

## 0:40–1:20 — Debate

Click:

**Enter Debate**

Two advocates appear.

Let both arguments stream in.

Show textual evidence.

Show no precedent exists yet.

---

## 1:20–1:45 — Human Ruling

Open judge panel.

Select:

**Custom ruling**

Enter:

> “Reasonable time = 30 calendar days.”

Submit.

Show:

**Ruling Recorded**

---

## 1:45–2:05 — Precedent

Open precedent.

Show:

```text
PRECEDENT #001
Reasonable Time
30 calendar days
```

Show its relationship to the original clause.

---

## 2:05–2:35 — The Killer Moment

Open Clause 2.

Flag a similar ambiguity.

Start debate.

Before arguments:

```text
RELATED PRECEDENT

Precedent #001
Reasonable Time = 30 days

This debate cites the prior ruling.
```

The advocates reference it.

Finish on the graph:

```text
Clause A → Ruling A → Precedent A → Clause B
```

This proves the system accumulates knowledge.

---

# 34. Killer Feature

The killer feature is not the debate.

It is:

> **A human ruling becomes structured precedent that changes a future AI debate.**

This should receive the strongest UI treatment.

---

# 35. Analytics / Success Metrics

For a prototype, success can be measured by:

### Product Metrics

- % of flagged clauses that can enter debate.
- % of debates that produce two valid interpretations.
- % of ruled cases converted into precedent.
- number of future clauses citing precedent.

### Demo Metrics

- full lifecycle works without manual database intervention;
- second debate visibly uses first ruling;
- Sanity references are inspectable;
- workflow status changes are visible.

---

# 36. MVP Scope (Updated v1.1)

## Priority 0 — Mandatory

- Next.js app.
- Sanity schemas (updated v1.1 — includes `dissent`, `relevanceScore`, `citationCount`).
- Google Gemini 2.0 Flash API (streaming + JSON mode).
- 10–12 seeded clauses.
- 2–3 deliberately ambiguous clauses.
- Deterministic ambiguity detection.
- Debate UI with streaming typewriter effect.
- Two AI personas (Advocate A + Advocate B).
- **The Dissent** — Persona C, generated post-ruling.
- Human ruling flow with gavel animation.
- Ruling document creation.
- Precedent document creation.
- Precedent citation.
- **Precedent relevance badge** in debate chamber.
- Second debate using first precedent.
- **Sanity Workflow states** — visualized in the UI.
- **One-click demo reset** (reseed Sanity to initial state).
- **Deep-linked URLs** (`/debate/[id]`, `/precedents/[id]`).
- Responsive UI with **mobile tab layout** for debate chamber.
- Dark judicial design system.

## Priority 1 — Strongly Recommended

- Visual precedent graph (D3.js or React Flow).
- Studio preview integration.
- App SDK panel for workflow state.
- Workflow transition log visible in UI.

## Priority 2 — Only After MVP

- Real-time collaboration.
- App SDK full integration.
- Advanced vector-based precedent retrieval.
- Authentication system.
- Full contract editor.

---

# 37. Seed Dataset

Create approximately:

### Clauses

10–12

### Ambiguous

2–3

### Rulings

1 initial ruling

### Precedents

1–2

### Relationships

At least:

```text
1 clause → 2 interpretations → 1 ruling → 1 precedent
1 future clause → cites precedent
```

---

# 38. Suggested Seed Cases

## Case 1 — Refunds

Ambiguity: `reasonable time`

Possible ruling:

`30 calendar days`

---

## Case 2 — Priority Support

Ambiguity: `priority`

Possible issue:

No definition of response-time threshold.

---

## Case 3 — Service Interruption

Ambiguity:

`promptly`

Possible ruling:

`within 4 hours`

---

## Case 4 — Usage Policy

Ambiguity:

`excessive usage`

Missing structured threshold.

---

# 39. Engineering Milestones (Updated v1.1)

## Milestone 1 — Sanity Foundation

- Initialize Sanity project.
- Define all schemas (v1.1 — includes `dissent`, `relevanceScore`, `citationCount` fields).
- Seed dataset (10-12 clauses, 2-3 ambiguous).
- Verify references and `citesPrecedent` graph.
- Configure Sanity Workflows (Draft → Flagged → Debated → Ruled → Resolved → Published).

Deliverable: Sanity graph exists and workflow states visible in Studio.

---

## Milestone 2 — Next.js Foundation

- Next.js app with App Router.
- Dark judicial design system (CSS variables, fonts, color tokens).
- Deep-linked URL structure (`/clauses`, `/clauses/[id]`, `/debate/[id]`, `/precedents`, `/precedents/[id]`, `/graph`).
- Sanity client setup (read + write, server-side only for writes).

Deliverable: App skeleton with routes and design system.

---

## Milestone 3 — Dashboard + Clause Views

- Dashboard with stats cards.
- Clause list with flagged states.
- Clause detail view with ambiguity signals.
- Demo Reset button.

Deliverable: User can discover flagged clauses.

---

## Milestone 4 — Ambiguity Engine

- Implement deterministic detection rules (vague quantifiers + missing definitions).
- Structured ambiguity report with signal type, term, position, message.
- Auto-run on clause load.

Deliverable: Clause gets structured ambiguity report.

---

## Milestone 5 — Debate Chamber + Gemini Integration

- Gemini 2.0 Flash API setup (server-side).
- Streaming typewriter effect via Server-Sent Events.
- Two advocate personas with structured JSON output.
- Precedent relevance badge computation.
- Mobile tab layout for debate chamber.

Deliverable: Two streaming interpretations appear with precedent badge.

---

## Milestone 6 — Human Ruling + The Dissent

- Judge panel UI.
- Ruling form (adopt A / adopt B / custom + reasoning + judge name).
- Gavel animation on submission.
- Dissent generation (Gemini call post-ruling).
- Ruling + Dissent stored in Sanity.
- Clause workflow transitions to `ruled`.

Deliverable: Ruling + dissent create structured Sanity data.

---

## Milestone 7 — Precedent System

- Precedent document creation from ruling.
- Precedent library page with cards.
- `citesPrecedent` reference graph.
- Relevance score computation.
- Citation count tracking.

Deliverable: Ruling becomes reusable precedent.

---

## Milestone 8 — Killer Demo (Second Debate)

- Second clause seeded with `citesPrecedent` reference.
- Debate chamber surfaces related precedent with relevance badge.
- Advocates receive precedent context in prompts.
- Precedent graph page showing Clause A → Ruling A → Precedent A → Clause B.

Deliverable: Future debate visibly reuses prior ruling — the killer demo moment.

---

## Milestone 9 — Polish

- Animations and micro-interactions.
- Responsive design (mobile tabs, breakpoints).
- D3.js / React Flow precedent graph visualization.
- Error states and loading states.
- One-click demo reset.
- Screenshots and video recording.
- Submission writeup.

---

# 40. Definition of Done

The product is MVP-complete when a fresh user can:

1. Open the dashboard.
2. Open a flagged clause.
3. See why it was flagged.
4. Start a debate.
5. See two distinct AI interpretations.
6. Review prior precedent if available.
7. Issue a human ruling.
8. See a new ruling document in Sanity.
9. See the ruling become precedent.
10. Open a second clause.
11. See the previous precedent linked.
12. Start the second debate.
13. See advocates use that precedent.
14. See the reference graph.

No manual backend manipulation should be necessary for the happy-path demo.

---

# 41. Submission Strategy

The Path Two submission should explicitly explain:

## What was vibe-coded

Document:

- initial prompts;
- generated scaffolding;
- failed UI attempts;
- model-generated schema drafts;
- debugging sessions;
- corrections;
- final manual changes.

## What was deliberately hand-specified

Especially:

- ambiguity detection rules;
- separation of AI vs deterministic logic;
- schema relationships;
- human approval;
- precedent graph.

## Why the architecture was chosen

Explain that allowing the model to decide ambiguity or the ruling would remove the human-in-the-loop property and make the precedent system unreliable.

---

# 42. Sanity Proof Checklist

Before submission, verify:

- Sanity project ID included in the DEV post.
- Public dataset/project access is configured appropriately.
- Clause documents exist.
- Interpretation documents exist.
- Rulings exist.
- Precedent references are visible.
- Workflow states can be demonstrated.
- Second clause references first precedent.
- The frontend is Next.js.
- Sanity is actually behind the application.
- Build-process writeup is honest.
- Agent session is made public if embedded.
- No keys or secrets appear in any transcript.

The official challenge requires every submission to include the Sanity project ID or public dataset URL, and encourages embedding an agent session after checking it for sensitive information.

---

# 43. Risks and Mitigations

## Risk 1 — Weak ambiguity detector

**Impact:** High

If every clause is flagged, the application feels fake.

**Mitigation:**

Start with only two narrow deterministic rules:

- vague quantifiers;
- missing definitions.

Seed the demo dataset around those rules.

---

## Risk 2 — AI produces two identical arguments

**Impact:** High

**Mitigation:**

Require different positions and validate similarity.

---

## Risk 3 — Debate becomes theatrical but shallow

**Impact:** Medium

**Mitigation:**

Every argument must reference exact clause text and structured precedent.

---

## Risk 4 — Sanity feels decorative

**Impact:** High

**Mitigation:**

Make `citesPrecedent` and workflow state essential to the application.

A future debate must actually load and use a previous ruling.

---

## Risk 5 — Overbuilding

**Impact:** High

**Mitigation:**

Prioritize:

```text
Detection
→ Debate
→ Ruling
→ Precedent
→ Second citation
```

Everything else is secondary.

---

# 44. Future Roadmap

## V1.1

- richer ambiguity rules;
- clause comparison;
- precedent search;
- better graph visualization.

## V1.2

- real-time collaborative judging;
- comments;
- workflow notifications;
- App SDK integration.

## V2

- semantic precedent retrieval;
- organizational policy graph;
- version-aware rules;
- multilingual policy review;
- contradiction detection across clauses.

---

# 45. Final Product Narrative

The one-sentence product story:

> **Clause Court is an AI courtroom for structured policies: two AI advocates argue ambiguous clauses, a human judge rules, and every ruling becomes persistent precedent that shapes future debates.**

The strongest demo sequence is:

```text
AMBIGUOUS CLAUSE
      ↓
AI vs AI
      ↓
HUMAN JUDGE
      ↓
STRUCTURED PRECEDENT
      ↓
NEW CLAUSE
      ↓
OLD PRECEDENT APPEARS
      ↓
AI USES PRECEDENT
```

That final transition is the product's proof.

---

# 46. Build Priority (Updated v1.1)

## Priority 0 — Mandatory

1. Sanity schemas (v1.1 with dissent, relevanceScore, citationCount).
2. Seed data (10-12 clauses, 2-3 ambiguous, 1 ruling + precedent chain).
3. Deterministic ambiguity flagging.
4. Debate generation — **Gemini 2.0 Flash, streaming**.
5. Precedent relevance badge.
6. Human ruling + **gavel animation**.
7. **The Dissent** — Persona C, post-ruling.
8. Precedent document creation.
9. Second debate citing first precedent.
10. **Sanity Workflow state visualization** in the UI.
11. **One-click demo reset**.
12. **Deep-linked URLs**.
13. **Mobile tab layout** for debate chamber.
14. Dark judicial design system.

## Priority 1 — Strongly Recommended

15. D3.js / React Flow precedent graph.
16. App SDK workflow panel.
17. Studio preview.
18. Workflow transition log.

## Priority 2 — Only After MVP

19. Real-time collaboration.
20. Advanced vector retrieval.
21. Authentication.
22. Full App SDK integration.

---

# 47. Product Principle

**AI generates arguments.  
Structure preserves institutional memory.  
Humans make the ruling.**

That separation is the core of Clause Court.
