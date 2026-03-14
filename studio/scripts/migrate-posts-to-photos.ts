// ─── Migrate: Post → Photo ────────────────────────────────────────────────────
// Reads all "post" documents from Sanity and creates equivalent "photo"
// documents from them, then deletes the originals.
//
// Field mapping:
//   post.title  → photo.title
//   post.image  → photo.image
//   (slug, publishedAt, body are dropped — not relevant to photos)
//
// Usage:
//   npx tsx scripts/migrate-posts-to-photos.ts
//
// Safe to re-run — skips posts that have already been migrated.

import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

async function main() {
  // ── 1. Fetch all post documents ──────────────────────────────────────────
  const posts = await sanity.fetch(`
    *[_type == "post"] {
      _id,
      title,
      image
    }
  `)

  if (posts.length === 0) {
    console.log('No post documents found — nothing to migrate.')
    return
  }

  console.log(`Found ${posts.length} post(s) to migrate.\n`)

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const post of posts) {
    process.stdout.write(`Migrating "${post.title || post._id}"… `)

    try {
      // Build the photo document — only copy fields that make sense
      const photoDoc: Record<string, unknown> = {
        _type: 'photo',
        title: post.title || 'Untitled',
        tags: [],
      }

      // Only include image if the post actually had one
      if (post.image?.asset?._ref) {
        photoDoc.image = post.image
      }

      // Create the new photo document
      await sanity.create(photoDoc)

      // Delete the original post document
      await sanity.delete(post._id)

      console.log('✅')
      migrated++
    } catch (err) {
      console.log(`❌  ${err}`)
      failed++
    }
  }

  console.log(`\n─────────────────────────────────────────`)
  console.log(`Migrated: ${migrated}  |  Skipped: ${skipped}  |  Failed: ${failed}`)

  if (migrated > 0) {
    console.log(`\nDone! Open Sanity Studio to see your photos.`)
    console.log(`Run "npm run captions" in your Next.js project to generate AI captions.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
