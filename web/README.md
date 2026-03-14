# Photo Gallery — Next.js Starter

A searchable photo gallery with manual tags + AI-generated captions, built with Next.js, Sanity CMS, and Claude.

---

## Tech Stack

| Tool         | Purpose                                              |
| ------------ | ---------------------------------------------------- |
| Next.js 15   | React framework — pages, routing, image optimisation |
| Sanity.io    | CMS — upload photos, manage tags, store data         |
| Claude API   | AI caption generation via vision                     |
| Fuse.js      | Client-side fuzzy search                             |
| Tailwind CSS | Styling                                              |
| Vercel       | Hosting                                              |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Sanity

1. Go to [sanity.io](https://sanity.io) and create a free account
2. Create a new project (any name, dataset = `production`)
3. Copy your **Project ID** from the project dashboard
4. Go to **Settings → API → Tokens** and create a new token with **Editor** permissions

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=abc123xyz     ← from sanity.io dashboard
SANITY_WRITE_TOKEN=skAbc...                 ← the Editor token you created
ANTHROPIC_API_KEY=sk-ant-...                ← from console.anthropic.com
```

### 4. Add the photo schema to Sanity

In your Sanity Studio project, add `sanity/schemas/photo.ts` to your schema config:

```ts
// sanity.config.ts (in your Sanity Studio project)
import { defineConfig } from "sanity";
import photo from "./schemas/photo";

export default defineConfig({
  // ...your existing config...
  schema: { types: [photo] },
});
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The gallery will be empty until you add photos in Sanity.

---

## Adding Photos

1. Log into your Sanity Studio (usually `localhost:3333` when running locally)
2. Click **Photo → Create**
3. Upload an image, add a title and tags
4. Hit **Publish**

The AI caption is generated automatically via the webhook (see below).

---

## Setting Up the AI Caption Webhook

This makes captions generate automatically every time you publish a photo.

1. Deploy the project to Vercel first (you need a public URL)
2. In Sanity: **Settings → API → Webhooks → Add webhook**
3. Set:
   - **URL**: `https://your-site.vercel.app/api/generate-caption`
   - **Dataset**: `production`
   - **Trigger on**: Create, Update
   - **Filter**: `_type == "photo"`
   - **HTTP method**: POST

From then on, publishing a photo triggers the webhook, which calls Claude, which writes the caption back to Sanity within ~5 seconds.

---

## Generating Captions for Existing Photos

If you have photos without captions (e.g. before the webhook was set up):

```bash
npm run captions
```

This script finds all photos with no `aiCaption` and processes them in batches.

---

## Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_SANITY_PROJECT_ID
# NEXT_PUBLIC_SANITY_DATASET
# SANITY_WRITE_TOKEN
# ANTHROPIC_API_KEY
```

Or connect your GitHub repo at [vercel.com](https://vercel.com) for automatic deploys on every push.

---

## Project Structure

```
submarine-division/
├── app/
│   ├── layout.tsx              ← Header, footer, fonts (server component)
│   ├── page.tsx                ← Fetches photos from Sanity (server component)
│   ├── globals.css
│   └── api/
│       └── generate-caption/
│           └── route.ts        ← Sanity webhook → Claude → caption (Node.js)
├── components/
│   ├── Gallery.tsx             ← Grid + search + filters (client component)
│   ├── SearchBar.tsx           ← Search input with debounce
│   ├── TagFilter.tsx           ← Tag pill buttons
│   └── Lightbox.tsx            ← Full-screen photo viewer
├── lib/
│   ├── sanity.ts               ← Sanity client + GROQ query
│   └── search.ts               ← Fuse.js config
├── sanity/
│   └── schemas/
│       └── photo.ts            ← Sanity document schema
├── scripts/
│   └── generate-captions.ts   ← Bulk caption generation script
├── types/
│   └── index.ts                ← TypeScript types
├── .env.local.example          ← Copy to .env.local and fill in secrets
└── README.md
```

---

## Customisation

**Change the site name** → `app/layout.tsx`, update the `<h1>` text

**Change search weights** → `lib/search.ts`, adjust the `weight` values in `FUSE_OPTIONS`

**Change the AI caption prompt** → `app/api/generate-caption/route.ts`, edit the `text` field in the Claude message

**Add a new metadata field** (e.g. depth, dive site) → add it to `sanity/schemas/photo.ts`, update `ALL_PHOTOS_QUERY` in `lib/sanity.ts`, add it to the `Photo` type in `types/index.ts`, display it in `components/Lightbox.tsx`

```

```
