// ─── Gallery Page ─────────────────────────────────────────────────────────────
// This is a SERVER Component. It runs at build time (or on the server)
// to fetch all photos from Sanity, then passes them to the Gallery
// client component which handles all the interactive stuff.

import {
  sanityClient,
  ALL_PHOTOS_QUERY,
  SITE_SETTINGS_QUERY,
} from "@/lib/sanity";
import Gallery from "@/components/Gallery";
import { type Photo, type SiteSettings, DEFAULT_SETTINGS } from "@/types";

// Tell Next.js to revalidate this page every 60 seconds.
export const revalidate = 60;

export default async function GalleryPage() {
  const [photos, settings] = await Promise.all([
    sanityClient.fetch<Photo[]>(ALL_PHOTOS_QUERY),
    sanityClient.fetch<SiteSettings | null>(SITE_SETTINGS_QUERY),
  ]);

  const { showCaptions } = settings ?? DEFAULT_SETTINGS;

  // Shuffle using Fisher-Yates so the gallery order is random on each
  // cache revalidation (every 60 seconds) rather than always newest-first.
  const shuffled = [...photos];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return <Gallery photos={shuffled} showCaptions={showCaptions} />;
}
