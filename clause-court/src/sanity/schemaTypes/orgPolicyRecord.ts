import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * What an organisation has already decided, per category and unit.
 *
 * A materialised snapshot, never hand-written. `buildOrgProfile()` in
 * `src/lib/council/orgRecord.ts` recomputes it from the primary `position`,
 * `vote` and `ruling` documents, and a test asserts snapshot equals
 * recomputation - so this document can never quietly become a second source of
 * truth. It exists to make the council page cheap, not to be authoritative.
 */
export const orgPolicyRecordType = defineType({
  name: 'orgPolicyRecord',
  title: 'Organisation Policy Record',
  type: 'document',
  fields: [
    defineField({
      name: 'org',
      title: 'Organisation',
      type: 'reference',
      to: [{ type: 'organization' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Clause Category',
      type: 'string',
      description: 'The slice this record describes.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'unit',
      title: 'Unit',
      type: 'string',
      description: 'Unit of measure this record describes, e.g. business_hours.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'casesCount',
      title: 'Cases Count',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'positionsCount',
      title: 'Positions Recorded',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'votesCount',
      title: 'Votes Cast',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'proposedValues',
      title: 'Proposed Values',
      type: 'array',
      readOnly: true,
      description: 'Every value this organisation has ever proposed, in this slice.',
      of: [defineArrayMember({ type: 'number' })],
    }),
    defineField({
      name: 'median',
      title: 'Median Holding',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'spread',
      title: 'Spread',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'stanceMix',
      title: 'Stance Mix',
      type: 'object',
      readOnly: true,
      fields: [
        defineField({ name: 'supportA', title: 'Supports Advocate A', type: 'number' }),
        defineField({ name: 'supportB', title: 'Supports Advocate B', type: 'number' }),
        defineField({ name: 'custom', title: 'Custom Reading', type: 'number' }),
      ],
    }),
    defineField({
      name: 'carriedRate',
      title: 'Carried Rate',
      type: 'number',
      readOnly: true,
      description: 'Share of sessions where this organisation\'s favoured value was the one that carried.',
    }),
    defineField({
      name: 'avgConfidence',
      title: 'Average Confidence',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'revisionRate',
      title: 'Revision Rate After Reveal',
      type: 'number',
      readOnly: true,
      description: 'How often this organisation revises once blind positions are visible. Anchoring check.',
    }),
    defineField({
      name: 'legalFloorOverrideRate',
      title: 'Legal Floor Override Rate',
      type: 'number',
      readOnly: true,
      description: 'How often it proposes below an applicable legal floor.',
    }),
    defineField({
      name: 'lastDecidedAt',
      title: 'Last Decided At',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'recentHoldings',
      title: 'Recent Holdings',
      type: 'array',
      readOnly: true,
      description: 'Human-readable history lines, e.g. "Held 24h on SLA credits".',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'computedAt',
      title: 'Computed At',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: { org: 'org->name', category: 'category', unit: 'unit', cases: 'casesCount' },
    prepare({ org, category, unit, cases }) {
      return {
        title: `${org ?? 'Organisation'} - ${category ?? 'all'} (${unit ?? 'n/a'})`,
        subtitle: `${cases ?? 0} case(s) on record`,
      }
    },
  },
})
