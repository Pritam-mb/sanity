import { defineField, defineType } from 'sanity'

/**
 * changeEvent: immutable audit log entry.
 * Written by every action in the system: scan, fact edit, approve, dismiss, publish.
 */
export const changeEventSchema = defineType({
  name: 'changeEvent',
  title: 'Change Event',
  type: 'document',
  fields: [
    defineField({
      name: 'actor',
      title: 'Actor',
      type: 'string',
      description: 'Who or what performed this action (user email, or "system")',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'action',
      title: 'Action',
      type: 'string',
      options: {
        list: [
          { title: 'Fact Edited', value: 'fact_edited' },
          { title: 'Scan Run', value: 'scan_run' },
          { title: 'Fix Drafted', value: 'fix_drafted' },
          { title: 'Finding Approved', value: 'finding_approved' },
          { title: 'Finding Dismissed', value: 'finding_dismissed' },
          { title: 'Release Published', value: 'release_published' },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'target',
      title: 'Target',
      type: 'reference',
      to: [
        { type: 'fact' },
        { type: 'page' },
        { type: 'finding' },
        { type: 'scanRun' },
      ],
      description: 'The document this event is about',
    }),
    defineField({
      name: 'before',
      title: 'Before',
      type: 'text',
      description: 'JSON snapshot of the value before the change',
    }),
    defineField({
      name: 'after',
      title: 'After',
      type: 'text',
      description: 'JSON snapshot of the value after the change',
    }),
    defineField({
      name: 'at',
      title: 'At',
      type: 'datetime',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'releaseId',
      title: 'Release ID',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      action: 'action',
      actor: 'actor',
      at: 'at',
    },
    prepare({ action, actor, at }) {
      const ts = at ? new Date(at).toLocaleString() : '?'
      return {
        title: `${action ?? '?'} by ${actor ?? '?'}`,
        subtitle: ts,
      }
    },
  },
})
