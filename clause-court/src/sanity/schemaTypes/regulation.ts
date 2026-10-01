import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * A regulation or industry benchmark the council argues against.
 * Numeric floors (`floorValue` + `floorUnit`) are enforced by
 * `checkLegalFloor` — a proposal below a floor needs a recorded override.
 * Seeded entries are illustrative demo data: verify thresholds against
 * official sources before relying on them.
 */
export const regulationType = defineType({
  name: 'regulation',
  title: 'Regulation / Benchmark',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'reference',
      title: 'Reference',
      type: 'string',
      description: 'e.g. "GDPR Art. 33".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      initialValue: 'regulation',
      options: {
        list: [
          { title: 'Regulation', value: 'regulation' },
          { title: 'Industry Benchmark', value: 'benchmark' },
        ],
      },
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'floorValue',
      title: 'Numeric Floor (optional)',
      type: 'number',
      description: 'Minimum defensible value, if the rule states one.',
    }),
    defineField({
      name: 'floorUnit',
      title: 'Floor Unit',
      type: 'string',
      description: 'e.g. business_hours, calendar_days.',
    }),
    defineField({
      name: 'appliesTo',
      title: 'Applies To (categories)',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'illustrative',
      title: 'Illustrative Demo Data',
      type: 'boolean',
      initialValue: true,
      description: 'Uncheck once the threshold has been verified against the official source.',
    }),
  ],
  preview: {
    select: { title: 'title', reference: 'reference', kind: 'kind' },
    prepare({ title, reference, kind }) {
      return {
        title: title ?? 'Untitled regulation',
        subtitle: `${reference ?? ''} · ${kind ?? 'regulation'}`,
      }
    },
  },
})
