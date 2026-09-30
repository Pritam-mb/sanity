# Clause Court — Build Status

**Last updated:** 2026-10-01
**Sources of truth:** `D:\sanity\Clause_Court_Full_PRD.md` (v1) + `clause-court/docs/v2-council.md` (v2)
**Codebase:** `D:\sanity\clause-court`

```
TypeScript   npx tsc --noEmit   PASS
ESLint       scoped files       PASS (0 errors; full `npm run lint` times out on this machine, not on errors)
Tests        npm test           PASS (70 tests, 5 suites, 0 fail)
Build        npm run build      NOT re-run after v2 (tsc + lint + tests green; verify before submitting)
Runtime      v1 pipeline verified live against Sanity + Gemini (see §2); v2 verified by tests + tsc, seed not yet re-run against production
```

---

## 1. Where things stand

Two tracks are done:

- **v1 (single judge):** every Priority 0 item in PRD §36 is implemented and was executed
  end to end against the real dataset and model — seed → flagged clause → streamed
  hearing → precedent reuse → human ruling → dissent → workflow → published.
- **v2 council (Tier 1):** the deliberation core is implemented — 9 new Sanity schemas,
  pure tally + session state machines, 9 API routes, the `/chamber` UI, demo identity
  switcher, dashboard queue, `/council` + `/knowledge` pages, seeded council/members/
  regulations/demo deliberation. Proven by 38 new tests, not by a live run yet.

The previous version of this file listed tests, disclaimer, focus styles,
reduced-motion, and the audit log as "not done". All five are **done in code**
(the file was stale, not the build): `tests/` holds 70 passing tests,
`layout.tsx` carries the PRD §31 prototype notice, `globals.css` has
`:focus-visible` + `.skip-link` + `.sr-only` + `prefers-reduced-motion`, and
`transitionLog[]` is written by every pipeline.

---

## 2. v1 runtime verification log (earlier live run, still valid)

Verified against project `tmics7hc` / dataset `production` at `localhost:3000`.

| Check | Result |
|---|---|
| Sanity token identity | developer robot, read/write on `production` |
| Sanity dataset | exists, public — 12 clauses, 3 flagged, 1 debate, 1 ruling, 1 precedent, 4 definitions |
| Precedent chain | `precedent-refund-reasonable-time` cited by Service Interruption Response |
| Gemini key | valid; `gemini-2.0-flash` retired (404) → moved to `gemini-2.5-flash` via single `GEMINI_MODEL` var |
| Streamed hearing | SSE `meta`/`token`/`done`, HIGH 100% precedent surfaced, both advocates cited it, evidence quotes verified verbatim |
| Ruling | 200 — ruling + dissent + precedent persisted with lineage |
| Workflow gate | `ruled → published` skip refused with 409; `ruled → resolved → published` works; refusals are 409/400, never 500 |
| Failure paths | missing `judgeName` → 400; fabricated `debateId` → 400; wrong-state ruling → 409 |
| All routes | `/`, `/clauses`, `/graph`, `/precedents`, `/precedents/[id]`, `/clauses/[id]`, `/debate/[id]` — all 200 |

Bugs fixed by that live run (build-green, runtime-broken): seed wrote `citedPrecedent`
before the precedent existed (whole mutation rejected); `/graph` 500 on
`citedPrecedentIds: null` (fixed with `coalesce(..., [])`); four call sites
hard-coded the retired model.

---

## 3. v1 additions since that run

- **Submitted-by attribution** — `clause.submittedBy` schema field + seed values +
  display under the case title. Answers "who put this case".
- **In-app case submission** — `POST /api/clauses` + `SubmitCaseForm` on `/clauses`.
  Text is scanned server-side at creation (Rules A–E) and lands in `flagged` or
  `draft` with signals + transition log, exactly as the seeder would place it.
- **Rule E — company standards** — `companyStandard` documents (banned phrases) checked
  deterministically alongside Rules A/B/D. Seeded 2 standards; adding a rule is a
  Studio edit, never a code change. Seed-plan test pins "exactly 3 flagged".
- **Judge brief** — every clause page opens with a "Current situation" panel:
  plain-language stage, facts so far, and either `✅ No action needed` or
  `👉 Action needed` with a button to the debate chamber or approval gate.
- **Premium graph** — `/graph` redesigned: gold-gradient hero, glass stat tiles,
  glowing canvas, glass nodes with medallions/status/cite pills, animated cites edges.
- **Tests** — `tests/` did not exist (docs claimed 21 passing, runner ran 0).
  Now: `ambiguity` (Rules A/B/D/E + highlight + seed-plan stability),
  `quality` (similarity, quotes, precedent filter, `validateDebate`),
  `workflow` (actor scoping, approval gate) — all green.

---

## 4. v2 council Tier 1 — shipped

Spec: `docs/v2-council.md`. Principle: *AI argues and assists. Rules flag and
tally. A council decides. Sanity remembers every voice.*

### Schemas (Studio sidebar)
`council` (seats, quorum 60%, threshold 50%, required seats Legal+Security, chair),
`councilMember`, `session` (briefing → deliberation → synthesis → voting → ruled →
approved → released, blind/open round), `position` (structured + append-only via
`revisionOf`), `comment`, `councilOption` (member vs AI source labelled, `modelInfo`
required for AI drafts), `vote`, `approval`, `regulation` (floors + illustrative flag).
Deltas: `ruling` gains `session`/`tally`/`dissentingMembers` (debate now optional);
`precedent` gains `council`/`voteSummary`/`status` (active/superseded/overruled);
`clause` gains `session`/`stale`.

### Pure logic (`src/lib/council/`)
- `tally.ts` — `assertVote` (one member one vote), `evaluateResult`
  (quorum → required seats → threshold; ties undecided), `summarizePositions`
  (min/median/max, single-linkage clusters, confidence-weighted consensus),
  `checkLegalFloor`, `validateApprovals` (two-person rule; chair/author barred).
  Refusals throw `CouncilRuleError` → routes answer 409.
- `sessionFlow.ts` — chair/member/approver transitions, reveal guard,
  synthesis (≥2 positions) and vote (≥2 options) guards, blind-revision rule,
  v1 clause-status bridge.
- `chamber.ts` / `queue.ts` — session bundle with blind filtering (positions visible
  only to author + chair; summary computed over visible set only) and the dashboard
  your-move queue.

### API (9 routes)
`GET /api/members`; `GET+POST /api/sessions` (chair-only open enforced);
`GET /api/sessions/[id]` (viewer-filtered bundle); `positions` (round match,
revision integrity), `comments`, `options`, `votes` (returns live evaluation),
`approvals` (duplicate/author/chair refused); `advance` (reveal, transitions,
and on a carried vote: mints ruling + precedent with tally/dissenters/vote
summary, moves clause to `ruled` with audit entry). Approvals → `resolved`,
release → `published`, each audited.

### UI
`/chamber/[id]` — spectrum view (dot size = confidence, gold ring = cited basis),
computed summary card, position cards with threaded replies, open floor,
chair panel, options with live evaluation, two-person approval panel.
Identity switcher in nav (demo ident
...[truncated 3880 chars]