import type {
  DefaultDocumentNodeResolver,
  StructureBuilder,
  StructureResolver,
} from 'sanity/structure'
import { WORKFLOW_STATES, WORKFLOW_STATE_META } from './workflow'
import { ClauseCourtPreview } from './components/ClauseCourtPreview'
import { ClauseWorkflowPanel } from './components/ClauseWorkflowPanel'

/**
 * Desk structure that mirrors the courtroom process.
 *
 * Clauses are grouped by workflow state rather than listed flat, so a reviewer
 * opening Studio sees the same queue the app shows them — the highest state is
 * always the one that needs a person.
 */
export const deskStructure: StructureResolver = (S: StructureBuilder) => {
  const byStatus = WORKFLOW_STATES.map((state) =>
    S.listItem()
      .id(`status-${state}`)
      .title(
        `${WORKFLOW_STATE_META[state].icon}  ${WORKFLOW_STATE_META[state].label}`
      )
      .child(
        S.documentList()
          .id(`list-${state}`)
          .title(`${WORKFLOW_STATE_META[state].label} Clauses`)
          .schemaType('clause')
          .filter(`_type == "clause" && status == "${state}"`)
          .defaultOrdering([{ field: '_updatedAt', direction: 'desc' }])
      )
  )

  return S.list().title('Clause Court').items([
    S.listItem()
      .title('Needs Review')
      .id('needs-review')
      .child(
        S.documentList()
          .id('needs-review-list')
          .title('Needs Review')
          .filter(
            '_type == "clause" && status in ["flagged", "debated", "ruled"]'
          )
          .defaultOrdering([{ field: '_updatedAt', direction: 'desc' }])
      ),

    S.listItem()
      .title('All Clauses')
      .id('all-clauses')
      .child(
        S.documentTypeList('clause')
          .title('All Clauses')
          .defaultOrdering([{ field: '_updatedAt', direction: 'desc' }])
      ),

    S.divider(),

    ...byStatus,

    S.divider(),

    S.documentTypeListItem('precedent')
      .title('📚  Precedent Library')
      .child(
        S.documentTypeList('precedent')
          .title('Precedent Library')
          .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
      ),

    S.documentTypeListItem('ruling')
      .title('🔨  Rulings')
      .child(
        S.documentTypeList('ruling')
          .title('Rulings')
          .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
      ),

    S.documentTypeListItem('debate')
      .title('⚔  Debates')
      .child(S.documentTypeList('debate').title('Debates')),

    S.documentTypeListItem('interpretation')
      .title('⚖  Interpretations')
      .child(S.documentTypeList('interpretation').title('Interpretations')),

    S.documentTypeListItem('definition')
      .title('📖  Definitions')
      .child(S.documentTypeList('definition').title('Definitions')),
  ])
}

/**
 * Custom views for Clause documents in Studio (PRD §36 & §46 Priority 1):
 * - Live Court Preview: embedded interactive preview of the clause in Clause Court
 * - Workflow & Audit Log: App SDK panel showing state machine and transition audit trail
 */
export const defaultDocumentNode: DefaultDocumentNodeResolver = (S, { schemaType }) => {
  if (schemaType === 'clause') {
    return S.document().views([
      S.view.form(),
      S.view.component(ClauseCourtPreview).title('Live Court Preview'),
      S.view.component(ClauseWorkflowPanel).title('Workflow & Audit Log'),
    ])
  }
  return S.document().views([S.view.form()])
}

export default deskStructure

