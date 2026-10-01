import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * A house rule the organisation enforces on its own policy language.
 *
 * Each standard bans a list of phrases (e.g. "best efforts",
 * "as soon as possible"). The deterministic engine checks every clause
 * against every standard as Rule E — adding a company rule is a CMS edit
 * in Studio, never a code or model change.
 */
export const companyStandardType = defineType({
  name: 'companyStandard',
  title: 'Company Standard',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Standard Title',
      type: 'string',
      description: 'Named in the flag, e.g. "House Plain-Language Standard".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Why this standard exists and what authors should write instead.',
    }),
    defineField({
      name: 'bannedPhrases',
      title: 'Banned Phrases',
      type: 'array',
      description:
        'Phrases no clause may contain. Matching is literal and case-insensitive.',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { title: 'title', phrases: 'bannedPhrases' },
    prepare({ title, phrases }) {
      const count = Array.isArray(phrases) ? phrases.length : 0
      return {
        title: title ?? 'Untitled standard',
        subtitle: `${count} banned phrase${count === 1 ? '' : 's'}`,
      }
    },
  },
})
