import { defineField, defineType } from 'sanity'

/**
 * scanRun — audit record of one scan execution.
 * Stores a metrics snapshot so the dashboard doesn't recompute history.
 */
export const scanRunSchema = defineType({
  name: 'scanRun',
  title: 'Scan Run',
  type: 'document',
  fields: [
    defineField({
      name: 'startedAt',
      title: 'Started At',
      type: 'datetime',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'finishedAt',
      title: 'Finished At',
      type: 'datetime',
    }),
    defineField({
      name: 'trigger',
      title: 'Trigger',
      type: 'string',
      options: {
        list: [
          { title: 'Manual', value: 'manual' },
          { title: 'Fact Change', value: 'fact-change' },
          { title: 'Post-Publish', value: 'post-publish' },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'changedFact',
      title: 'Changed Fact',
      type: 'reference',
      to: [{ type: 'fact' }],
      description: 'Populated when trigger is fact-change or post-publish',
    }),
    defineField({
      name: 'releaseId',
      title: 'Release ID',
      type: 'string',
      description: 'Sanity Content Release ID, if triggered by a publish',
    }),
    defineField({
      name: 'factsScanned',
      title: 'Facts Scanned',
      type: 'number',
    }),
    defineField({
      name: 'pagesScanned',
      title: 'Pages Scanned',
      type: 'number',
    }),
    defineField({
      name: 'metrics',
      title: 'Metrics',
      type: 'object',
      fields: [
        defineField({ name: 'open', title: 'Open Findings', type: 'number' }),
        defineField({
          name: 'byFact',
          title: 'By Fact',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'fact', type: 'string', title: 'Fact ID' },
                { name: 'open', type: 'number', title: 'Open' },
              ],
            },
          ],
        }),
        defineField({
          name: 'byRule',
          title: 'By Rule',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'rule', type: 'string', title: 'Rule' },
                { name: 'open', type: 'number', title: 'Open' },
              ],
            },
          ],
        }),
        defineField({
          name: 'byPage',
          title: 'By Page',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'page', type: 'string', title: 'Page ID' },
                { name: 'open', type: 'number', title: 'Open' },
                { name: 'linkedMentions', type: 'number', title: 'Linked Mentions' },
                { name: 'plainMentions', type: 'number', title: 'Plain Text Mentions' },
              ],
            },
          ],
        }),
        defineField({
          name: 'coveragePct',
          title: 'Coverage %',
          type: 'number',
          description: 'linkedMentions / (linkedMentions + plainMentions)',
        }),
      ],
    }),
  ],
  preview: {
    select: {
      trigger: 'trigger',
      startedAt: 'startedAt',
      open: 'metrics.open',
    },
    prepare({ trigger, startedAt, open }) {
      const ts = startedAt ? new Date(startedAt).toLocaleString() : '?'
      return {
        title: `${trigger ?? 'scan'} — ${ts}`,
        subtitle: `${open ?? '?'} open findings`,
      }
    },
  },
})
