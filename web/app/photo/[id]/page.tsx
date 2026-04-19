// ─── Photo Detail Page ───────────────────────────────────────────────────────
// Dynamic route: /photo/[id]
// Opens the portfolio page with the specified photo pre-opened in the modal,
// giving the same experience as clicking the photo from the gallery grid.

import { notFound } from "next/navigation";
import {
  sanityClient,
  PHOTO_BY_ID_QUERY,
  ALL_PHOTOS_QUERY,
  SITE_SETTINGS_QUERY,
} from "@/lib/sanity";
import Portfolio from "@/components/Portfolio";
import { type Photo, type SiteSettings, DEFAULT_SETTINGS } from "@/types";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export const revalidate = 60;

// Dynamic metadata for SEO / link previews
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const photo: Photo | null = await sanityClient.fetch(PHOTO_BY_ID_QUERY, {
    id,
  });

  if (!photo) return { title: "Photo not found" };

  return {
    title: `${photo.title} — Submarine Division`,
    description: photo.aiCaption || `Photo: ${photo.title}`,
  };
}

export default async function PhotoPage({ params }: Props) {
  const { id } = await params;
  const [photos, settings] = await Promise.all([
    sanityClient.fetch<Photo[]>(ALL_PHOTOS_QUERY),
    sanityClient.fetch<SiteSettings | null>(SITE_SETTINGS_QUERY),
  ]);

  const { showCaptions } = settings ?? DEFAULT_SETTINGS;

  // Verify the photo exists; 404 if not
  if (!photos.find((p) => p._id === id)) notFound();

  // Shuffle matching the portfolio page so the gallery feels consistent
  const shuffled = [...photos];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // eslint-disable-next-line react-hooks/purity
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return (
    <Portfolio
      photos={shuffled}
      showCaptions={showCaptions}
      initialPhotoId={id}
    />
  );
}
