# Building a Searchable Photo Gallery Website

A practical guide to building a site like amustard.com — a CMS-managed photo gallery with both manual tags and AI-powered search.

---

## Recommended Stack

| Layer       | Tool                                         | Why                                                                    |
| ----------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| Framework   | **Next.js 14+** (App Router)                 | SSG for speed, API routes for AI, image optimization built in          |
| CMS         | **Sanity.io** (free tier)                    | Real-time editing, image pipeline, custom schemas, generous free tier  |
| Image CDN   | **Sanity's built-in** or **Cloudinary**      | On-the-fly resize/crop/format, lazy load, responsive srcsets           |
| Search      | **Fuse.js** (client) or **Algolia** (hosted) | Fuse is free and local; Algolia gives typo-tolerance + faceted filters |
| AI Captions | **Claude API** or **OpenAI Vision**          | Run once at upload time, store the caption in the CMS                  |
| Hosting     | **Vercel**                                   | Zero-config Next.js deploy, global CDN, free hobby tier                |

---

## Step 1 — Set Up the CMS (Sanity)

### Install Sanity

```bash
npm create sanity@latest -- --project-name submarine-division --dataset production
```

### Define Your Photo Schema

Create `schemas/photo.ts` in your Sanity studio:

```ts
import { defineType, defineField } from "sanity";

export default defineType({
  name: "photo",
  title: "Photo",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true }, // enables smart cropping
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" }, // nice tag-input UI
    }),
    defineField({
      name: "aiCaption",
      title: "AI Caption",
      type: "text",
      description: "Auto-generated — do not edit manually",
      readOnly: true,
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "string",
    }),
    defineField({
      name: "camera",
      title: "Camera & Lens",
      type: "string",
    }),
    defineField({
      name: "dateTaken",
      title: "Date Taken",
      type: "date",
    }),
  ],
});
```

This gives you a dashboard where you upload a photo, type tags, and see the AI caption auto-populated.

---

## Step 2 — AI Caption Generation

Generate captions automatically when a photo is uploaded. Two approaches:

### Option A: Sanity Webhook + API Route (recommended)

1. Set up a Sanity webhook that fires on photo creation
2. It hits your Next.js API route
3. The route fetches the image, sends it to Claude/OpenAI Vision, saves the caption back

```ts
// app/api/generate-caption/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";

const anthropic = new Anthropic();
const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: "production",
  token: process.env.SANITY_WRITE_TOKEN!,
  apiVersion: "2024-01-01",
  useCdn: false,
});

export async function POST(req: Request) {
  const { _id, image } = await req.json();

  // Build the image URL from Sanity's asset reference
  const imageUrl = `https://cdn.sanity.io/images/${process.env.SANITY_PROJECT_ID}/production/${image.asset._ref
    .replace("image-", "")
    .replace("-jpg", ".jpg")
    .replace("-png", ".png")}`;

  // Ask Claude to describe the photo
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: imageUrl } },
          {
            type: "text",
            text: "Describe this underwater/nature photograph in 1-2 sentences for a search index. Include: subject, behavior, environment, lighting, colors. Be specific and factual.",
          },
        ],
      },
    ],
  });

  const caption =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Write caption back to Sanity
  await sanity.patch(_id).set({ aiCaption: caption }).commit();

  return Response.json({ ok: true, caption });
}
```

### Option B: Bulk Script for Existing Photos

```ts
// scripts/generate-captions.ts
// Run: npx tsx scripts/generate-captions.ts
import { createClient } from "@sanity/client";
import Anthropic from "@anthropic-ai/sdk";

const sanity = createClient({
  /* config */
});
const anthropic = new Anthropic();

const photos = await sanity.fetch(`*[_type == "photo" && !defined(aiCaption)]`);

for (const photo of photos) {
  // ... same Claude call as above
  // Add a delay to respect rate limits
  await new Promise((r) => setTimeout(r, 1000));
}
```

---

## Step 3 — Next.js Frontend

### Project Setup

```bash
npx create-next-app@latest submarine-division --typescript --tailwind --app
cd submarine-division
npm install @sanity/client @sanity/image-url fuse.js
```

### Fetch Photos at Build Time

```ts
// lib/sanity.ts
import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});

const builder = imageUrlBuilder(client);
export function urlFor(source: any) {
  return builder.image(source);
}
```

```ts
// app/page.tsx
import { client, urlFor } from '@/lib/sanity'
import Gallery from '@/components/Gallery'

// This runs at build time (SSG) — your site is a static HTML file
export default async function Home() {
  const photos = await client.fetch(`
    *[_type == "photo"] | order(dateTaken desc) {
      _id, title, tags, aiCaption, location, camera, dateTaken,
      "src": image.asset->url,
      "width": image.asset->metadata.dimensions.width,
      "height": image.asset->metadata.dimensions.height,
      "blurHash": image.asset->metadata.blurHash,
    }
  `)

  return <Gallery photos={photos} />
}
```

### The Gallery Component with Search

```tsx
// components/Gallery.tsx
"use client";
import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import Image from "next/image";

type Photo = {
  _id: string;
  title: string;
  tags: string[];
  aiCaption: string;
  src: string;
  width: number;
  height: number;
};

export default function Gallery({ photos }: { photos: Photo[] }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Build Fuse search index once
  const fuse = useMemo(
    () =>
      new Fuse(photos, {
        keys: [
          { name: "title", weight: 2 },
          { name: "tags", weight: 3 }, // manual tags weighted highest
          { name: "aiCaption", weight: 1 }, // AI descriptions add depth
        ],
        threshold: 0.35, // 0 = exact, 1 = match anything
        includeScore: true,
      }),
    [photos],
  );

  // All unique tags for filter buttons
  const allTags = useMemo(
    () => [...new Set(photos.flatMap((p) => p.tags))].sort(),
    [photos],
  );

  // Filter logic
  const results = useMemo(() => {
    let filtered = query ? fuse.search(query).map((r) => r.item) : photos;

    if (activeTag) {
      filtered = filtered.filter((p) => p.tags.includes(activeTag));
    }
    return filtered;
  }, [query, activeTag, fuse, photos]);

  return (
    <>
      {/* Search Input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by keyword, species, location..."
      />

      {/* Tag Filters */}
      <div className="flex gap-2 flex-wrap">
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={activeTag === tag ? "active" : ""}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Masonry Grid */}
      <div className="columns-3 gap-3">
        {results.map((photo) => (
          <div key={photo._id} className="break-inside-avoid mb-3">
            <Image
              src={photo.src}
              alt={photo.title}
              width={photo.width}
              height={photo.height}
              placeholder="blur"
              blurDataURL={`data:image/png;base64,...`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <h3>{photo.title}</h3>
            <p>{photo.aiCaption}</p>
            <div>
              {photo.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
```

---

## Step 4 — Image Optimization

Next.js `<Image>` gives you automatic WebP/AVIF conversion and lazy loading. But for a photo site you want more control:

```ts
// For Sanity images, use their URL builder for on-the-fly transforms:
urlFor(photo.image)
  .width(800) // resize
  .quality(80) // compress
  .format("webp") // modern format
  .blur(50) // placeholder
  .url();

// For Cloudinary (if you use it instead):
// https://res.cloudinary.com/your-cloud/image/upload/w_800,q_80,f_auto/photo.jpg
```

Serve responsive images with `srcset`:

```tsx
<Image
  src={photo.src}
  alt={photo.title}
  width={photo.width}
  height={photo.height}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

---

## Step 5 — Deploy

```bash
# Connect your repo to Vercel
npx vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_SANITY_PROJECT_ID
# SANITY_WRITE_TOKEN
# ANTHROPIC_API_KEY

# Set up Sanity webhook → your-site.vercel.app/api/generate-caption
# Trigger: Create/Update on type "photo"
```

Every time you publish a photo in Sanity, the webhook fires, Claude generates a caption, and Vercel rebuilds the static pages with ISR (Incremental Static Regeneration).

---

## Step 6 — Scaling Up Search with Algolia (Optional)

Once you have 500+ images, Fuse.js may feel slow. Swap in Algolia:

```bash
npm install algoliasearch react-instantsearch
```

Sync your Sanity data to Algolia with a webhook or scheduled script, then use Algolia's React widgets for instant, typo-tolerant search with faceted tag filters.

---

## Project Structure

```
submarine-division/
├── app/
│   ├── page.tsx              # Main gallery (SSG)
│   ├── photo/[id]/page.tsx   # Individual photo page (SEO)
│   ├── api/
│   │   └── generate-caption/
│   │       └── route.ts      # AI caption webhook
│   └── layout.tsx
├── components/
│   ├── Gallery.tsx            # Grid + search + filters
│   ├── Lightbox.tsx           # Full-screen photo viewer
│   ├── SearchBar.tsx
│   └── TagFilter.tsx
├── lib/
│   ├── sanity.ts              # Sanity client + image URL builder
│   └── search.ts              # Fuse.js config
├── sanity/                    # Sanity studio (embedded or separate)
│   └── schemas/
│       └── photo.ts
├── scripts/
│   └── generate-captions.ts   # Bulk caption generation
└── public/
```

---

## Key Takeaways

1. **CMS-first**: Sanity gives you a proper dashboard to upload, tag, and manage photos without touching code
2. **Dual search**: Manual tags give you precision ("hammerhead", "macro"), AI captions give you natural language depth ("diver exploring a wreck covered in coral")
3. **Static output**: Next.js SSG means your gallery loads instantly — no server needed at runtime
4. **Progressive enhancement**: Start with the HTML prototype (included), then layer on Next.js + Sanity when ready

---

## Getting Started Checklist

- [ ] Open `photo-gallery-demo.html` to see the working prototype
- [ ] Create a free Sanity account at sanity.io
- [ ] Create a free Vercel account at vercel.com
- [ ] Get an Anthropic API key for AI captions at console.anthropic.com
- [ ] Run `npx create-next-app` and wire it up following the code above
- [ ] Replace the placeholder images in the prototype with your real photos
