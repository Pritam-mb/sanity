import { defineField, defineType } from 'sanity'

/**
 * One signature under the two-person rule: two different approvers,
 * neither the author nor the chair, must sign before release.
 * Enforced in code (`validateApprovals` in the tally lib).
 */
export const approvalType = defineType({
  name: 'approval',
  title: 'Approval',
  type: 'document',
  icon: () => '✍',
  fields: [
    defineField({
      name: 'session',
      title: 'Session',
      type: 'reference',
      to: [{ type: 'session' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'approver',
      title: 'Approver',
      type: 'reference',
      to: [{ type: 'councilMember' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'note',
      title: 'Approval Note',
      type: 'text',
      rows: 2,
    }),
  ],
  preview: {
    select: { title: 'approver.name' },
    prepare({ title }) {
      return { title: `Approval — ${title ?? 'unknown approver'}` }
    },
  },
})
