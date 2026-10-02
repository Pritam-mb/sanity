import { defineField, defineType } from 'sanity'

/**
 * page: a content page whose body uses Portable Text.
 * Fact values should be inserted as factRef inline objects, never as literal text.
 */
export const pageSchema = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: {
        list: [
          { title: 'Policy', value: 'policy' },
          { title: 'Help', value: 'help' },
          { title: 'Pricing', value: 'pricing' },
          { title: 'FAQ', value: 'faq' },
        ],
        layout: 'radio',
      },
      initialValue: 'policy',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        {
          type: 'block',
          // Allow factRef as inline object inside text blocks
          of: [
            {
              type: 'factRef',
              title: 'Fact Reference',
            },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'kind',
    },
  },
})
