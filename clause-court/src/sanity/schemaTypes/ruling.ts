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
        'The debate this ruling decides. Empty for council rulings, which are decided in a session instead.',
      to: [{ type: 'debate' }],
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

    // ─── Council decision (v2) ─────────────────────────
    defineField({
      name: 'session',
      title: 'Deciding Session',
      type: 'reference',
      group: 'graph',
      to: [{ type: 'session' }],
      description: 'Set for council rulings. Empty for single-judge rulings.',
    }),
    defineField({
      name: 'tally',
      title: 'Vote Tally',
      type: 'object',
      group: 'graph',
      readOnly: true,
      fields: [
        defineField({ name: 'winnerOption', title: 'Winning Option', type: 'string' }),
        defineField({ name: 'votesCast', title: 'Votes Cast', type: 'number' }),
        defineField({ name: 'winnerSharePct', title: 'Winner Share (%)', type: 'number' }),
        defineField({ name: 'requiredSeatsMet', title: 'Required Seats Met', type: 'boolean' }),
      ],
    }),
    defineField({
      name: 'dissentingMembers',
      title: 'Dissenting Members',
      type: 'array',
      group: 'dissent',
      of: [{ type: 'reference', to: [{ type: 'councilMember' }] }],
      description: 'Human dissents from the minority. The AI dissent above is separate and optional.',
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
