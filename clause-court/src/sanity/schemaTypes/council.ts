import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * The policy council: its seats and the rules that decide a vote.
 * Quorum, threshold and required seats are data, so the tally logic
 * (`src/lib/council/tally.ts`) enforces whatever the council configured.
 */
export const councilType = defineType({
  name: 'council',
  title: 'Council',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Council Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'seats',
      title: 'Seats',
      type: 'array',
      description: 'One seat per interest, e.g. Legal, Security, Operations.',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'quorumPct',
      title: 'Quorum (%)',
      type: 'number',
      description: 'Share of seats that must vote for the result to count.',
      initialValue: 60,
      validation: (Rule) => Rule.required().min(1).max(100),
    }),
    defineField({
      name: 'thresholdPct',
      title: 'Majority Threshold (%)',
      type: 'number',
      description: 'Share of cast votes the winner needs.',
      initialValue: 50,
      validation: (Rule) => Rule.required().min(1).max(100),
    }),
    defineField({
      name: 'requiredSeats',
      title: 'Required Seats',
      type: 'array',
      description:
        'Seats that must have voted — a convenient majority cannot bypass the experts.',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'chair',
      title: 'Chair',
      type: 'reference',
      to: [{ type: 'councilMember' }],
      description: 'Procedural role only. The chair cannot override the vote.',
    }),
  ],
  preview: {
    select: { title: 'name', seats: 'seats' },
    prepare({ title, seats }) {
      const count = Array.isArray(seats) ? seats.length : 0
      return { title: title ?? 'Untitled council', subtitle: `${count} seats` }
    },
  },
})
