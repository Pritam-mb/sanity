// =============================================
// YOUR-MOVE QUEUE — pure dashboard logic
// =============================================
//
// Kept free of Sanity imports so the test runner (plain node, no path
// aliases) can exercise it. chamber.ts fetches the rows; this decides
// what each member still owes.

export interface OpenSessionRow {
  _id: string
  status: string
  round: string | null
  deadline: string | null
  clause: { _id: string; title: string; caseNumber: string; submittedBy: string | null }
  chairId: string | null
  positioned: string[]
  voters: string[]
  approverIds: string[]
}

export interface YourMove {
  sessionId: string
  clauseTitle: string
  caseNumber: string
  action: string
  detail: string
  deadline: string | null
}

/** Personalised queue: what this member still owes, and where. */
export function yourMoveQueue(
  sessions: OpenSessionRow[],
  viewerMemberId: string
): YourMove[] {
  const queue: YourMove[] = []
  for (const s of sessions) {
    const base = {
      sessionId: s._id,
      clauseTitle: s.clause?.title ?? 'Untitled clause',
      caseNumber: s.clause?.caseNumber ?? '',
      deadline: s.deadline,
    }
    if (s.status === 'briefing' && s.chairId === viewerMemberId) {
      queue.push({ ...base, action: 'Open deliberation', detail: 'The briefing is ready — open the blind round.' })
    } else if (s.status === 'deliberation' && !s.positioned.includes(viewerMemberId)) {
      queue.push({
        ...base,
        action: s.round === 'blind' ? 'Submit blind position' : 'Submit position',
        detail: 'The council is waiting on your structured position.',
      })
    } else if (s.status === 'synthesis' && s.chairId === viewerMemberId) {
      queue.push({ ...base, action: 'Draft options', detail: 'Turn the clusters into 2–3 votable options.' })
    } else if (s.status === 'voting' && !s.voters.includes(viewerMemberId)) {
      queue.push({ ...base, action: 'Cast your vote', detail: 'Options are on the table — pick one.' })
    } else if (
      s.status === 'ruled' &&
      !s.approverIds.includes(viewerMemberId) &&
      s.chairId !== viewerMemberId &&
      (s.clause?.submittedBy ?? '').trim().toLowerCase() !==
        viewerMemberId.trim().toLowerCase()
    ) {
      // Author exclusion by member id is approximate here (clauses track names);
      // the server re-checks by name on release.
      queue.push({ ...base, action: 'Sign approval', detail: 'One of two required signatures.' })
    }
  }
  return queue
}
