import { defineField, defineType } from 'sanity'

export const mapPinType = defineType({
  name: 'mapPin',
  title: 'Map Pin',
  type: 'document',

  preview: {
    select: {
      title: 'name',
      subtitle: 'description',
    },
  },

  fields: [
    defineField({
      name: 'name',
      title: 'Location name',
      type: 'string',
      description: 'e.g. "Truk Lagoon", "Blue Corner, Palau"',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Optional short description shown on the map popup.',
    }),

    defineField({
      name: 'coordinates',
      title: 'Coordinates',
      type: 'object',
      validation: (rule) => rule.required(),
      fields: [
        defineField({ name: 'lat', title: 'Latitude',  type: 'number', validation: r => r.required().min(-90).max(90) }),
        defineField({ name: 'lng', title: 'Longitude', type: 'number', validation: r => r.required().min(-180).max(180) }),
      ],
    }),

    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'photo' }] }],
      description: 'Photos taken at this location.',
    }),
  ],
})
