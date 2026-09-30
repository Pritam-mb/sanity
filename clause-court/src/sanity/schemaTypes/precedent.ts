import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * The durable output of the whole product: a human ruling promoted to
 * reusable institutional reasoning.
 *
 * `citesPrecedent` is the field that makes this a graph rather than a list —
 * it lets a precedent inherit from an earlier one, so a later debate can be
 * argued against accumulated interpretation rather than starting from nothing.
 */
export const precedentType = defineType({
  name: 'precedent',
  title: 'Precedent',
  type: 'document',
  icon: () => '📚',
  groups: [
    { name: 'holding', title: 'Holding', default: true },
    { name: 'scope', title: 'Scope' },
    { name: 'graph', title: 'Reference Graph' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Case Title',
      type: 'string',
      group: 'holding',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'holding',
      title: 'Holding',
      type: 'text',
      rows: 3,
      group: 'holding',
      description: 'What was decided, stated so a future clause can be checked against it.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'reasoning',
      title: 'Reasoning',
      type: 'text',
      rows: 5,
      group: 'holding',
    }),
    defineField({
      name: 'ruling',
      title: 'Source Ruling',
      type: 'reference',
      group: 'graph',
      to: [{ type: 'ruling' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'sourceClause',
      title: 'Source Clause',
      type: 'reference',
      group: 'graph',
      to: [{ type: 'clause' }],
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'applicableTerms',
      title: 'Applicable Terms',
      type: 'array',
      group: 'scope',
      of: [defineArrayMember({ type: 'string' })],
      description:
        'The ambiguous terms this ruling settles. Precedent relevance is computed by matching a new clause against this list — it is the retrieval key.',
    }),
    defineField({
      name: 'relevanceScore',
      title: 'Peak Relevance Score',
      type: 'number',
      group: 'scope',
      readOnly: true,
      validation: (Rule) => Rule.min(0).max(100),
      description:
        'Highest relevance this precedent scored against any clause that cited it. Cached for display; live relevance is always recomputed per clause.',
    }),
    defineField({
      name: 'citationCount',
      title: 'Citation Count',
      type: 'number',
      group: 'scope',
      readOnly: true,
      initialValue: 0,
      description: 'How many clauses have cited this precedent.',
    }),

    defineField({
      name: 'citesPrecedent',
      title: 'Cites Precedent',
      type: 'array',
      group: 'graph',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'precedent' }] })],
      description: 'Earlier rulings this one was argued against. Forms the precedent lineage.',
    }),

    // ─── Council provenance + lifecycle (v2) ───────────
    defineField({
      name: 'council',
      title: 'Deciding Council',
      type: 'reference',
      group: 'graph',
      to: [{ type: 'council' }],
      description: 'Set for council precedents. Empty for single-judge precedents.',
    }),
    defineField({
      name: 'voteSummary',
      title: 'Vote Summary',
      type: 'string',
      group: 'graph',
      readOnly: true,
      description: 'e.g. "decided by council, 4 to 1".',
    }),
    defineField({
      name: 'status',
      title: 'Lifecycle Status',
      type: 'string',
      group: 'scope',
      initialValue: 'active',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Superseded', value: 'superseded' },
          { title: 'Overruled', value: 'overruled' },
        ],
      },
    }),
  ],
  preview: {
    select: {
      title: 'title',
      holding: 'holding',
      citationCount: 'citationCount',
      clause: 'sourceClause.caseNumber',
    },
    prepare({ title, holding, citationCount }) {
      return {
        title: `${title ?? 'Untitled precedent'}`,
        subtitle: `${holding ?? ''}${
          citationCount ? ` · cited by ${citationCount}` : ' · not yet cited'
        }`,
      }
    },
  },
})
