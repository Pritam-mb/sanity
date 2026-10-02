# Fact Ledger — Build Progress

## Choices and fallbacks (Section 13)

| Preferred | Choice | Reason |
|---|---|---|
| Sanity Functions as webhook handler | **Next.js API route (fallback)** | Sanity Functions require plan upgrade; API route works universally |
| Content Releases | **Content Releases (preferred)** | Available via `@sanity/client`; JS client `releases()` API confirmed |
| Agent Actions for rephrase | **Direct LLM call or disabled** | `rephraseSentence()` calls LLM directly; app works fully if `LLM_API_KEY` unset |
| Custom Studio tool | **Dashboard as Next.js page** | GROQ queries served from API routes; Studio gets visionTool for exploration |

---

## Phase 1 — Foundation

**Status:** ⏳ IN PROGRESS

**Built:**
- Monorepo structure: `studio/`, `web/`, `scanner/`, `seed/`, `bench/`, `docs/`
- Root workspace `package.json` with npm workspaces
- Sanity Studio v3 schemas: `fact`, `person`, `factRef` (inline PT object), `page`, `finding`, `scanRun`, `changeEvent`, `benchmarkResult`
- Custom Studio structure: Facts / Pages / Open Findings / Scan Runs / Audit Log / Benchmark / People
- `studio/sanity.config.ts` + `sanity.cli.ts` + `tsconfig.json`
- Web app: Next.js 16 App Router, TypeScript, vanilla CSS
- Sanity client (`lib/sanity/client.ts`) — read and write clients
- `FactRefInline.tsx` renderer — maps `factRef` blocks to live canonical values via `factMap`
- Dashboard home page (`/`) — KPI row, all numbers from real GROQ queries
- Pages index (`/pages`) + Page detail (`/pages/[slug]`) — renders PT with live factRef values
- `.env.local`, `.env.example`, `.env` (studio)

**Acceptance test results:** ✅ PASS

| Check | Result |
|---|---|
| `tsc --noEmit` on web | ✅ 0 errors |
| `npm install` web (404 packages) | ✅ warnings only, 0 errors |
| `npm install` studio (1150 packages) | ✅ warnings only, 0 errors |
| `npm run dev` starts at localhost:3000 | ✅ Ready in 18.6s |
| Dashboard renders with GROQ KPI row | ✅ (empty dataset, shows "No data yet") |
| factRef schema defined as inline PT object | ✅ `factRef.ts` with `reference(fact)` |
| Studio structure: Facts / Pages / Open Findings / Scan Runs | ✅ `structure.ts` |
| TypeGen command available: `npm run typegen` | ✅ `sanity typegen generate` in studio package |
| factRef renderer in web: `FactRefInline.tsx` | ✅ renders live value from factMap |
| All 8 schemas registered in `schemas/index.ts` | ✅ |

**Manual acceptance test (requires seeded data — Phase 2):**
- Create a fact in Studio → insert via `factRef` in a page body → `/pages/[slug]` shows live value
- Edit the fact's value → page render updates on next request

This will be re-verified after Phase 2 seeding.

---

## Phase 2 — Seed + Ground Truth

**Status:** ✅ PASS

**Built:**
- `seed/src/index.ts` — idempotent seed using `createOrReplace` with deterministic IDs
- `seed/ground_truth.json` — 30 entries + 1 R4 orphan (total 31 issues)
- Dataset `fact-ledger` created on project `tmics7hc`

**Acceptance test results:**

| Check | Result |
|---|---|
| Seed run 1: 33 documents committed | ✅ |
| Seed run 2 (idempotency): same 33 operations, no duplicates | ✅ |
| GROQ count after 2 runs: facts=8, pages=23, people=2 | ✅ exactly matches spec |
| `ground_truth.json` written to `seed/ground_truth.json` | ✅ |
| Dev dataset: 15 pages, 21 planted issues | ✅ |
| Holdout dataset: 8 pages, 9 planted issues | ✅ |
| R4 orphan: `fact-data-retention-years` has zero page references | ✅ |

**Ground truth breakdown:**

| Rule | Dev | Holdout | Total |
|---|---|---|---|
| R1 (unlinked match) | 16 | 7 | 23 |
| R2 (contradiction) | 3 | 2 | 5 |
| R3 (deprecated ref) | 1 | 1 | 2 |
| R4 (orphan fact) | 1 | 0 | 1 |
| **Total** | **21** | **10** | **31** |

**Realistic traps included:**
- `page-getting-started` b3: "30-day manufacturer warranty" → true negative (hardware, not refund policy)
- `page-product-limits` b3: "100 MB" inside pipe-separated table prose → R1 should still fire
- `page-terms-of-service`: has both correct `factRef` AND plain-text copy in different blocks
- `page-ho-accessibility`: zero planted issues → clean true negative page

## Phase 3 — Scanner
**Status:** 🔒 NOT STARTED

## Phase 4 — Trigger + Impact
**Status:** 🔒 NOT STARTED

## Phase 5 — Tuning Evidence
**Status:** 🔒 NOT STARTED

## Phase 6 — Fix + Release
**Status:** 🔒 NOT STARTED

## Phase 7 — Review UX
**Status:** 🔒 NOT STARTED

## Phase 8 — Dashboard
**Status:** 🔒 NOT STARTED

## Phase 9 — Verify + Audit
**Status:** 🔒 NOT STARTED

## Phase 10 — Demo Polish
**Status:** 🔒 NOT STARTED
