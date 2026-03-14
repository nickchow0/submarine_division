import { createClient } from '@sanity/client'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const PHOTOS_FOLDER = '/Users/nickchow/Claude/exported_photos/truk_lagoon_01_2026'  // put your images here

async function main() {
  const files = fs.readdirSync(PHOTOS_FOLDER)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))

  console.log(`Found ${files.length} images\n`)

  for (const file of files) {
    const filePath = path.join(PHOTOS_FOLDER, file)
    const title = path.basename(file, path.extname(file))
      .replace(/[-_]/g, ' ')   // turn "whale-shark_2024" into "whale shark 2024"

    process.stdout.write(`Uploading ${file}… `)

    // Upload the image file to Sanity's asset store
    const asset = await sanity.assets.upload('image', fs.createReadStream(filePath), {
      filename: file,
    })

    // Create the photo document referencing the uploaded asset
    await sanity.create({
      _type: 'photo',
      title,
      image: {
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
      },
      tags: [],  // add tags later in the Studio
    })

    console.log('✅')
  }

  console.log('\nDone! Open Sanity Studio to add tags and publish.')
}

main().catch(console.error)