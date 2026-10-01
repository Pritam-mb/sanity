import { defineField, defineType } from 'sanity'

/**
 * A threaded reply inside a session — support, challenge or question —
 * optionally aimed at one position. Replies are what the argument graph
 * (Tier 2) will draw edges from.
 */
export const commentType = defineType({
  name: 'comment',
  title: 'Comment',
  type: 'document',
  fields: [
    defineField({
      name: 'session',
      title: 'Session',
      type: 'reference',
      to: [{ type: 'session' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'councilMember' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'targetPosition',
      title: 'In Reply To',
      type: 'reference',
      to: [{ type: 'position' }],
      description: 'The position this reply supports or challenges.',
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      initialValue: 'question',
      options: {
        list: [
          { title: 'Support', value: 'support' },
          { title: 'Challenge', value: 'challenge' },
          { title: 'Question', value: 'question' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { kind: 'kind', body: 'body' },
    prepare({ kind, body }) {
      const text = typeof body === 'string' ? body : ''
      return {
        title: kind ?? 'comment',
        subtitle: text.length > 60 ? `${text.slice(0, 60)}…` : text,
      }
    },
  },
})
