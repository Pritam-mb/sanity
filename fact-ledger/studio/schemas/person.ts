import { defineField, defineType } from 'sanity'

/**
 * person — minimal document for fact ownership.
 */
export const personSchema = defineType({
  name: 'person',
  title: 'Person',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'role' },
  },
})
