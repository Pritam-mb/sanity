import { defineArrayMember, defineField, defineType } from 'sanity'
import { WORKFLOW_STATES, WORKFLOW_STATE_META } from '../workflow'

/**
 * A single unit of policy or contract language that may be ambiguous.
 *
 * `ambiguitySignals` is written by the deterministic engine only. It is never
 * produced by an LLM — that separation is the point of the product (§26).
 */
export const clauseType = defineType({
  name: 'clause',
  title: 'Clause',
  type: 'document',
  icon: () => '📋',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'analysis', title: 'Deterministic Analysis' },
    { name: 'graph', title: 'Reference Graph' },
    { name: 'workflow', title: 'Workflow' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'text',
      title: 'Clause Text',
      type: 'text',
      rows: 5,
      group: 'content',
      description:
        'The exact language under review. The ambiguity engine scans this text character by character.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'content',
      options: {
        list: [
          'Refund Policy',
          'Service Level Agreement',
          'Support Policy',
          'Data Policy',
          'Billing',
          'Technical',
          'Security',
          'Legal',
          'Compliance',
          'Usage Policy',
        ],
      },
    }),
    defineField({
      name: 'caseNumber',
      title: 'Case Number',
      type: 'string',
      group: 'content',
      description: 'Court-style reference, e.g. #0042.',
    }),
    defineField({
      name: 'submittedBy',
      title: 'Submitted By',
      type: 'string',
      group: 'content',
      description:
        'The person who put this case forward for review. Shown on the case page as its attribution.',
    }),

    // ─── Deterministic analysis ────────────────────────
    defineField({
      name: 'ambiguitySignals',
      title: 'Ambiguity Signals',
      type: 'array',
      group: 'analysis',
      readOnly: true,
      description:
        'Written exclusively by the deterministic ambiguity engine. Each signal names the rule that fired, the exact term, and its character offset.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'ambiguitySignal',
          fields: [
            defineField({
              name: 'type',
              title: 'Signal Type',
              type: 'string',
              options: {
                list: [
                  { title: 'Vague Quantifier (Rule A)', value: 'vague_quantifier' },
                  { title: 'Missing Definition (Rule B)', value: 'missing_definition' },
                  { title: 'Conditional Ambiguity (Rule D)', value: 'conditional_ambiguity' },
                  { title: 'Conflicting Reference (Rule C)', value: 'conflicting_reference' },
                  { title: 'Company Standard (Rule E)', value: 'company_standard' },
                ],
              },
            }),
            defineField({ name: 'term', title: 'Term', type: 'string' }),
            defineField({
              name: 'position',
              title: 'Character Offset',
              type: 'number',
              description: 'Where the term appears in the clause text.',
            }),
            defineField({ name: 'message', title: 'Message', type: 'text', rows: 2 }),
            defineField({
              name: 'ruleLabel',
              title: 'Rule',
              type: 'string',
              description: 'Human-readable rule that produced this signal.',
            }),
          ],
          preview: {
            select: { title: 'term', rule: 'ruleLabel', type: 'type' },
            prepare({ title, rule, type }) {
              return {
                title: `"${title ?? '?'}"`,
                subtitle: `${rule ?? type ?? 'signal'}`,
              }
            },
          },
        }),
      ],
    }),

    // ─── Reference graph ───────────────────────────────
    defineField({
      name: 'definitions',
      title: 'Definitions In Use',
      type: 'array',
      group: 'graph',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'definition' }] })],
      description:
        'Linked definition documents. A term listed here satisfies the Missing Definition rule.',
    }),
    defineField({
      name: 'citedPrecedent',
      title: 'Cites Precedent',
      type: 'array',
      group: 'graph',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'precedent' }] })],
      description:
        'Prior human rulings this clause is argued against. This field is what makes the precedent graph load-bearing rather than decorative.',
    }),
    defineField({
      name: 'debates',
      title: 'Debates',
      type: 'array',
      group: 'graph',
      readOnly: true,
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'debate' }] })],
    }),
    defineField({
      name: 'currentRuling',
      title: 'Current Ruling',
      type: 'reference',
      group: 'graph',
      readOnly: true,
      to: [{ type: 'ruling' }],
    }),
    defineField({
      name: 'session',
      title: 'Deliberation Session',
      type: 'reference',
      group: 'graph',
      readOnly: true,
      to: [{ type: 'session' }],
      description: 'The council session deliberating this clause, if one is open.',
    }),
    defineField({
      name: 'stale',
      title: 'Stale Precedent Warning',
      type: 'boolean',
      group: 'workflow',
      readOnly: true,
      initialValue: false,
      description:
        'Set when a precedent this clause relies on was superseded or overruled.',
    }),

    // ─── Workflow ──────────────────────────────────────
    defineField({
      name: 'status',
      title: 'Workflow State',
      type: 'string',
      group: 'workflow',
      initialValue: 'draft',
      options: {
        list: WORKFLOW_STATES.map((state) => ({
          title: `${WORKFLOW_STATE_META[state].icon}  ${WORKFLOW_STATE_META[state].label}`,
          value: state,
        })),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'transitionLog',
      title: 'Workflow Transition Log',
      type: 'array',
      group: 'workflow',
      readOnly: true,
      description:
        'Immutable audit trail of state transitions, recording the actor, prior state, new state, timestamp, and human rationale.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'workflowTransitionEntry',
          title: 'Transition Entry',
          fields: [
            defineField({ name: 'from', title: 'From State', type: 'string' }),
            defineField({ name: 'to', title: 'To State', type: 'string' }),
            defineField({
              name: 'actor',
              title: 'Actor',
              type: 'string',
              description: 'Human reviewer name, judge, or system engine.',
            }),
            defineField({
              name: 'actorType',
              title: 'Actor Type',
              type: 'string',
              options: {
                list: [
                  { title: 'Human Reviewer / Judge', value: 'human' },
                  { title: 'Deterministic Engine', value: 'deterministic' },
                  { title: 'AI / System Pipeline', value: 'system' },
                ],
              },
            }),
            defineField({ name: 'timestamp', title: 'Timestamp', type: 'datetime' }),
            defineField({ name: 'note', title: 'Note / Rationale', type: 'text', rows: 2 }),
          ],
          preview: {
            select: { from: 'from', to: 'to', actor: 'actor', timestamp: 'timestamp' },
            prepare({ from, to, actor, timestamp }) {
              return {
                title: `${from ?? 'init'} → ${to ?? '?'}`,
                subtitle: `${actor ?? 'Unknown'} · ${timestamp ? new Date(timestamp).toLocaleString() : ''}`,
              }
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      caseNumber: 'caseNumber',
      status: 'status',
      category: 'category',
    },
    prepare({ title, caseNumber, status, category }) {
      return {
        title: `${caseNumber ? `${caseNumber} · ` : ''}${title ?? 'Untitled clause'}`,
        subtitle: `${WORKFLOW_STATE_META[status as keyof typeof WORKFLOW_STATE_META]?.label ?? status ?? 'draft'} — ${category ?? 'uncategorized'}`,
      }
    },
  },
})
