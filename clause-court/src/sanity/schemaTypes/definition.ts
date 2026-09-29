import { defineField, defineType } from 'sanity'

/**
 * A structured definition for a domain term used inside clauses.
 * Definitions are what allow Rule B (Missing Definition) to be satisfied —
 * a term with a definition document is no longer flagged.
 */
export const definitionType = defineType({
  name: 'definition',
  title: 'Definition',
  type: 'document',
  icon: () => '📖',
  fields: [
    defineField({
      name: 'term',
      title: 'Term',
      type: 'string',
      description:
        'The exact word or phrase this defines. Must match the clause text exactly — the ambiguity engine compares case-insensitively on whole words.',
      validation: (Rule) => Rule.required().min(2),
    }),
    defineField({
      name: 'definition',
      title: 'Definition',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Tier', value: 'tier' },
          { title: 'Time', value: 'time' },
          { title: 'Metric', value: 'metric' },
          { title: 'Entitlement', value: 'entitlement' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { title: 'term', subtitle: 'definition' },
  },
})
