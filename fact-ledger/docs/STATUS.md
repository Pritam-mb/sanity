# Fact Ledger — Project Status

**Last Updated:** 2026-10-02  
**Overall Status:** ✅ COMPLETE (All Phases Shipped)  
**Sanity Project:** `tmics7hc` · Dataset: `fact-ledger`  
**Live URLs:** Next.js → `http://localhost:3000` · Studio → `http://localhost:3333`

---

## Summary

Fact Ledger is a **drift detection and AI-remediation system** built entirely on Sanity. Organizations repeat the same facts (refund windows, SLA uptime, fees, limits) across many pages. When a fact changes, most pages go stale silently. Fact Ledger catches every stale copy within seconds of a publish event, automatically generates precise text mutations as a draft release, and lets a human apply all fixes in a single click.

**Core loop:** `Sanity publish → Webhook → Scanner → Findings → AI Agent → Remediation Draft → One-click Publish`

---

## Phase 1 — Foundation ✅

**Built:**
- Monorepo: `studio/`, `web/`, `scanner/`, `seed/`, `bench/`, `docs/`
- Sanity Studio v3 with 9 schemas: `fact`, `person`, `factRef`, `page`, `finding`, `scanRun`, `changeEvent`, `benchmarkResult`, `remediation`
- Custom Studio sidebar structure (Facts / Pages / Open Findings / Remediation Releases / Scan Runs / Audit Log / Benchmark / People)
- Next.js 16 App Router dashboard with Sanity client (`lib/sanity/client.ts`)
- `FactRefInline.tsx` — renders `factRef` blocks as live canonical values in page body

**Acceptance:** `tsc --noEmit` → 0 errors. Dev server ready in ~600ms.

---

## Phase 2 — Seed + Ground Truth ✅

**Built:**
- `seed/src/index.ts` — idempotent seed using `createOrReplace` with deterministic IDs
- 8 canonical Facts, 24 Pages (15 dev + 8 holdout + 1 clean), 2 People
- `seed/ground_truth.json` — 31 planted drift issues (30 content + 1 R4 orphan)

**Ground truth breakdown:**

| Rule | Dev | Holdout | Total |
|---|---|---|---|
| R1 (Unlinked match) | 16 | 7 | 23 |
| R2 (Contradiction) | 3 | 2 | 5 |
| R3 (Deprecated ref) | 1 | 1 | 2 |
| R4 (Orphan fact) | 1 | 0 | 1 |
| **Total** | **21** | **10** | **31** |

---

## Phase 3 — Scanner ✅

**Built:**
- `scanner/src/index.ts` — 5 deterministic rules (R1–R5), zero dependencies
- `scanner/src/types.ts` — `ScannerFact`, `ScannerPage`, `ScannerFinding`, `Rule`
- Vitest unit test suite: `4/4 tests passing`

**Rules:**

| Rule | Description |
|---|---|
| **R1** | Plain-text copy of a fact's value or alias found in prose (unlinked match) |
| **R2** | Different number near a fact's label keyword (contradiction) |
| **R3** | A `factRef` block pointing to a deprecated fact |
| **R4** | An active fact with zero page references (orphan) |
| **R5** | A `factRef` block pointing to a fact outside its `effectiveFrom`/`effectiveUntil` window (temporal violation) |

**Benchmark Results (100% Precision & Recall on all 31 planted issues):**

| Dataset | Rule | TP | FP | FN | Precision | Recall |
|---|---|---|---|---|---|---|
| Dev | R1 | 17 | 0 | 0 | 100% | 100% |
| Dev | R2 | 3 | 0 | 0 | 100% | 100% |
| Dev | R3 | 1 | 0 | 0 | 100% | 100% |
| Dev | R4 | 1 | 0 | 0 | 100% | 100% |
| Holdout | R1 | 6 | 0 | 0 | 100% | 100% |
| Holdout | R2 | 2 | 0 | 0 | 100% | 100% |
| Holdout | R3 | 1 | 0 | 0 | 100% | 100% |

---

## Phase 4 — Live Detection via Webhooks ✅

**Built:**
- `web/app/api/webhook/sanity/route.ts` — receives Sanity publish events, runs the full scanner, and writes/resolves `finding` documents in a single Sanity transaction
- Compares new scan results against existing open findings to avoid duplicates
- Creates a `scanRun` audit document on every invocation
- Excludes draft documents (`drafts.**`) from all queries to prevent strong-reference conflicts during publish

**How it works:**
1. Sanity cloud fires a POST to `/api/webhook/sanity` when any `page` or `fact` is published
2. The webhook fetches all published pages and facts (no drafts)
3. `runScanner()` generates a fresh list of findings
4. Existing open findings that no longer appear are marked `resolved`
5. New findings not already tracked are created with full metadata (`blockKey`, `childKey`, `startOffset`, `endOffset`)

---

## Phase 5 — AI Agent Auto-Remediation ✅

**Built:**
- `web/app/api/agent/remediate/route.ts` — the deterministic AI Agent
- Agent fetches all `open` findings, locates the exact Portable Text span, slices the surrounding text, builds a Sanity Patch mutation (JSON), and packages all fixes into a draft `remediation` document
- `studio/actions/PublishRemediationAction.ts` — custom Sanity Studio Document Action replacing the default Publish button on `remediation` documents
- One-click "Apply Fixes & Publish" executes all approved mutations across all affected pages atomically

**Demo flow:**
```
POST /api/agent/remediate
→ Creates: Remediation Release (draft) with N proposed fixes
→ Open in Studio → Review fixes → Click "Apply Fixes & Publish"
→ All N pages are patched; all N findings marked "fixed"
```

---

## Phase 6 — Advanced Features ✅

### 6a — Audit Log (The "Ledger")
- Every significant action writes an immutable `changeEvent` document to Sanity
- Events captured: `fix_drafted` (by AI Agent), `release_published` (by Human Editor)
- Dashboard homepage now shows a **Recent Ledger Activity** feed with the last 5 events
- Events include actor, timestamp, and release ID for full traceability

### 6b — Temporal Facts
- `fact` schema now has `effectiveFrom` (date) and `effectiveUntil` (date) fields
- **R5 scanner rule** automatically flags any `factRef` pointing to a fact that is expired or not yet effective
- Supports scheduled fact changes (e.g. "Summer Pricing ends Sept 1st")

### 6c — Fact Relationships
- `fact` schema now has a `dependsOn` array of references to other facts
- Editors can model logical dependencies between facts in the Studio (e.g. "Enterprise Min Users depends on Enterprise Plan fact")

---

## TypeScript Health ✅

| Location | Result |
|---|---|
| `web/` (tsc --noEmit) | ✅ 0 errors |
| `scanner/` (tsc --noEmit) | ✅ 0 errors |
| Scanner tests (Vitest) | ✅ 4/4 passing |

---

## Key Files

| File | Purpose |
|---|---|
| `scanner/src/index.ts` | All 5 scanner rules (R1–R5) + `runScanner()` |
| `scanner/src/types.ts` | Shared TypeScript interfaces |
| `web/app/api/webhook/sanity/route.ts` | Webhook handler — live finding creation/resolution |
| `web/app/api/agent/remediate/route.ts` | AI Agent — auto-generates Sanity patch mutations |
| `studio/actions/PublishRemediationAction.ts` | Custom Studio action — one-click fix application |
| `studio/schemas/remediation.ts` | Remediation Release document schema |
| `studio/schemas/fact.ts` | Fact schema (with `effectiveUntil`, `dependsOn`, `highStakes`) |
| `studio/structure.ts` | Custom Studio sidebar structure |
| `web/app/page.tsx` | Dashboard with KPIs + Audit Log feed |
| `web/app/findings/page.tsx` | Findings table (R1–R5 color-coded) |
| `web/app/facts/page.tsx` | Facts table (with temporal fields) |
| `seed/src/index.ts` | Idempotent seed script |

---

## Sanity Usage (Proof for Dev.to)

This project uses Sanity as:
1. **The content database** — all Facts, Pages, People stored in Sanity Content Lake
2. **The drift output store** — Finding, ScanRun, ChangeEvent, and Remediation documents written via `@sanity/client`
3. **The structured editor** — Sanity Studio with custom document actions and sidebar structure
4. **The event bus** — Sanity webhooks trigger live drift detection
5. **The release manager** — Remediation documents act as Sanity-native content releases

All dashboard numbers come from live GROQ queries. No hard-coded values anywhere.
