import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * A structured council opinion. Prose on top, numbers underneath —
 * the numbers are what make the summary and the spectrum graph
 * deterministic. Positions are append-only: a revision points at the
 * position it supersedes via `revisionOf`, so nobody can quietly rewrite
 * what they said before the vote.
 */
export const positionType = defineType({
  name: 'position',
  title: 'Position',
  type: 'document',
  icon: () => '📍',
  fields: [
    defineField({
      name: 'member',
      title: 'Member',
      type: 'reference',
      to: [{ type: 'councilMember' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'clause',
      title: 'Clause',
      type: 'reference',
      to: [{ type: 'clause' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'session',
      title: 'Session',
      type: 'reference',
      to: [{ type: 'session' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'stance',
      title: 'Stance',
      type: 'string',
      options: {
        list: [
          { title: 'Supports Advocate A', value: 'support-A' },
          { title: 'Supports Advocate B', value: 'support-B' },
          { title: 'Custom reading', value: 'custom' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'proposedValue',
      title: 'Proposed Value',
      type: 'number',
      description: 'The numeric holding, e.g. 8 (with unit below).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'unit',
      title: 'Unit',
      type: 'string',
      description: 'e.g. business_hours, calendar_days.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'rationale',
      title: 'Rationale',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'confidence',
      title: 'Confidence (1–5)',
      type: 'number',
      initialValue: 3,
      validation: (Rule) => Rule.required().min(1).max(5).integer(),
    }),
    defineField({
      name: 'basisPrecedent',
      title: 'Cited Precedent',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'precedent' }] })],
    }),
    defineField({
      name: 'basisNote',
      title: 'Basis Note',
      type: 'string',
      description: 'Regulation or benchmark reference, e.g. "GDPR Art. 33 — 72h".',
    }),
    defineField({
      name: 'respondsTo',
      title: 'Responds To',
      type: 'reference',
      to: [{ type: 'position' }],
      description: 'The position this one supports or challenges.',
    }),
    defineField({
      name: 'revisionOf',
      title: 'Revision Of',
      type: 'reference',
      to: [{ type: 'position' }],
      description: 'Set when this position revises an earlier one. The original is kept.',
      readOnly: true,
    }),
    defineField({
      name: 'round',
      title: 'Round',
      type: 'string',
      initialValue: 'blind',
      options: {
        list: [
          { title: 'Blind', value: 'blind' },
          { title: 'Open', value: 'open' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { stance: 'stance', value: 'proposedValue', unit: 'unit' },
    prepare({ stance, value, unit }) {
      return {
        title: `${stance ?? 'position'} — ${value ?? '?'} ${unit ?? ''}`,
        subtitle: 'council position',
      }
    },
  },
})
