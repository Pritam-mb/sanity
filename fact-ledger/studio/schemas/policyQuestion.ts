import { defineField, defineType } from 'sanity'

/**
 * policyQuestion: an employee asks about a policy; officials answer.
 * Other employees can mark answers helpful.
 */
export const policyQuestionSchema = defineType({
  name: 'policyQuestion',
  title: 'Policy Question',
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'text',
      rows: 3,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'askedBy',
      title: 'Asked By',
      type: 'string',
      description: 'Employee name',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'linkedFact',
      title: 'About Fact',
      type: 'reference',
      to: [{ type: 'fact' }],
    }),
    defineField({
      name: 'linkedPage',
      title: 'About Page',
      type: 'reference',
      to: [{ type: 'page' }],
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Open', value: 'open' },
          { title: 'Answered', value: 'answered' },
        ],
        layout: 'radio',
      },
      initialValue: 'open',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'answer',
      title: 'Official Answer',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'answeredBy',
      title: 'Answered By',
      type: 'string',
    }),
    defineField({
      name: 'helpful',
      title: 'Helpful Votes',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'askedAt',
      title: 'Asked At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'answeredAt',
      title: 'Answered At',
      type: 'datetime',
    }),
  ],
  preview: {
    select: {
      title: 'question',
      subtitle: 'status',
      askedBy: 'askedBy',
    },
    prepare({ title, subtitle, askedBy }) {
      const short = typeof title === 'string' && title.length > 60 ? `${title.slice(0, 60)}…` : title
      return {
        title: short,
        subtitle: `${subtitle ?? 'open'} · by ${askedBy ?? 'unknown'}`,
      }
    },
  },
})
