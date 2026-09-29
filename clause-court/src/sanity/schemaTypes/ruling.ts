import { defineField, defineType } from 'sanity'

/**
 * A human decision. This is the only document in the system that constitutes
 * an authoritative interpretation of a clause — the AI never writes one.
 *
 * `dissent` is generated *after* the human has ruled, by the advocate who
 * lost. It is stored as part of the ruling because dissent without a holding
 * has no meaning, and it can never overturn the holding.
 */
export const rulingType = defineType({
  name: 'ruling',
  title: 'Ruling',
  type: 'document',
  icon: () => '🔨',
  groups: [
    { name: 'holding', title: 'Holding', default: true },
    { name: 'dissent', title: 'Dissent' },
    { name: 'graph', title: 'Reference Graph' },
  ],
  fields: [
    defineField({
      name: 'clause',
      title: 'Clause',
      type: 'reference',
      group: 'holding',
      to: [{ type: 'clause' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'debate',
      title: 'Hearing',
      type: 'reference',
      group: 'holding',
      description:
        'The debate this ruling decides. The advocates’ arguments are read back from this document, so a ruling always records what was actually argued.',
      to: [{ type: 'debate' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'chosenInterpretation',
      title: 'Adopted Interpretation',
      type: 'reference',
      group: 'holding',
      description: 'Null when the judge wrote a custom ruling instead.',
      to: [{ type: 'interpretation' }],
    }),
    defineField({
      name: 'customRuling',
      title: 'Custom Ruling',
      type: 'text',
      rows: 3,
      group: 'holding',
      description: 'The operative text when the judge did not adopt either advocate verbatim.',
    }),
    defineField({
      name: 'reasoning',
      title: 'Judge’s Reasoning',
      type: 'text',
      rows: 4,
      group: 'holding',
    }),
    defineField({
      name: 'judgeName',
      title: 'Judge',
      type: 'string',
      group: 'holding',
      validation: (Rule) => Rule.required(),
    }),

    // ─── Dissent (Persona C) ───────────────────────────
    defineField({
      name: 'dissent',
      title: 'Dissent',
      type: 'text',
      rows: 4,
      group: 'dissent',
      readOnly: true,
      description:
        'Generated opinion by the advocate who lost. Not a legal finding, and it does not overturn the holding.',
    }),
    defineField({
      name: 'dissentAdvocate',
      title: 'Dissenting Advocate',
      type: 'string',
      group: 'dissent',
      readOnly: true,
      options: {
        list: [
          { title: 'Advocate A', value: 'A' },
          { title: 'Advocate B', value: 'B' },
        ],
      },
    }),
    defineField({
      name: 'clauseRevisionSuggested',
      title: 'Clause Revision Suggested',
      type: 'boolean',
      group: 'dissent',
      readOnly: true,
    }),
    defineField({
      name: 'suggestedRevision',
      title: 'Suggested Revision',
      type: 'text',
      rows: 3,
      group: 'dissent',
      readOnly: true,
    }),

    // ─── Reference graph ───────────────────────────────
    defineField({
      name: 'precedentId',
      title: 'Created Precedent',
      type: 'string',
      group: 'graph',
      readOnly: true,
      description: 'Denormalized pointer to the precedent this ruling produced.',
    }),
  ],
  preview: {
    select: {
      judge: 'judgeName',
      clause: 'clause.title',
      holding: 'customRuling',
      interpretation: 'chosenInterpretation.title',
      side: 'chosenInterpretation.side',
    },
    prepare({ judge, clause, holding, interpretation, side }) {
      const operative = holding ?? interpretation ?? 'Ruling issued'
      const adopted =
        interpretation && side ? `Adopted side ${side} · ` : ''
      return {
        title: `${clause ?? 'Orphaned ruling'} — ${judge ?? 'unknown judge'}`,
        subtitle: `${adopted}${
          operative.length > 80 ? `${operative.slice(0, 80)}…` : operative
        }`,
      }
    },
  },
})
