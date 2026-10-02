import { defineField, defineType } from 'sanity'

/**
 * benchmarkResult: written by bench/run.ts, read by the dashboard P4/P5 panels.
 * Every number shown in the UI comes from these documents; no hard-coded demo output.
 */
export const benchmarkResultSchema = defineType({
  name: 'benchmarkResult',
  title: 'Benchmark Result',
  type: 'document',
  fields: [
    defineField({
      name: 'ranAt',
      title: 'Ran At',
      type: 'datetime',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'dataset',
      title: 'Dataset',
      type: 'string',
      options: {
        list: [
          { title: 'Dev', value: 'dev' },
          { title: 'Holdout', value: 'holdout' },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'perRule',
      title: 'Per Rule',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'rule', type: 'string', title: 'Rule' },
            { name: 'tp', type: 'number', title: 'True Positives' },
            { name: 'fp', type: 'number', title: 'False Positives' },
            { name: 'fn', type: 'number', title: 'False Negatives' },
            { name: 'precision', type: 'number', title: 'Precision' },
            { name: 'recall', type: 'number', title: 'Recall' },
          ],
        },
      ],
    }),
    defineField({
      name: 'baseline',
      title: 'Baseline',
      type: 'object',
      description: 'Exact-string search baseline for comparison',
      fields: [
        { name: 'name', type: 'string', title: 'Baseline Name' },
        { name: 'tp', type: 'number', title: 'True Positives' },
        { name: 'fn', type: 'number', title: 'False Negatives' },
        { name: 'recall', type: 'number', title: 'Recall' },
      ],
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
    }),
  ],
  preview: {
    select: {
      dataset: 'dataset',
      ranAt: 'ranAt',
    },
    prepare({ dataset, ranAt }) {
      const ts = ranAt ? new Date(ranAt).toLocaleString() : '?'
      return {
        title: `Benchmark: ${dataset ?? '?'}`,
        subtitle: ts,
      }
    },
  },
})
