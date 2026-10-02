import { defineField, defineType } from 'sanity'

/**
 * complaint: an employee raises an issue against a specific policy
 * (fact or page). Officials triage, respond, and resolve.
 */
export const complaintSchema = defineType({
  name: 'complaint',
  title: 'Complaint',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Contradiction', value: 'contradiction' },
          { title: 'Unclear Wording', value: 'unclear' },
          { title: 'Outdated Value', value: 'outdated' },
          { title: 'Unfair Policy', value: 'unfair' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
      initialValue: 'unclear',
    }),
    defineField({
      name: 'targetFact',
      title: 'Against Fact',
      type: 'reference',
      to: [{ type: 'fact' }],
      description: 'Canonical policy fact this complaint is about',
    }),
    defineField({
      name: 'targetPage',
      title: 'Against Page',
      type: 'reference',
      to: [{ type: 'page' }],
      description: 'Content page this complaint is about',
    }),
    defineField({
      name: 'raisedBy',
      title: 'Raised By',
      type: 'string',
      description: 'Employee name',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Open', value: 'open' },
          { title: 'In Review', value: 'in-review' },
          { title: 'Resolved', value: 'resolved' },
          { title: 'Dismissed', value: 'dismissed' },
        ],
        layout: 'radio',
      },
      initialValue: 'open',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'response',
      title: 'Official Response',
      type: 'text',
      rows: 3,
      description: 'Reply from the policy office',
    }),
    defineField({
      name: 'raisedAt',
      title: 'Raised At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'resolvedAt',
      title: 'Resolved At',
      type: 'datetime',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'status',
      raisedBy: 'raisedBy',
    },
    prepare({ title, subtitle, raisedBy }) {
      return {
        title,
        subtitle: `${subtitle ?? 'open'} · by ${raisedBy ?? 'unknown'}`,
      }
    },
  },
})
