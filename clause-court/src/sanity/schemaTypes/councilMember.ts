import { defineField, defineType } from 'sanity'

/**
 * A person holding a council seat. One member, one vote.
 * Demo identities are seeded; a real deployment would back these with sign-in.
 */
export const councilMemberType = defineType({
  name: 'councilMember',
  title: 'Council Member',
  type: 'document',
  icon: () => '🪑',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'seat',
      title: 'Seat',
      type: 'string',
      description: 'The interest this member represents.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Only active members count toward quorum.',
      initialValue: true,
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 2,
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'seat', active: 'active' },
    prepare({ title, subtitle, active }) {
      return {
        title: title ?? 'Unnamed member',
        subtitle: `${subtitle ?? 'no seat'}${active === false ? ' (inactive)' : ''}`,
      }
    },
  },
})
