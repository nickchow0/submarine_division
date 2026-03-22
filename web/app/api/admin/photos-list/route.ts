// ─── Admin Photos List API ────────────────────────────────────────────────────
// GET /api/admin/photos-list
// Returns a lightweight list of all photos (id, title, src) for use in
// the location pin manager's photo picker.

import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

const PHOTOS_LIST_QUERY = `
  *[_type == "photo" && !(_id in path("drafts.**"))] | order(dateTaken desc) {
    _id,
    title,
    "src": image.asset->url
  }
`;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const photos = await sanityClient.fetch(PHOTOS_LIST_QUERY);
    return NextResponse.json({ photos });
  } catch (err) {
    console.error("GET /api/admin/photos-list error:", err);
    return NextResponse.json({ photos: [] }, { status: 500 });
  }
}
