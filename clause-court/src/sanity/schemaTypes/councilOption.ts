import { defineField, defineType } from 'sanity'
import { actorAuthField } from './fields/actorAuth'

/**
 * One votable proposal. Source is always labelled: a member's wording or an
 * AI draft the council may adopt. The AI never appears as a member and an
 * AI-drafted option is marked wherever it is shown.
 */
export const councilOptionType = defineType({
  name: 'councilOption',
  title: 'Council Option',
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
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'wording',
      title: 'Wording',
      type: 'text',
      rows: 3,
      description: 'The exact holding the council would adopt.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'value',
      title: 'Value',
      type: 'number',
      description: 'Numeric holding for deterministic comparison.',
    }),
    defineField({
      name: 'unit',
      title: 'Unit',
      type: 'string',
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      initialValue: 'member',
      options: {
        list: [
          { title: 'Member-drafted', value: 'member' },
          { title: 'AI-drafted (advisory)', value: 'ai' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'draftedBy',
      title: 'Drafted By',
      type: 'reference',
      to: [{ type: 'councilMember' }],
      description: 'Set when a member drafted it. Empty for AI drafts.',
    }),
    defineField({
      name: 'modelInfo',
      title: 'Model Info',
      type: 'string',
      description: 'Model + prompt version for AI drafts, e.g. "gemini-2.5-flash / opts-v1".',
    }),
    actorAuthField(),
  ],
  preview: {
    select: { title: 'title', source: 'source' },
    prepare({ title, source }) {
      return {
        title: title ?? 'Untitled option',
        subtitle: source === 'ai' ? 'AI-drafted (advisory)' : 'member-drafted',
      }
    },
  },
})
