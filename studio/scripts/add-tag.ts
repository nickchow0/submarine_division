// ─── Add a tag to all photos ──────────────────────────────────────────────────
// Usage:  npx tsx scripts/add-tag.ts "truk lagoon"

import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const TAG = process.argv[2]

if (!TAG) {
  console.error('Usage: npx tsx scripts/add-tag.ts "tag name"')
  process.exit(1)
}

async function main() {
  // Fetch all photos that don't already have this tag
  const photos = await sanity.fetch(
    `*[_type == "photo" && !($tag in coalesce(tags, []))] { _id, title, tags }`,
    { tag: TAG }
  )

  if (photos.length === 0) {
    console.log(`All photos already have the tag "${TAG}".`)
    return
  }

  console.log(`Adding "${TAG}" to ${photos.length} photo(s)…\n`)

  for (const photo of photos) {
    process.stdout.write(`  "${photo.title}"… `)
    await sanity
      .patch(photo._id)
      .setIfMissing({ tags: [] })
      .append('tags', [TAG])
      .commit()
    console.log('✅')
  }

  console.log(`\nDone.`)
}

main().catch(console.error)
