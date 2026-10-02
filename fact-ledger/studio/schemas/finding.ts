import { defineField, defineType } from 'sanity'

/**
 * finding: a persisted scan result.
 * One finding per (page * fact * rule * blockKey * offset).
 * Status 'open' means unresolved; 'fixed' or 'dismissed' means resolved.
 */
export const findingSchema = defineType({
  name: 'finding',
  title: 'Finding',
  type: 'document',
  fields: [
    defineField({
      name: 'page',
      title: 'Page',
      type: 'reference',
      to: [{ type: 'page' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'fact',
      title: 'Fact',
      type: 'reference',
      to: [{ type: 'fact' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'rule',
      title: 'Rule',
      type: 'string',
      options: {
        list: [
          { title: 'R1: Unlinked match', value: 'R1' },
          { title: 'R2: Contradiction', value: 'R2' },
          { title: 'R3: Deprecated reference', value: 'R3' },
          { title: 'R4: Orphan fact', value: 'R4' },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'blockKey',
      title: 'Block Key',
      type: 'string',
      description: 'Portable Text block _key where the match was found',
    }),
    defineField({
      name: 'childKey',
      title: 'Child Key',
      type: 'string',
      description: 'Portable Text span/child _key where the match was found',
    }),
    defineField({
      name: 'startOffset',
      title: 'Start Offset',
      type: 'number',
      description: 'Character offset within the block text',
    }),
    defineField({
      name: 'endOffset',
      title: 'End Offset',
      type: 'number',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'string',
      description: 'The matched text fragment, for display',
    }),
    defineField({
      name: 'foundValue',
      title: 'Found Value',
      type: 'string',
      description: 'What was found in the prose',
    }),
    defineField({
      name: 'expectedValue',
      title: 'Expected Value',
      type: 'string',
      description: 'The canonical value from the fact document',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Open', value: 'open' },
          { title: 'Fixed', value: 'fixed' },
          { title: 'Dismissed', value: 'dismissed' },
        ],
        layout: 'radio',
      },
      initialValue: 'open',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'detectedAt',
      title: 'Detected At',
      type: 'datetime',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'resolvedAt',
      title: 'Resolved At',
      type: 'datetime',
    }),
    defineField({
      name: 'scanRunId',
      title: 'Scan Run ID',
      type: 'string',
      description: 'The _id of the scanRun that created this finding',
    }),
    defineField({
      name: 'dismissReason',
      title: 'Dismiss Reason',
      type: 'text',
      rows: 2,
    }),
  ],
  preview: {
    select: {
      pageTitle: 'page.title',
      factLabel: 'fact.label',
      rule: 'rule',
      status: 'status',
    },
    prepare({ pageTitle, factLabel, rule, status }) {
      return {
        title: `${rule}: ${factLabel ?? '?'}`,
        subtitle: `${pageTitle ?? '?'} · ${status}`,
      }
    },
  },
})
