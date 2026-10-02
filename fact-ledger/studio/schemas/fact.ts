import { defineField, defineType } from 'sanity'

/**
 * fact: the canonical source of truth for a single policy value.
 * Every page should reference facts via factRef instead of copying literal values.
 */
export const factSchema = defineType({
  name: 'fact',
  title: 'Fact',
  type: 'document',
  fields: [
    defineField({
      name: 'key',
      title: 'Key',
      type: 'slug',
      description: 'Machine-readable identifier, e.g. refund_window_days',
      validation: (r) => r.required(),
      options: { source: 'label', maxLength: 96 },
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Human-readable name, e.g. "Refund Window"',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'value',
      title: 'Value',
      type: 'string',
      description: 'The canonical value, e.g. "30"',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'unit',
      title: 'Unit',
      type: 'string',
      description: 'e.g. "days", "hours", "%", "USD"',
    }),
    defineField({
      name: 'aliases',
      title: 'Aliases',
      type: 'array',
      of: [{ type: 'string' }],
      description:
        'Surface forms to scan for: "30 days", "thirty (30) days", "one month". The scanner matches any of these.',
    }),
    defineField({
      name: 'owner',
      title: 'Owner',
      type: 'reference',
      to: [{ type: 'person' }],
      description: 'Person responsible for this fact',
    }),
    defineField({
      name: 'dependsOn',
      title: 'Depends On',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'fact' }] }],
      description: 'Other facts this fact is logically derived from or dependent upon',
    }),
    defineField({
      name: 'effectiveFrom',
      title: 'Effective From',
      type: 'date',
    }),
    defineField({
      name: 'effectiveUntil',
      title: 'Effective Until',
      type: 'date',
      description: 'The fact expires after this date',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Deprecated', value: 'deprecated' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'highStakes',
      title: 'High Stakes',
      type: 'boolean',
      description: 'If true, requires two human approvers in the remediation workflow',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'value',
      status: 'status',
    },
    prepare({ title, subtitle, status }) {
      return {
        title,
        subtitle: `${subtitle ?? 'None'} · ${status ?? 'active'}`,
      }
    },
  },
})
