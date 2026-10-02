import { defineField, defineType, defineArrayMember } from 'sanity'

export const remediationSchema = defineType({
  name: 'remediation',
  title: 'Remediation Release',
  type: 'document',
  fields: [
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Pending Review', value: 'pending_review' },
          { title: 'Approved', value: 'approved' },
          { title: 'Published', value: 'published' },
        ],
      },
      initialValue: 'draft',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'fixes',
      title: 'Proposed Fixes',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'proposedFix',
          fields: [
            defineField({
              name: 'finding',
              title: 'Finding',
              type: 'reference',
              to: [{ type: 'finding' }],
            }),
            defineField({
              name: 'page',
              title: 'Page',
              type: 'reference',
              to: [{ type: 'page' }],
            }),
            defineField({
              name: 'blockKey',
              type: 'string',
            }),
            defineField({
              name: 'childKey',
              type: 'string',
            }),
            defineField({
              name: 'beforeText',
              title: 'Before Text',
              type: 'text',
              rows: 2,
            }),
            defineField({
              name: 'afterText',
              title: 'After Text',
              type: 'text',
              rows: 2,
            }),
            defineField({
              name: 'mutation',
              title: 'Sanity API Mutation (JSON)',
              type: 'text',
            }),
            defineField({
              name: 'approved',
              title: 'Approved',
              type: 'boolean',
              initialValue: true,
            }),
          ],
          preview: {
            select: {
              title: 'page.title',
              approved: 'approved'
            },
            prepare({ title, approved }) {
              return { title: `${approved ? '✅' : '❌'} Fix for ${title}` }
            }
          }
        }),
      ],
    }),
    defineField({
      name: 'approvers',
      title: 'Approvers',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'IDs or names of humans who approved this release',
    }),
  ],
})
