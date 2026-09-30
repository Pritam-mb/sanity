# Clause Court v2: from one judge to a policy council

One judge and one approver is a bottleneck and a single point of bias. Real policy
is settled by a group with different interests: legal, security, operations, vendor
management. So the judge becomes a **council**, and the hearing becomes a
**deliberation chamber** where everyone's opinion is on the record.

**New principle:** *AI argues and assists. Rules flag and tally. A council decides.
Sanity remembers every voice.*

## 1. Roles

| Role | Does |
|---|---|
| **Author** | Adds the clause in Studio |
| **Council member** | Submits a position, comments, votes. Each has a seat (Legal, Security, Ops, Vendor Mgmt, Finance…) |
| **Chair** | Opens and closes sessions and cannot override the vote. This is a procedural role. |
| **Approver(s)** | Two people, neither the author nor the chair, sign off on the result |
| **System** | Scans, tallies, summarises the numbers. It has **no vote** and cannot approve. |
| **AI assistant** | Advises members. It never votes and never appears as a council member. |

## 2. Workflow

```
draft → flagged → briefing → deliberation → synthesis → voting → ruled → approved → released
 system  system    AI advocates   council     system+AI   council  (record)  2 humans   approver
```

1. **Flagged:** the detector flags the clause and attaches the applicable regulations and benchmarks.
2. **Briefing:** the Gemini advocates give the two opening arguments, as now, with precedent and regulation anchors. This is the shared starting point.
3. **Deliberation** (the virtual zone, with a time window):
   - **Blind round:** each member submits a position privately *before* seeing the others, to avoid anchoring on the loudest voice. The chair can reveal positions when the window closes.
   - **Open round:** positions become visible. Members reply, support, challenge and revise. Every revision is kept.
4. **Synthesis:** the system builds a deterministic summary from the structured positions. The AI then drafts 2 to 3 **options** for the council to vote on (see section 5).
5. **Voting:** members vote on the options. Rules for the result:
   - quorum (for example 60% of seats)
   - a majority threshold
   - **required seats** (Legal and Security must have voted), so a convenient majority can't bypass the experts
6. **Ruled:** the holding is stored with the tally, who voted for what, and **human dissents** from the minority. The AI-written dissent is optional and clearly labelled.
7. **Approved → Released:** a **two-person rule**. Two different approvers sign, and neither may be the author or the chair. This replaces the single check.
8. Every step writes an immutable `auditEntry`.

The server still answers **409** to skipped steps, non-human approvals, duplicate approvers, or a vote from someone without a seat.

## 3. Structured positions (the key design)

A free-text opinion can't be graphed or summarised reliably. Each position is structured, with prose on top:

```
position {
  member → councilMember
  clause → clause
  stance: "support-A" | "support-B" | "custom"
  proposedValue: 8, unit: "business_hours"
  rationale: "..."            // prose
  confidence: 1-5
  basis: [regulation | precedent | benchmark refs]
  respondsTo: position ref (optional)
  round: "blind" | "open"
}
```

Numbers make the summary and graph **deterministic**. The model is only needed for prose.

## 4. The opinion map (graph)

Two views on the clause page:

- **Spectrum view:** a horizontal axis of proposed values (4h … 48h). Each member is a dot sized by confidence and coloured by seat. Clusters show at a glance where the council agrees and where it splits.
- **Argument graph:** nodes are positions, and edges are *supports*, *challenges* or *responds to*. A challenge edge appears when someone replies in opposition. Positions backed by a regulation or precedent get a gold ring.

The site-wide `/graph` also shows council decisions feeding into precedents.

## 5. The summary (mostly deterministic)

The live summary card is computed, not generated:

- votes or positions received out of total seats, and who is silent
- min, median and max of the proposed values
- cluster sizes ("5 members between 8 and 24 hours")
- which seats disagree with which
- whether any proposal falls **below an applicable legal floor**
- a **consensus score** (spread of values weighted by confidence)

**Where AI helps, always labelled as suggestion:**

| AI feature | What it does |
|---|---|
| **Think with AI** (private) | A member asks "what are the risks of 8 hours for small vendors?" and gets an answer grounded in the knowledge base and precedents |
| **Red team** | Attacks the currently leading option |
| **Option drafter** | Turns the clusters into 2 to 3 votable options with wording |
| **Compromise finder** | Suggests a staged option (for example 8h for critical incidents, 48h otherwise) |
| **Gap finder** | Notices what nobody has raised (small vendors, weekends, time zones) |
| **Narrative summary** | Writes the prose from the computed numbers |

All AI output is stored with model and prompt version, and only humans can adopt it.

## 6. Content model changes

**New documents:**

| Document | Purpose |
|---|---|
| `council` | Name, seats, quorum %, threshold %, required seats |
| `councilMember` | Person, seat, active flag |
| `session` | Clause, round state, deadlines, status |
| `position` | Structured opinion (above) |
| `comment` | Threaded replies, with a type (support, challenge, question) |
| `vote` | Member, option, session |
| `option` | Votable proposal, source (member or AI), structured value |
| `synthesis` | Stored computed summary snapshot, so the record is reproducible |
| `approval` | Approver, note, timestamp |

**Changed documents:**
- `ruling` now references the session and stores the tally, the dissent list, and whether required seats voted
- `precedent` keeps the council that created it, and a status (active, superseded, overruled)
- `clause` gains `session` and a `stale` flag

## 7. Pages

| Route | Shows |
|---|---|
| `/` | Pitch and the new principle |
| `/dashboard` | Personalised **"your move"** queue: sessions waiting for *your* position, vote or approval |
| `/clauses`, `/clauses/[id]` | As before, plus session status, regulations, and audit timeline |
| `/debate/[id]` | AI briefing: the two advocates and the precedent banner |
| **`/chamber/[id]`** | **The virtual zone:** spectrum view, argument graph, position cards, threaded replies, live summary, "Think with AI" side panel, vote panel |
| **`/council`** | Members, seats, participation history, decisions |
| `/precedents`, `/precedents/[id]` | Library and lineage, with the council decision and vote breakdown |
| `/knowledge` | Company profile, regulations, benchmarks, definitions |
| `/graph` | Reference web, stale nodes in red |
| `/about` | How it works, deterministic vs model table, disclaimer |

**Sanity features to lean on:** the **Live Content API** (or listeners) so positions and votes appear in real time, **Studio** for the knowledge base and audit log, and **Functions** for scan-on-publish and for closing a session when its deadline passes.

## 8. Dashboard

1. **Your move:** cards for sessions where you still owe a position, vote or approval, with deadlines.
2. **Session board:** columns for Briefing, Deliberating, Voting and Awaiting approval.
3. **Participation strip:** who has responded in each open session.
4. **Consensus meter:** per open clause, how close the council is.
5. **Knowledge health:** stale precedents, expired regulation reviews, terms ruled several times with no definition yet.
6. **Activity feed:** the last audit entries.

## 9. Important consequences

- **Identity is now required.** Several people means real sign-in (for example NextAuth or magic links, with member records in Sanity). This moves auth from "later" to Tier 1. For the demo, simple seeded users with a switcher ("view as Priya, Arjun, Meera") is acceptable, and the post should say it's a demo limitation.
- **Integrity of the record.** Positions are append-only. Edits create a new revision, so nobody can quietly change what they said before the vote.
- **Manipulation checks.** Show the blind-round results next to the open-round results, so you can see who changed their mind after seeing others.
- **Legal floors still apply.** An option below an applicable regulation's threshold is blocked unless the council records an override with a reason. Check the actual thresholds against official sources before seeding. I gave examples earlier from memory.
- **The AI can never tip a vote.** It has no seat, and its options are labelled as AI-drafted wherever they appear.

## 10. Build tiers

**Tier 1, must ship:**
- Council, members, positions, votes, sessions in Sanity
- Seeded identities with a role switcher
- `/chamber/[id]` with the spectrum view, position cards, replies, and the deterministic summary
- Blind then open rounds
- Quorum, threshold and required-seat rules, and the two-person approval
- Audit log, dashboard, tests for the workflow and the tally
- Knowledge base (about 10 regulations), the disclaimer, and accessibility fixes

**Tier 2:**
- Argument graph with support and challenge edges
- "Think with AI", option drafter, and red team
- Live updates
- No-LLM fallback briefing
- Precedent lifecycle and stale marking

**Tier 3:**
- Compromise finder and gap finder
- Change-of-mind view
- Definition auto-proposal
- Real authentication

## 11. Revised demo

1. Priya adds clause #0044 in Studio. It flags, with the regulation context.
2. The AI advocates open the hearing (4h vs 48h).
3. The council of five each submit a blind position: for example 4h, 8h, 8h, 24h, 48h.
4. The chair reveals them. The spectrum view shows a cluster at 8 to 24h, and the summary shows median 8h, one outlier, and Legal's floor check.
5. Members challenge each other. Ops asks about small vendors, and the AI gap finder flags weekends and time zones.
6. The AI drafts three options, including a staged compromise. The council votes, meets quorum, and Legal and Security have both voted.
7. The ruling records the tally and the dissenters. Two approvers sign and the clause is released, with the audit timeline visible.
8. A month later, the second "promptly" clause finds the precedent, which now carries "decided by council, 4 to 1" and its match breakdown.

The closing table should show that the model wrote the arguments, options and prose, while Sanity held the rules, positions, votes, tallies and audit trail.
