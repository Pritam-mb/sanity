# Fact Ledger

An AI-assisted fact drift detection system. Organizations state the same facts (refund windows, SLA uptime, fees, limits) in many pages. When a fact changes, one page is edited and the rest silently go stale. **Fact Ledger finds every stale copy, fixes them in one reviewed release, and verifies drift is zero.**

**Headline claim:** *Change one fact, find every stale copy, fix them in one reviewed release, and verify drift is zero.*

**Principle:** Rules flag. AI drafts. Human approves. Sanity remembers.

---

## Monorepo structure

```
fact-ledger/
├── studio/     # Sanity Studio v3 — source of truth, schema, structure
├── web/        # Next.js 16 App Router — Drift Dashboard + page renderer
├── scanner/    # Pure TypeScript functions R1–R4 + Vitest unit tests
├── seed/       # Idempotent seed script (facts, dev + holdout pages, ground truth)
├── bench/      # Benchmark runner — writes benchmarkResult docs
└── docs/       # PROGRESS.md, spec, design notes
```

## Tech stack

- **Sanity Studio v3** + Content Lake: source of truth, schema, custom structure
- **TypeGen:** `sanity typegen generate` in `studio/`
- **Next.js 16** App Router + TypeScript: dashboard and API routes
- **Charts:** Recharts (required panels P1–P6)
- **Scanner:** TypeScript pure functions, unit-tested with Vitest
- **LLM:** Optional. Disabled by default. `rephraseSentence()` in `web/lib/llm.ts` — set `LLM_API_KEY` to enable

## Fallback choices (Section 13 of spec)

| Preferred | Chosen | Notes |
|---|---|---|
| Sanity Functions | **Next.js API route** | Sanity Functions require plan upgrade. Fallback recorded here per spec §13. |
| Content Releases | **Content Releases (preferred)** | Available via `@sanity/client` JS client. |
| Agent Actions rephrase | **Direct LLM call (disabled by default)** | No `LLM_API_KEY` → plain splice, no rephrase. |
| Custom Studio tool | **Dashboard as Next.js page** | visionTool added for GROQ exploration in Studio. |

## Setup

```bash
git clone <repo>
cd fact-ledger

# 1. Fill in environment files
cp web/.env.example web/.env.local
# Edit web/.env.local with your Sanity project ID + API token
# Edit studio/.env with same values

# 2. Install everything
npm install --workspace=web
npm install --workspace=studio
npm install --workspace=scanner
npm install --workspace=seed
npm install --workspace=bench

# 3. One-command demo reset (seed + benchmark)
npm run demo:reset

# 4. Run dev servers
npm run dev:web     # http://localhost:3000
npm run dev:studio  # http://localhost:3333
```

## Environment variables

### `web/.env.local`
| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | ✅ | From sanity.io/manage |
| `NEXT_PUBLIC_SANITY_DATASET` | ✅ | `fact-ledger` |
| `SANITY_API_TOKEN` | ✅ (writes) | Editor token — never `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SANITY_READ_TOKEN` | Optional | Blank for public datasets |
| `LLM_API_KEY` | Optional | Enables `rephraseSentence()` |
| `LLM_MODEL` | Optional | Defaults to `gemini-2.5-flash` |

## Commands

```bash
npm run dev:web       # Next.js dev server (port 3000)
npm run dev:studio    # Sanity Studio (port 3333)
npm run test          # Vitest unit tests (scanner)
npm run seed          # Seed demo dataset
npm run bench         # Run benchmark, write benchmarkResult docs
npm run demo:reset    # seed + bench in sequence
npm run typegen       # sanity typegen generate
```

## Dashboard panels

| Panel | Description |
|---|---|
| P1 | KPI row: Drift Score, Facts, Pages, Coverage % |
| P2 | Before vs after release per fact (grouped bar) |
| P3 | Fact × Page heatmap (CSS grid) |
| P4 | Accuracy vs ground truth (TP/FP/FN/precision/recall) |
| P5 | Baseline comparison (exact-string vs scanner) |
| P6 | Findings table with Approve/Dismiss |

All numbers come from GROQ queries against Sanity documents. No hard-coded values.

## Forbidden (per spec §12)

Councils, voting, AI judges, auto-extraction, multi-language, custom auth, public chatbot, extra dashboard panels.

## Future work

- Sanity Functions webhook handler (currently a Next.js API route fallback)
- Compromise finder, gap finder (out of scope for MVP)
- Real authentication (currently open)
- Multi-tenant support
