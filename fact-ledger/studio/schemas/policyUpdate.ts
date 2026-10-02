import { defineField, defineType } from 'sanity'

/**
 * policyUpdate: official news / policy announcements.
 * Employees upvote (endorse) or downvote (concern) each update.
 */
export const policyUpdateSchema = defineType({
  name: 'policyUpdate',
  title: 'Policy Update',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: {
        list: [
          { title: 'Policy Change', value: 'policy-change' },
          { title: 'News', value: 'news' },
          { title: 'Notice', value: 'notice' },
        ],
        layout: 'radio',
      },
      initialValue: 'news',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author (official)',
      type: 'string',
      initialValue: 'Policy Office',
    }),
    defineField({
      name: 'linkedFact',
      title: 'Linked Fact',
      type: 'reference',
      to: [{ type: 'fact' }],
      description: 'Canonical fact this update relates to',
    }),
    defineField({
      name: 'linkedPage',
      title: 'Linked Page',
      type: 'reference',
      to: [{ type: 'page' }],
      description: 'Content page this update relates to',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Published', value: 'published' },
          { title: 'Draft', value: 'draft' },
        ],
        layout: 'radio',
      },
      initialValue: 'published',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'upvotes',
      title: 'Upvotes',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'downvotes',
      title: 'Downvotes',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'kind',
      up: 'upvotes',
      down: 'downvotes',
    },
    prepare({ title, subtitle, up, down }) {
      return {
        title,
        subtitle: `${subtitle ?? 'news'} · +${up ?? 0} / -${down ?? 0}`,
      }
    },
  },
})
