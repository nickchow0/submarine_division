// ─── Map Page ─────────────────────────────────────────────────────────────────
// Server component — fetches all map pins from Sanity, passes to client map.

import { sanityClient, ALL_MAP_PINS_QUERY } from "@/lib/sanity";
import MapViewWrapper from "@/components/MapViewWrapper";
import type { MapPin } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map — Submarine Division",
  description: "Dive locations around the world",
};

export const revalidate = 60;

export default async function MapPage() {
  const pins = await sanityClient.fetch<MapPin[]>(ALL_MAP_PINS_QUERY);

  return (
    // position:relative + explicit height gives MapView's `absolute inset-0`
    // a reliable bounding box regardless of flex/grid parent quirks
    <div style={{ position: "relative", height: "calc(80vh - 160px)" }}>
      <MapViewWrapper pins={pins} />
    </div>
  );
}
