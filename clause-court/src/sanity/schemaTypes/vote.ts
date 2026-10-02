import { defineField, defineType } from 'sanity'
import { actorAuthField } from './fields/actorAuth'

/**
 * One member's vote for one option in one session.
 * One vote per member per session is enforced in code
 * (`assertVote` in the tally lib), not in the schema.
 */
export const voteType = defineType({
  name: 'vote',
  title: 'Vote',
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
      name: 'member',
      title: 'Member',
      type: 'reference',
      to: [{ type: 'councilMember' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'option',
      title: 'Option',
      type: 'reference',
      to: [{ type: 'councilOption' }],
      validation: (Rule) => Rule.required(),
    }),
    actorAuthField(),
  ],
  preview: {
    select: { title: 'member.name' },
    prepare({ title }) {
      return { title: `Vote — ${title ?? 'unknown member'}` }
    },
  },
})
