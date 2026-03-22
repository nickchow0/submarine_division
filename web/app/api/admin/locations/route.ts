// ─── Admin Locations API ──────────────────────────────────────────────────────
// GET    — fetch all map pins (with photo references)
// POST   — create a new map pin
// PATCH  — update an existing map pin
// DELETE — delete a map pin

import { NextResponse } from "next/server";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";

export const dynamic = "force-dynamic";

const LOCATIONS_QUERY = `
  *[_type == "mapPin"] | order(name asc) {
    _id,
    name,
    "description": coalesce(description, null),
    coordinates,
    "photoIds": coalesce(photos[]._ref, []),
    "photos": photos[]->{
      _id,
      title,
      "src": image.asset->url,
      "width": image.asset->metadata.dimensions.width,
      "height": image.asset->metadata.dimensions.height,
      "blurDataURL": image.asset->metadata.lqip
    }
  }
`;

export async function GET() {
  try {
    const pins = await sanityClient.fetch(LOCATIONS_QUERY);
    return NextResponse.json({ pins });
  } catch (err) {
    return NextResponse.json({ pins: [], error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, coordinates, photoIds } = await request.json();

    if (!name || !coordinates?.lat || !coordinates?.lng) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const doc = await sanityWriteClient.create({
      _type: "mapPin",
      name,
      description: description || undefined,
      coordinates,
      photos: (photoIds ?? []).map((id: string) => ({
        _type: "reference",
        _ref: id,
        _key: id,
      })),
    });

    return NextResponse.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error("Create location error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, name, description, coordinates, photoIds } =
      await request.json();

    if (!id)
      return NextResponse.json(
        { ok: false, error: "Missing id" },
        { status: 400 },
      );

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (coordinates !== undefined) updates.coordinates = coordinates;
    if (photoIds !== undefined)
      updates.photos = photoIds.map((pid: string) => ({
        _type: "reference",
        _ref: pid,
        _key: pid,
      }));

    await sanityWriteClient.patch(id).set(updates).commit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Update location error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id)
      return NextResponse.json(
        { ok: false, error: "Missing id" },
        { status: 400 },
      );

    await sanityWriteClient.delete(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete location error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
