# Clause Court v3 - Roadmap: the mandatory council, organisational memory, and the case tree

**Status:** proposed - supersedes the open Tier 2/3 items in `docs/v2-council.md`
**Baseline:** `STATUS.md` (2026-10-01) - v1 verified live, v2 Tier 1 code-complete (70 tests green, not yet live-run)
**Principle (unchanged):** *AI argues and assists. Rules flag and tally. A council decides. Sanity remembers every voice.*

---

## 0. Honest starting point

What exists today, so the plan builds on it instead of re-inventing it:

| Already built (v1) | Already built (v2 Tier 1) |
|---|---|
| Deterministic ambiguity engine, Rules A-E | 9 new schemas: `council`, `councilMember`, `session`, `position`, `comment`, `councilOption`, `vote`, `approval`, `regulation` |
| AI advocates A/B + streamed hearing (SSE) | `tally.ts` - quorum, threshold, required seats, one-member-one-vote, two-person approval |
| Anti-fabrication quality gate | `sessionFlow.ts` - chair/member/approver transitions, blind-revision rule |
| Human ruling - dissent - precedent | `/chamber/[id]` - spectrum view, computed summary, chair panel, approval panel |
| Deterministic precedent relevance scoring | 9 council API routes, dashboard "your move" queue, `/council`, `/knowledge`, identity switcher |
| Site-wide `/graph` (clause - ruling - precedent - clause) | Blind/open rounds, append-only positions via `revisionOf` |

**Four real gaps, which are the entire v3 scope:**

| # | Gap | Evidence |
|---|---|---|
| **G1** | **A clause can still bypass the council.** v1 `POST /api/ruling` rules on any `debated` clause with no session, no quorum, no second approver. `flagged - debated` never checks `clause.session`. | `src/app/api/ruling/route.ts`, `src/sanity/workflow.ts` |
| **G2** | **No organisation.** `councilMember` is `{name, seat, active, bio}`. No org document, no org policy history, nothing an org can "already hold". | `src/sanity/schemaTypes/councilMember.ts:7` |
| **G3** | **No prediction.** `gemini.ts` has exactly three model calls: advocate A, advocate B, dissent. No option drafter, red team, gap finder, org-aware suggestion. | `src/lib/debate/gemini.ts` |
| **G4** | **The graph is site-wide, not per case.** `/graph` shows the 4-column reference chain. There is no per-case tree of *who suggested what, in which round, and what it last decided*. And `/debate/[id]` - the page someone reopens - shows no session status at all. | `src/app/graph/PrecedentGraph.tsx:138`, `src/app/debate/[id]/page.tsx:45` |

Everything below closes G1-G4 and proves it.

---

## 1. The target loop

```
NEW POLICY / AMENDMENT / VENDOR TERM ARRIVES
        -  deterministic intake (Rules A-E + intake completeness)
   intake - flagged  -- seat assigned, council + session auto-created ---
        -                                                             -
   briefing: AI advocates A/B, precedent + org history anchored        -
        -                                                             -
   deliberation: BLIND round                                           -
        - every member gets a PREDICTED position from their org's       -
          own record of past policy  - G2/G3                          -
        - adopt / edit / discard. Nothing is auto-submitted.            -
   chair reveals - OPEN round: challenge, support, revise              -
        -                                                             -
   synthesis: computed clusters - AI drafts 2-3 options                 -
        -                                                             -
   voting: quorum + required seats + threshold  (deterministic)         -
        -                                                             -
   ruled - 2 approvals - released as precedent                         -
        -                                                             -
   PRECEDENT + ORG RECORD WRITE-BACK: this decision joins the org's    -
   own policy history and sharpens the next prediction  - loop closes  -
        -                                                             -
   CASE FILE /cases/[id]  = intake + chamber + CASE TREE + last decision-
```

The write-back arrow is what makes v3 more than v2: after one case, the prediction for that organisation's next case is better, and the graph shows *why*.

---

## 2. Pillar 1 - No policy skips the council (closes G1)

### 2.1 Intake is a first-class document

New schema `intake`:

```
intake {
  clause - clause (1:1)
  source: "new-policy" | "amendment" | "vendor-terms" | "org-request" | "regulatory-change"
  requestingOrg - organization          // who is bringing it
  requestedBy: string
  receivedAt, targetSessionDate
  supersedes - clause                   // amendments only
  mandatory: boolean                    // default true - cannot be waived below -2.2
  intakeChecklist { rulesRan, missingInputs[], complete }
}
```

`POST /api/intake` replaces `POST /api/clauses` as the entry point. It runs `detectAmbiguity()` **plus** an intake completeness check (missing owner, missing effective date, missing org, missing unit of measure). A clause with `mandatory: true` and an incomplete checklist lands in `flagged` with a blocking signal, never `draft`.

### 2.2 The gate

Three server-side guards, all in pure code, all testable:

| Guard | Where | Rule |
|---|---|---|
| `assertCouncilGate(clause, session)` | `src/lib/council/intake.ts` | A clause may not leave `flagged` without an open `session`. |
| `assertSeatAssigned(clause)` | same | Every mandatory intake must be assigned to a council that has the required seats staffed. |
| `assertNoLegacyPath()` | `src/app/api/ruling/route.ts` | When `COUNCIL_REQUIRED=true` (default), `POST /api/ruling` refuses a clause whose ruling would have no `session`. Escape hatch for the demo: `COUNCIL_REQUIRED=false` re-enables the v1 single-judge path, logged loudly. |

`src/sanity/workflow.ts` gains the transition guard so Studio actions are gated identically to the API. The gate is **deterministic and server-side** - a client that skips the UI still gets 409.

### 2.3 Amendments auto-open a case

When a `published` clause is edited, one deterministic action fires:
`intake(supersedes: clause)` - new `session` opened - precedent `status: 'superseded'` - all citing clauses get `stale: true` (the field already exists at `clause.ts:175`, still unwritten).

This is the "a new policy brings a new policy" case the council exists for: the amendment gets argued on its own merits, with the superseded precedent argued *against*.

### 2.4 Definition of done

- `POST /api/intake` rejects a clause with no owning org and no council - 409 with the exact missing fields.
- `flagged - debated` without a session - 409, on both the API route and the Studio action.
- `POST /api/ruling` on a session-less clause - 409 when the flag is on.
- Editing a published clause creates exactly one intake + one session, sets precedent `superseded`, and flips `stale` on every citing clause. Verified by test, not by eye.

---

## 3. Pillar 2 - Organisations hold their own policy record (closes G2)

### 3.1 New schemas

**`organization`** - the "org account" the council argues *for*:

```
organization {
  name, kind: "internal-department" | "external-vendor" | "partner" | "regulator"
  staffedSeats: string[]              // which council seats this org fills
  riskAppetite: "conservative" | "balanced" | "aggressive"
  escalationPolicy: text
  contactMember - councilMember
  charterReviewedAt                    // drives the knowledge-health panel
}
```

**`councilMember`** gains `organization - organization`, `tenureSince`, `priorCaseCount` (derived).

**`orgPolicyRecord`** - what the org has already decided. Derived, never hand-written, so it can be recomputed at any time:

```
orgPolicyRecord {
  org - organization
  category: string, unit: string                 // the slice it describes
  casesCount, positionsCount, votesCount
  proposedValues: number[]                       // every value this org ever proposed
  median, mean, spread
  stanceMix: { support-A, support-B, custom }
  winRate, carriedRate                           // share of sessions its pick carried
  avgConfidence, revisionRate                    // how often it revises after reveal
  legalFloorOverrideRate                         // how often it pushes below a floor
  lastDecidedAt, recentHoldings[]                 // "Org previously held 24h on SLA credits"
}
```

### 3.2 Derivation, not storage of truth

`src/lib/council/orgRecord.ts` - `buildOrgProfile(orgId, category, unit)` runs one GROQ aggregate over existing `position` / `vote` / `ruling` documents. `orgPolicyRecord` is a **materialised snapshot** refreshed by a Sanity Function on `ruling` write and by an explicit Refresh button - so the derived numbers are always reproducible from the primary documents, exactly like `recountCitations()` already is for `citationCount`.

Rules that keep this honest:
- An org with `casesCount < 3` gets a record that says **"insufficient history"**, not a number.
- Records never contain text the org did not write - only numbers, stances, and links.
- Every derived figure is reproducible by a test that recomputes it from primary docs.

### 3.3 Definition of done

- `/council` shows each member's organisation, and each org's record card (cases, median holding, win rate, last decision).
- `buildOrgProfile()` recomputes from primary documents and a test asserts snapshot == recomputation.
- `POST /api/orgs/refresh` rebuilds every snapshot; a seeded second case for one org changes that org's median - proven by test.

---

## 4. Pillar 3 - Predict from that record, then let the model write the words (closes G3)

Split deliberately in two, because this is the line the product has never crossed.

### 4.1 Deterministic prediction - `src/lib/council/predict.ts`

```ts
predictPosition(input: {
  member, orgProfile, category, unit,
  councilMedian, legalFloor, precedentCluster
}): Prediction

interface Prediction {
  predictedValue: number | null   // null = insufficient history, say so
  predictedStance: 'support-A' | 'support-B' | 'custom'
  confidence: 1-5                // scales with casesCount
  basis: 'org-history' | 'insufficient-history'
  evidence: string[]             // "Org median 24h over 5 SLA cases", "Legal floor 8h"
  similarCases: Array<{ clause, holding, value, session }>
}
```

Method (deterministic, ~40 lines, no model):
1. Take the org's `proposedValues` for this `category` + `unit`.
2. **Shrink toward the council median** by evidence weight: `value = (n-orgMedian + k-councilMedian) / (n + k)`, `k = 2`. One data point cannot dominate; nine can.
3. Clamp up to `legalFloor` and report the clamp as an explicit evidence line.
4. `confidence = clamp(1 + floor(n/2) + carriedRate, 1, 5)`; `n < 3` - `basis: 'insufficient-history'`, `predictedValue: null`.
5. `predictedStance` from the org's `stanceMix` in this category.

### 4.2 Model writes prose only - `src/lib/debate/suggest.ts`

Gemini receives the predicted numbers, the org's record, the precedent cluster and the legal floor, and returns **only** a rationale paragraph plus a risk note. It may not change the numbers.

Every suggestion is stored with `source: 'ai-suggested'`, `modelInfo { model, promptVersion }`, `predictionBasis`, and `predictionConfidence`, and is displayed with an explicit badge: *"Suggested for Northwind from its record of 5 prior cases - AI draft, unadopted."*

### 4.3 Adoption is a human act with a measured outcome

One click **Adopt** creates a real `position` document owned by the member, carrying:
`assistedBy: 'ai-suggested'`, `predictedValue`, `adoptedValue`, `edited: boolean`, `predictionOutcome` (filled in when the session rules).

`/council` then shows the honesty panel the whole feature exists to produce:

> **AI suggestion accuracy** - 14 of 19 adopted suggestions kept the predicted value; 5 were edited. Median edit size: 4h. Where the AI was wrong: small-vendor scope, weekend coverage.

### 4.4 Hard rules (each one a test)

| Rule | Assertion |
|---|---|
| AI cannot submit | No code path lets a suggestion create a position without a `memberId` from the request. |
| AI cannot vote | `assertVote` has no AI branch; `councilOption.source === 'ai'` options are votable but the drafter has no seat. |
| Numbers are never generated | `validateDebate`-style gate: any number in AI prose that is absent from the clause, the org record, or the precedent cluster is stripped. |
| Insufficient history stays silent | `n < 3` - the panel shows "not enough history" and offers no number. |

### 4.5 Definition of done

- A seeded org with 5 prior cases opens `/chamber/[id]` and sees a predicted value with its evidence lines.
- Adopting it writes `assistedBy` + `predictedValue`; editing it writes `edited: true` and both values.
- `/council` accuracy panel computes from real adopted positions.
- 12 new tests: shrinkage, floor clamp, confidence scaling, insufficient-history, no-auto-submit, prose-number stripping.

---

## 5. Pillar 4 - The case tree (closes G4)

### 5.1 One builder, pure - `src/lib/council/caseTree.ts`

`buildCaseTree(bundle)` - `{nodes, edges}` with **nine edge types**, all derived from stored references, never inferred from prose:

```
clause --opened--- session --briefed-by--- interpretation (A | B)
                              -
                              --- position (member) --revises--- position (earlier)
                              -        -  ---responds-to--- position / comment
                              -        ---clustered-into--- option
                              --- option --voted-by--- vote (member)
                              --- ruling --decided-by--- approval - 2
                              -        ---created--- precedent --cited-by--- clause
                              ---- auditEntry[] (append-only spine)
```

Blind-round positions are **present as nodes but withheld from non-chair viewers** - the tree respects the same rule as `chamber.ts:156`, so the graph cannot leak a blind round.

### 5.2 Three surfaces

| Surface | Route | What it shows |
|---|---|---|
| **Case tree** | `/cases/[id]/tree` | Full nine-edge tree, ReactFlow, reusing `PrecedentGraph.tsx`'s node/medallion/legend system. Columns become lanes: Clause - Session - Positions - Options - Vote - Ruling - Precedent - Citing. |
| **Mini tree** | clause page panel | Same data, 3 levels, "what happened to this case" at a glance. |
| **Org lineage** | `/council` per org | That org's decisions as a tree: which of its proposals carried, which were overruled, which it revised after reveal. |

### 5.3 Argument edges are deterministic

A `challenges` edge appears only when the stored data says so: `position.respondsTo` + opposing `stance`, or `comment.kind === 'challenge'`. A `supports` edge likewise. The model never draws an edge - the same principle as `ambiguitySignals`, extended to the argument graph.

### 5.4 Definition of done

- `/cases/[id]/tree` renders every node type above for the seeded deliberated case, and re-renders correctly for a fresh case with 1 position.
- A blind round is invisible to a non-chair viewer in the tree exactly as it is in the chamber (test).
- Every edge can be traced to a stored reference (test: no orphan edges).

---

## 6. Pillar 5 - Reopen the case, see where it stands (closes G4's second half)

### 6.1 One component, everywhere

`src/components/CaseStatusBanner.tsx` - a single status component mounted on `/clauses/[id]`, `/cases/[id]`, `/precedents/[id]`, and every list card:

```
CASE #0044 - Refund Window          [ DELIBERATING - BLIND ROUND ]
Chair: Priya Raman - Reveal in 2d 04h - 3 of 5 positions in - Quorum 60% needs 3/5
Required seats still silent: Security
[ Enter chamber ]   [ View case tree ]
```

Rule: the banner **computes** stage, round, deadline, silence, quorum progress and the single correct CTA. It never shows a stale label, because the label is derived on read - the same discipline as `summarizePositions()`.

### 6.2 The unified case file replaces `/debate/[id]`

`/debate/[id]` currently renders a v1 room with **no knowledge of sessions**. Rather than maintain two case UIs:

| Route | Action |
|---|---|
| `/cases/[id]` | **New unified case file:** intake header, org, council, stage, briefing, chamber (embedded), case tree, ruling + dissent, approvals, full audit spine. |
| `/cases` | Case index, filterable by stage / org / category / awaiting-you. |
| `/debate/[id]` | **Redirect** - `/cases/[id]`, preserving any deep links. |
| `/chamber/[id]` | Kept as the focused deliberation room (deep links preserved), now sharing `CaseStatusBanner`. |

### 6.3 Resumability contract

Opening any case at any time must answer, without scrolling: *what is this, who is in it, what is missing, what happens next, and what was last decided.* That is a testable contract, written as five assertions per surface in -8.2.

### 6.4 Definition of done

- `/debate/[id]` redirects; `/cases/[id]` shows the intake header, stage, and the last decision.
- An in-flight case opened cold shows countdown, who is silent, and quorum progress.
- A released case opened cold shows the holding, the tally, both approvers, and the citation list.

---

## 7. Sequencing

Each phase ships behind a flag and is independently provable. No phase depends on a later one.

| Phase | Scope | Closes | Est. |
|---|---|---|---|
| **P0 - Truth pass** | Reconcile `STATUS.md` (it was stale before), record the v1/v2 duality, confirm `npm test` + `tsc --noEmit` + a real `npm run build` | - | 0.5d |
| **P1 - Intake gate** | `intake` schema, `POST /api/intake`, the three guards, amendment auto-open, `COUNCIL_REQUIRED` flag | G1 | 2d |
| **P2 - Organisations** | `organization`, `councilMember` deltas, `orgPolicyRecord`, `orgRecord.ts`, `/council` record cards | G2 | 2.5d |
| **P3 - Prediction** | `predict.ts`, `suggest.ts`, adoption + `predictionOutcome`, accuracy panel, 12 tests | G3 | 3d |
| **P4 - Case tree** | `caseTree.ts`, `/cases/[id]/tree`, mini-tree, org lineage, edge-integrity tests | G4a | 3d |
| **P5 - Case file** | `CaseStatusBanner`, `/cases/[id]`, `/cases`, `/debate/[id]` redirect, resumability contract | G4b | 2.5d |
| **P6 - AI suite** | Option drafter, red team, gap finder, compromise finder, "Think with AI" - all grounded in org records + precedent, all labelled | Tier 2/3 debt | 3d |
| **P7 - Proof** | Full test pass, e2e, live verification matrix, demo, submission | - | 2d |

**P0-P5 is 13 days and delivers all four pillars.** P6 and P7 are stretch and submission work.

---

## 8. Proof plan

### 8.1 Test matrix (target: 70 - ~135)

| Suite | File | New | Pins |
|---|---|---|---|
| intake | `tests/intake.test.ts` | 9 | Checklist completeness, council gate, seat assignment, amendment auto-open |
| org | `tests/orgRecord.test.ts` | 8 | Derived stats, insufficient-history, snapshot == recomputation, refresh idempotence |
| predict | `tests/predict.test.ts` | 12 | Shrinkage, floor clamp, confidence scaling, stance mix, no-auto-submit, prose-number stripping |
| caseTree | `tests/caseTree.test.ts` | 10 | Nine edge types, blind-round withholding, no orphan edges, empty/1-position case |
| status | `tests/caseStatus.test.ts` | 7 | Banner CTA per stage, silence, quorum progress, deadline maths |
| existing | `tally` `session` `workflow` `quality` `ambiguity` | 0 | Must stay green - no regression in v1/v2 |

### 8.2 Resumability contract (the v3 acceptance test)

Open a case cold, at five different moments, and assert the banner states all five facts:

| Moment | Stage shown | Silence shown | Quorum | Last decision | CTA |
|---|---|---|---|---|---|
| Intake accepted | Flagged | - | - | "No prior decision" | "Awaiting chair" |
| Blind round open | Deliberating - blind | who hasn't positioned | not yet applicable | "No prior decision" | "Submit your position" |
| After reveal | Deliberating - open | who hasn't revised | - | "No prior decision" | "Challenge or revise" |
| Voting | Voting | non-voters | live 3/5 vs 60% | "No prior decision" | "Cast your vote" |
| Released | Released | - | final tally | holding + tally + 2 approvers | "View precedent" |

### 8.3 Live verification matrix (real Sanity + real Gemini)

Every row executed, with the response pasted into `STATUS.md`:

| # | Check | Expected |
|---|---|---|
| 1 | `POST /api/intake` with no org | 409 + missing-field list |
| 2 | `flagged - debated` with no session | 409 |
| 3 | `POST /api/ruling` on a session-less clause | 409 (flag on) |
| 4 | Amend a published clause | 1 intake + 1 session created; precedent `superseded`; citing clauses `stale: true` |
| 5 | Two approvals from the same person | 409 duplicate approver |
| 6 | Chair approves own ruling | 409 |
| 7 | Author approves own clause | 409 |
| 8 | Vote from an inactive member | 409 |
| 9 | Non-chair opens blind round in the tree | positions withheld |
| 10 | Option below legal floor | blocked until an override with a reason is recorded |
| 11 | Seeded org opens a chamber | predicted value + evidence lines render |
| 12 | Adopt suggestion unedited | `position.assistedBy='ai-suggested'`, `edited:false` |
| 13 | Edit suggestion then adopt | both values stored, accuracy panel counts the edit |
| 14 | `/cases/[id]/tree` on seeded case | all nine edge types render; click-through resolves |
| 15 | `/debate/[id]` | 308 - `/cases/[id]` |
| 16 | Full run: intake - released | 6 states, audit spine complete, precedent created with vote summary |
| 17 | `npm test` / `tsc --noEmit` / `npm run build` | all green |

### 8.4 Demo script (2 min 30 s) - the v3 story

1. **0:00** - Submit a **vendor refund term** from Northwind. Intake fires Rule A on *"reasonable time"*, flags it, and auto-creates a session on the Policy Council. *("Nothing enters the building without a hearing.")*
2. **0:15** - Switch to Priya. Her blind position is already **predicted from her own record**: *"Suggested from Northwind's 5 prior refund cases - median 24h."* She edits to 8h. *("The council starts from what your organisation already decided.")*
3. **0:40** - Chair reveals. The **case tree** lights up: five positions, one revision edge from Ops, two challenge edges. The computed summary reads median 12h, Legal floor check in amber.
4. **1:05** - AI drafts three options; the council votes 4-1, quorum and required seats satisfied.
5. **1:30** - Ruling records the tally, the dissent, both approvers. `/cases/[id4]` now opens with: **status Released, holding, 4-1, two signatures, cited by 2 clauses.**
6. **1:50** - Go back to `/council`: Northwind's record now reads **6 cases, median 16h, win rate 50%** - and the accuracy panel says the AI was right 3 of 4 times this session. *("The prediction is auditable, and it improves because the council wrote it down.")*
7. **2:10** - Amend the published clause. A new case opens automatically, the precedent flips to `superseded`, and every citing clause goes stale in one deterministic sweep.

### 8.5 Submission artefacts

- `STATUS.md` rewritten from the live verification log (no stale claims - this file was stale twice already).
- Demo video, `docs/v3-council-roadmap.md`, updated `docs/overview.md`.
- **Closing claim for the judges:**

> Gemini wrote the arguments, the suggested rationales and the options. Sanity held the intake, the organisations, every position, every vote, the tally, the case tree and the audit spine. The council decided. Nothing entered without a hearing, and nothing left without a signature.

---

## 9. Risks and the honest caveats

| Risk | Mitigation |
|---|---|
| **The prediction looks like a personality test.** It is a median of numbers an org itself produced, with the evidence printed next to it and an accuracy panel that can show it being wrong. If it reads as judgement of people, ship it as a *record summary* instead - the same data, no prediction framing. |
| **Prediction collapses groupthink** - members anchor on the suggestion. Mitigations already designed in: the suggestion is per-member, the blind round hides it from others, the summary is computed over visible positions only, and blind-vs-open divergence is displayed. |
| **Two case UIs drift.** Solved by retiring `/debate/[id]` rather than maintaining it. |
| **`orgPolicyRecord` drifts from primary documents.** Mitigated: it is a snapshot, recomputable, with a test asserting snapshot == recomputation and a manual Refresh. |
| **Seed data is illustrative.** Regulation floors and thresholds must be verified against official sources before the numbers are quoted anywhere; `regulation.illustrative` already flags this and must be unchecked deliberately. |
| **Scope.** P6 and P7 are stretch. If time runs out, ship P0-P5: all four pillars, all gates, full proof. |
