import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * An organisation that holds seats on the council and carries its own record of
 * what it has already decided.
 *
 * This is the "org account" in the product sense: not a login and not a second
 * database, but an accountable party whose history is legible. A member
 * belongs to exactly one organisation, and that organisation's prior policy is
 * what the prediction in `src/lib/council/predict.ts` reads.
 */
export const organizationType = defineType({
  name: 'organization',
  title: 'Organisation',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      initialValue: 'internal-department',
      options: {
        list: [
          { title: 'Internal Department', value: 'internal-department' },
          { title: 'External Vendor', value: 'external-vendor' },
          { title: 'Partner', value: 'partner' },
          { title: 'Regulator', value: 'regulator' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'staffedSeats',
      title: 'Staffed Seats',
      type: 'array',
      description: 'Which council seats this organisation fills.',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'riskAppetite',
      title: 'Risk Appetite',
      type: 'string',
      initialValue: 'balanced',
      options: {
        list: [
          { title: 'Conservative', value: 'conservative' },
          { title: 'Balanced', value: 'balanced' },
          { title: 'Aggressive', value: 'aggressive' },
        ],
      },
    }),
    defineField({
      name: 'escalationPolicy',
      title: 'Escalation Policy',
      type: 'text',
      rows: 3,
      description: 'Who inside this organisation can escalate, and to whom.',
    }),
    defineField({
      name: 'contactMember',
      title: 'Primary Contact',
      type: 'reference',
      to: [{ type: 'councilMember' }],
    }),
    defineField({
      name: 'charterReviewedAt',
      title: 'Charter Last Reviewed',
      type: 'date',
      description: 'Drives the knowledge-health panel on the dashboard.',
    }),
  ],
  preview: {
    select: { title: 'name', kind: 'kind', seats: 'staffedSeats' },
    prepare({ title, kind, seats }) {
      const count = Array.isArray(seats) ? seats.length : 0
      return { title: title ?? 'Unnamed organisation', subtitle: `${kind ?? 'org'} - ${count} seat(s)` }
    },
  },
})
