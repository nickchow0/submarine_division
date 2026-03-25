// ─── Settings API route ───────────────────────────────────────────────────────
// GET  /api/admin/settings  → returns current siteSettings (with coalesced defaults)
// PATCH /api/admin/settings → upserts the siteSettings singleton document

import { NextResponse } from "next/server";
import {
  sanityClient,
  sanityWriteClient,
  SITE_SETTINGS_QUERY,
} from "@/lib/sanity";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await sanityClient.fetch<SiteSettings | null>(
      SITE_SETTINGS_QUERY,
    );
    return NextResponse.json(settings ?? DEFAULT_SETTINGS);
  } catch (err) {
    console.error("GET /api/admin/settings error:", err);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as Partial<SiteSettings>;

    const updates: Partial<SiteSettings> = {};

    const booleanKeys: (keyof SiteSettings)[] = [
      "requirePassword", "showLocations", "maintenanceMode",
      "showCaptions", "autoGenerateCaptions",
    ];
    for (const key of booleanKeys) {
      if (key in body && typeof body[key] === "boolean") {
        (updates as Record<string, unknown>)[key] = body[key];
      }
    }

    if ("bodyFont" in body && (typeof body.bodyFont === "string" || body.bodyFont === null)) {
      updates.bodyFont = body.bodyFont;
    }

    // createOrReplace with a fixed _id creates the singleton if it doesn't exist yet,
    // or replaces it entirely if it does. We merge with defaults first so no fields
    // are accidentally wiped if the caller only sends one key.
    const existing = await sanityWriteClient.fetch<SiteSettings | null>(
      SITE_SETTINGS_QUERY,
    );
    const merged = { ...DEFAULT_SETTINGS, ...(existing ?? {}), ...updates };

    await sanityWriteClient.createOrReplace({
      _type: "siteSettings",
      _id: "siteSettings",
      ...merged,
    });

    // Fetch the canonical result (with coalesce defaults) to return
    const result = await sanityWriteClient.fetch<SiteSettings | null>(
      SITE_SETTINGS_QUERY,
    );
    return NextResponse.json(result ?? merged);
  } catch (err) {
    console.error("PATCH /api/admin/settings error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
