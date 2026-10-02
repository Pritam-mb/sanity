import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * A filing: everything that came in through the front door, whether it is a new
 * policy, a vendor's terms, a regulatory change or an amendment to something
 * already published.
 *
 * Written by the deterministic intake check, never by a person or a model. A
 * `complete: false` filing on a mandatory intake is what blocks the council
 * gate in `src/lib/council/intake.ts`.
 */
export const intakeType = defineType({
  name: 'intake',
  title: 'Intake',
  type: 'document',
  groups: [
    { name: 'content', title: 'Filing', default: true },
    { name: 'check', title: 'Completeness Check' },
  ],
  fields: [
    defineField({
      name: 'clause',
      title: 'Clause',
      type: 'reference',
      to: [{ type: 'clause' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      group: 'content',
      options: {
        list: [
          { title: 'New policy', value: 'new-policy' },
          { title: 'Amendment', value: 'amendment' },
          { title: 'Vendor terms', value: 'vendor-terms' },
          { title: 'Org request', value: 'org-request' },
          { title: 'Regulatory change', value: 'regulatory-change' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'requestedBy',
      title: 'Requested By',
      type: 'string',
      group: 'content',
      description: 'The person filing this. Mandatory - a case has an author.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'requestingOrg',
      title: 'Requesting Organisation',
      type: 'reference',
      group: 'content',
      to: [{ type: 'organization' }],
      description: 'Required for vendor terms and org requests.',
    }),
    defineField({
      name: 'effectiveDate',
      title: 'Effective Date',
      type: 'date',
      group: 'content',
      description: 'Required for new policy, amendment and regulatory change.',
    }),
    defineField({
      name: 'supersedes',
      title: 'Supersedes Clause',
      type: 'reference',
      group: 'content',
      to: [{ type: 'clause' }],
      description: 'Required for an amendment - what this replaces.',
    }),
    defineField({
      name: 'unitOfMeasure',
      title: 'Unit of Measure',
      type: 'string',
      group: 'content',
      description: 'e.g. business_hours. Required whenever a proposed value is supplied.',
    }),
    defineField({
      name: 'mandatory',
      title: 'Must Pass Council',
      type: 'boolean',
      group: 'content',
      initialValue: true,
      description:
        'A mandatory filing cannot leave `flagged` without a session. Turn this off only to replay the pre-council demo.',
    }),
    defineField({
      name: 'complete',
      title: 'Intake Complete',
      type: 'boolean',
      group: 'check',
      readOnly: true,
      description: 'Written only by checkIntakeCompleteness(). Never hand-edited.',
    }),
    defineField({
      name: 'missingFields',
      title: 'Missing Fields',
      type: 'array',
      group: 'check',
      readOnly: true,
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'missingProblems',
      title: 'Missing Field Detail',
      type: 'array',
      group: 'check',
      readOnly: true,
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'receivedAt',
      title: 'Received At',
      type: 'datetime',
      group: 'check',
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: 'clause.title', source: 'source', complete: 'complete' },
    prepare({ title, source, complete }) {
      return {
        title: title ?? 'Unfiled clause',
        subtitle: `${source ?? 'unknown source'}${complete === false ? ' - incomplete' : ''}`,
      }
    },
  },
})
