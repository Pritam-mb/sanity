import { defineField, defineType } from 'sanity'

/**
 * A single hearing: one advocate per side, argued against each other.
 * A debate with no ruling attached leaves the clause at `debated` (§30).
 */
export const debateType = defineType({
  name: 'debate',
  title: 'Debate',
  type: 'document',
  fields: [
    defineField({
      name: 'clause',
      title: 'Clause',
      type: 'reference',
      to: [{ type: 'clause' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'interpretationA',
      title: 'Advocate A (Customer-Friendly)',
      type: 'reference',
      to: [{ type: 'interpretation' }],
    }),
    defineField({
      name: 'interpretationB',
      title: 'Advocate B (Operations-Focused)',
      type: 'reference',
      to: [{ type: 'interpretation' }],
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'pending',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Active', value: 'active' },
          { title: 'Completed', value: 'completed' },
        ],
        layout: 'radio',
      },
    }),
    defineField({ name: 'startedAt', title: 'Started At', type: 'datetime' }),
    defineField({ name: 'completedAt', title: 'Completed At', type: 'datetime' }),
  ],
  preview: {
    select: {
      clause: 'clause.title',
      caseNumber: 'clause.caseNumber',
      status: 'status',
      a: 'interpretationA.title',
      b: 'interpretationB.title',
    },
    prepare({ clause, caseNumber, status, a, b }) {
      return {
        title: `${caseNumber ? `${caseNumber} · ` : ''}${clause ?? 'Orphaned debate'}`,
        subtitle: `${status ?? 'pending'} — A: ${a ?? '—'} / B: ${b ?? '—'}`,
      }
    },
  },
})
