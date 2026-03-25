import {defineField, defineType} from 'sanity'

// ─── Site Settings (singleton) ────────────────────────────────────────────────
// One document of this type ever exists, identified by _id = "siteSettings".
// Feature flags here control experimental behaviour across the public site.

export const siteSettingsType = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  __experimental_actions: ['update', 'publish'], // no create / delete in Studio UI
  fields: [
    defineField({
      name: 'requirePassword',
      title: 'Require site password',
      description:
        'When disabled, the site is publicly accessible without a password. Visitors skip the password page entirely.',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'showLocations',
      title: 'Show Locations / Map page',
      description: 'Displays the dive-site map in the navigation and at /locations.',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'showCaptions',
      title: 'Show captions',
      description:
        'Displays AI-generated captions in the portfolio cards, photo modal, and photo page.',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'autoGenerateCaptions',
      title: 'Auto-generate captions on upload',
      description: 'Automatically generates an AI caption for each photo when it is uploaded.',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'maintenanceMode',
      title: 'Maintenance mode',
      description:
        'Replaces the public site with a "coming soon" message. Admin access is unaffected.',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    prepare: () => ({title: 'Site Settings'}),
  },
})
