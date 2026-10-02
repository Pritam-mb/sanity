import { defineField, defineType } from 'sanity'

/**
 * factRef: custom inline Portable Text object.
 * Usage inside page.body: insert a factRef block pointing to a fact document.
 * The web renderer substitutes the live fact.value + fact.unit at render time.
 */
export const factRefSchema = defineType({
  name: 'factRef',
  title: 'Fact Reference',
  type: 'object',
  fields: [
    defineField({
      name: 'fact',
      title: 'Fact',
      type: 'reference',
      to: [{ type: 'fact' }],
      validation: (r) => r.required(),
    }),
  ],
  // Renders inline in Studio as the fact label
  preview: {
    select: {
      factLabel: 'fact.label',
      factValue: 'fact.value',
      factUnit: 'fact.unit',
    },
    prepare({ factLabel, factValue, factUnit }) {
      const display = [factValue, factUnit].filter(Boolean).join(' ')
      return {
        title: factLabel ?? 'Fact',
        subtitle: display || '(no value yet)',
      }
    },
  },
})
