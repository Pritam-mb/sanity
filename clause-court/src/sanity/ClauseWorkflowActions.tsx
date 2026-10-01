'use client'

import { useCallback, useState } from 'react'
import {
  useDocumentOperation,
  type DocumentActionComponent,
  type DocumentActionProps,
} from 'sanity'
import {
  WORKFLOW_STATE_META,
  isWorkflowState,
  type WorkflowState,
  type WorkflowTransition,
} from './workflow'

/**
 * Clause workflow document actions.
 *
 * The default Sanity "Publish" action is replaced for clause documents. A
 * reviewer cannot shortcut the process by publishing from Studio — they can
 * only walk the clause along the state machine, and every step past `debated`
 * is explicitly confirmed. This is the Studio-side half of the human approval
 * gate described in §16; the app-side half lives in
 * `src/lib/workflow/transition.ts`.
 */

function readStatus(props: DocumentActionProps): WorkflowState | null {
  const draft = props.draft as unknown as { status?: string } | null
  const published = props.published as unknown as { status?: string } | null
  const candidate = draft?.status ?? published?.status
  return isWorkflowState(candidate) ? candidate : null
}

function createTransitionAction(transition: WorkflowTransition): DocumentActionComponent {
  const ClauseWorkflowTransition: DocumentActionComponent = (
    props: DocumentActionProps
  ) => {
    const status = readStatus(props)
    const { patch, publish } = useDocumentOperation(props.id, props.type)
    const [busy, setBusy] = useState(false)
    const [confirming, setConfirming] = useState(false)

    const to = transition.to
    const from = transition.from

    const run = useCallback(async () => {
      setBusy(true)
      try {
        const draft = props.draft as unknown as { transitionLog?: unknown[] } | null
        const published = props.published as unknown as { transitionLog?: unknown[] } | null
        const existingLog = (draft?.transitionLog ?? published?.transitionLog ?? []) as unknown[]

        const newEntry = {
          _key: `tl-studio-${Date.now()}`,
          from,
          to,
          actor: 'Sanity Studio Reviewer',
          actorType: transition.owner,
          timestamp: new Date().toISOString(),
          note: transition.description,
        }

        patch.execute([
          {
            set: {
              status: to,
              transitionLog: [...existingLog, newEntry],
            },
          },
        ])
        // `resolved` and `published` are terminal-enough states that the
        // document should exist in the public dataset. Intermediate steps
        // stay as drafts so nothing becomes publicly visible early.
        if (to === 'resolved' || to === 'published') {
          publish.execute()
        }
        setConfirming(false)
      } finally {
        setBusy(false)
      }
    }, [patch, publish, to, from, props.draft, props.published])

    // Hooks above must run on every render, so the "wrong state" check has to
    // come after them — returning early first would change the hook order
    // between renders and break React's rules of hooks.
    if (status !== from) return null

    return {
      label: transition.label,
      title: transition.description,
      disabled: busy,
      tone: transition.owner === 'human' ? 'primary' : 'default',
      onHandle: () => {
        if (transition.requiresConfirmation) {
          if (confirming) {
            void run()
          } else {
            setConfirming(true)
          }
          return
        }
        void run()
      },
      dialog: confirming
        ? {
            type: 'confirm' as const,
            message: `${WORKFLOW_STATE_META[from].label} → ${WORKFLOW_STATE_META[to].label}\n\n${transition.description}`,
            onCancel: () => setConfirming(false),
            onConfirm: () => void run(),
          }
        : false,
    }
  }

  ClauseWorkflowTransition.displayName = `ClauseWorkflowTransition(${transition.from}->${transition.to})`
  return ClauseWorkflowTransition
}

const FlagAction = createTransitionAction({
  from: 'draft',
  to: 'flagged',
  owner: 'deterministic',
  label: 'Mark Flagged',
  description:
    'The deterministic ambiguity engine found an inspectable signal. This transition is owned by application code, not by a person.',
  requiresConfirmation: false,
})

const RecordDebateAction = createTransitionAction({
  from: 'flagged',
  to: 'debated',
  owner: 'deterministic',
  label: 'Record Debate',
  description: 'Both advocates returned materially different interpretations.',
  requiresConfirmation: false,
})

const IssueRulingAction = createTransitionAction({
  from: 'debated',
  to: 'ruled',
  owner: 'human',
  label: 'Issue Ruling',
  description:
    'A human judge selected an interpretation or wrote a custom ruling. AI output alone can never reach this state.',
  requiresConfirmation: true,
})

const ApproveResolutionAction = createTransitionAction({
  from: 'ruled',
  to: 'resolved',
  owner: 'human',
  label: 'Approve Resolution',
  description:
    'Human approval gate. The reviewer accepts the ruling and closes the case. The application cannot perform this on its own.',
  requiresConfirmation: true,
})

const PublishClauseAction = createTransitionAction({
  from: 'resolved',
  to: 'published',
  owner: 'human',
  label: 'Publish Clause',
  description: 'The clarified clause is released for publication.',
  requiresConfirmation: true,
})

/**
 * Every action offered for a clause document. Derived from the shared state
 * machine, so Studio can never offer a step the app would reject.
 */
export const CLAUSE_WORKFLOW_ACTIONS: DocumentActionComponent[] = [
  FlagAction,
  RecordDebateAction,
  IssueRulingAction,
  ApproveResolutionAction,
  PublishClauseAction,
]

/**
 * Sanity's own actions whose labels imply they can shortcut the workflow.
 *
 * The default Publish action is the dangerous one: it would let a reviewer put a
 * `ruled` clause into the public dataset without ever accepting the ruling,
 * which is exactly the bypass the approval gate exists to prevent. These are
 * removed and replaced by the transitions above, which carry the same power but
 * refuse to act from the wrong state.
 */
const BLOCKED_DEFAULT_ACTIONS = ['publish', 'unpublish']

/** Wired into `document.actions` in sanity.config.ts. */
export function clauseDocumentActions(
  previous: DocumentActionComponent[]
): DocumentActionComponent[] {
  const kept = previous.filter((action) => {
    if (!action) return false
    const name = (action as { action?: string }).action ?? ''
    return !BLOCKED_DEFAULT_ACTIONS.includes(name)
  })

  return [...CLAUSE_WORKFLOW_ACTIONS, ...kept]
}
