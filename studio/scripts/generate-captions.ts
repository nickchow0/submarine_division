// ─── Bulk Caption Generator ───────────────────────────────────────────────────
// Run this script to generate AI captions for all photos that don't have one yet.
// Useful when you first set up the project or upload a batch of photos manually.
//
// Usage:
//   npm run captions
//   (or: npx tsx scripts/generate-captions.ts)
//
// Requirements:
//   - .env.local must be set up with ANTHROPIC_API_KEY and SANITY_WRITE_TOKEN

import { createClient } from '@sanity/client'
import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'

// Load .env.local so this script can run outside of Next.js
dotenv.config({ path: '.env.local' })

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildImageUrl(ref: string): string {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
  // ref format: "image-{id}-{WxH}-{format}"
  const parts = ref.split('-')
  const id = parts[1]
  const format = parts[parts.length - 1]
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}.${format}?w=1200&q=85`
}

async function generateCaption(imageUrl: string): Promise<string> {
  // Fetch and convert to base64 — the SDK requires base64, not a URL
  const imageRes = await fetch(imageUrl)
  if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`)
  const imageBuffer = await imageRes.arrayBuffer()
  const imageBase64 = Buffer.from(imageBuffer).toString('base64')
  const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg'

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: contentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64 } },
        {
          type: 'text',
          text: `Describe this underwater or nature photograph in 1-2 concise sentences for a searchable image library caption.

Include as many of these as visible: subject/species, behavior or action, environment/habitat, water conditions, lighting, colors, mood.

Be specific and factual. Do not use subjective phrases like "stunning" or "beautiful".
Start directly with the subject — no preamble.`,
        },
      ],
    }],
  })

  return response.content[0].type === 'text' ? response.content[0].text.trim() : ''
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Fetching photos without captions…\n')

  const photos = await sanity.fetch(`
    *[_type == "photo" && !defined(aiCaption)] {
      _id,
      title,
      "imageRef": image.asset._ref
    }
  `)

  if (photos.length === 0) {
    console.log('✅ All photos already have captions.')
    return
  }

  console.log(`📸 Found ${photos.length} photo(s) needing captions.\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const progress = `[${i + 1}/${photos.length}]`

    try {
      process.stdout.write(`${progress} "${photo.title}"… `)

      if (!photo.imageRef) {
        console.log('⚠️  skipped (no image attached)')
        continue
      }

      const imageUrl = buildImageUrl(photo.imageRef)
      const caption = await generateCaption(imageUrl)

      await sanity.patch(photo._id).set({ aiCaption: caption }).commit()

      console.log(`✅`)
      console.log(`    "${caption.slice(0, 80)}${caption.length > 80 ? '…' : ''}"\n`)
      success++

      // Rate limit: wait 1 second between requests to be kind to the API
      if (i < photos.length - 1) await sleep(1000)

    } catch (err) {
      console.log(`❌ Error: ${err}`)
      failed++
    }
  }

  console.log(`\n─────────────────────────────`)
  console.log(`Done. ${success} succeeded, ${failed} failed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
