import { defineField, defineType } from 'sanity'

/**
 * One deliberation over one clause: round state and deadlines.
 * Positions, comments, options, votes and approvals all point here,
 * so the whole deliberation is queryable as a unit.
 */
export const sessionType = defineType({
  name: 'session',
  title: 'Session',
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
      name: 'council',
      title: 'Council',
      type: 'reference',
      to: [{ type: 'council' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Session Status',
      type: 'string',
      initialValue: 'briefing',
      options: {
        list: [
          { title: 'Briefing (AI advocates open)', value: 'briefing' },
          { title: 'Deliberating (council positions)', value: 'deliberation' },
          { title: 'Synthesis (options drafted)', value: 'synthesis' },
          { title: 'Voting', value: 'voting' },
          { title: 'Ruled', value: 'ruled' },
          { title: 'Approved', value: 'approved' },
          { title: 'Released', value: 'released' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'round',
      title: 'Deliberation Round',
      type: 'string',
      description:
        'Blind positions stay hidden until the chair reveals them; open positions are visible.',
      options: {
        list: [
          { title: 'Blind (private)', value: 'blind' },
          { title: 'Open (visible)', value: 'open' },
        ],
      },
    }),
    defineField({
      name: 'deadline',
      title: 'Round Deadline',
      type: 'datetime',
      description: 'When the current round closes.',
    }),
  ],
  preview: {
    select: { status: 'status', round: 'round' },
    prepare({ status, round }) {
      return {
        title: `Session — ${status ?? 'briefing'}`,
        subtitle: round ? `round: ${round}` : 'no round yet',
      }
    },
  },
})
