# Clause Court

An AI courtroom for structured policy documents.

A clause is submitted, a **deterministic** engine inspects it for ambiguity, two
AI advocates argue opposing interpretations of whatever it flagged, a **human**
judge rules, and the ruling is stored as **precedent** that later debates
retrieve. The chain is the product:

```
Clause ──deterministic ambiguity──▶ flagged
       ──AI advocates (Gemini)──▶   debated
       ──human judge──▶              ruled
       ──human approval gate──▶      resolved
       ──human publish──▶            published
                                └─▶ Precedent ─▶ cited by future clauses
```

The split between machine and human is enforced in code, not by prompting. The
model never flags, never rules, and never resolves. It argues.

## Requirements

- Node.js 20+
- A Sanity project (https://www.sanity.io/manage)
- A Gemini API key (https://aistudio.google.com/apikey)

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | everything | From your Sanity project settings |
| `NEXT_PUBLIC_SANITY_DATASET` | everything | `production` or `development` |
| `SANITY_API_TOKEN` | writing | Editor access. Server-only — never prefix with `NEXT_PUBLIC_` |
| `GEMINI_API_KEY` | debates | Server-only. The debate chamber errors clearly without it |
| `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET` | Studio | Falls back to the `NEXT_PUBLIC_*` values |
| `NEXT_PUBLIC_SANITY_READ_TOKEN` | private datasets | Optional |

Then start the app and seed the demo dataset:

```bash
npm run dev
```

Visit `http://localhost:3000` and press **⟳ Reset Demo** (or `POST /api/seed`).
This creates 12 clauses, 4 definitions, 3 flagged by the ambiguity engine, and one
fully litigated case: a refund clause argued, ruled on, and turned into precedent
which a second clause then cites.

> Seeding is destructive — it deletes and rebuilds the dataset.

## The Sanity Studio

```bash
npx sanity dev          # studio on :3333
npx sanity deploy       # hosted studio
```

Clause documents get custom workflow actions instead of Sanity's default
Publish/Unpublish, so a clause cannot be pushed public from Studio without
walking the state machine. Studio and the app import the same
`src/sanity/workflow.ts`, so a step legal in one is legal in the other.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard — counts, flagged clauses, recent rulings |
| `/clauses` | Clause list with status filter and search |
| `/clauses/[id]` | Clause detail: ambiguity report, cited precedent, recorded ruling, **human approval gate** |
| `/debate/[id]` | Debate chamber. Streams both advocates live; restores a recorded case on reload |
| `/precedents` | Precedent library, ranked by citations |
| `/precedents/[id]` | A holding, its lineage, and the clauses that cite it |
| `/graph` | Clause → Ruling → Precedent reference graph |

### API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/debate/stream/[id]` | SSE hearing; tokens as the model produces them |
| `POST /api/debate` | Same hearing, non-streaming |
| `POST /api/ruling` | Records a human decision and derives the precedent |
| `GET /api/workflow?clauseId=` | Steps a human may take from the current state |
| `POST /api/workflow` | Performs one human-authorised transition |
| `POST /api/seed` | Destructive demo reset |

## How the guarantees are enforced

The requirements make promises that a prompt cannot keep, so each one is checked
mechanically:

- **The model cannot invent precedent.** Advocates name precedent in free text.
  `src/lib/debate/quality.ts` matches those claims against the documents
  actually supplied in the prompt, and unmatched claims are *dropped* before
  anything is written. Nothing fabricated enters the reference graph.
- **Quoted evidence must be real.** Every `textualEvidence` quote is checked
  against the clause text. A quote that does not appear is discarded — a
  fabricated quotation is indistinguishable from a real one to a reader.
- **The advocates must actually disagree.** If the two arguments exceed 75%
  word overlap, the hearing is rejected rather than presented as a debate.
- **Rulings record what was said.** `POST /api/ruling` takes a `debateId` and
  reads the advocates' arguments back out of Sanity. A client cannot edit
  history by editing a request body.
- **Nothing resolves itself.** `assertHumanTransition` refuses any transition
  not owned by a human, so `ruled → resolved` is reachable only by a person
  clicking the approval gate. `createRuling` stops the clause at `ruled`.
- **Citations are derived, not counted.** `citationCount` is recomputed by
  walking the reference graph, so the number on a card cannot drift.

## Ambiguity detection

`src/lib/ambiguity/detector.ts` is pure and rule-based — no model involved, and
each signal names the rule that fired and the offset where it matched:

- **Vague quantifier** — `promptly`, `reasonable`, `significant`, …
- **Undefined term** — a capitalised term with no matching definition
- **Subjective standard** — `satisfactory`, `as appropriate`, …
- **Open-ended discretion** — `at its discretion`, `may elect to`, …
- **Missing definition** — Rule B: a term is only flagged as undefined if the
  clause has definitions to be measured against, so clean clauses stay clean

## Scripts

```bash
npm run dev     # Next.js dev server
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit
```
