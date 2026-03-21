import type L from "leaflet";

// ─── Pin icon factory ──────────────────────────────────────────────────────────
// Creates a Leaflet DivIcon with an SVG pin marker for map pins.
// Used by both MapView and AdminMapPicker.

export function createPinIcon(color: string, opacity = 0.85): L.DivIcon {
  // Leaflet is loaded dynamically — use the global L set by the dynamic import
  const leaflet = (globalThis as unknown as { L: typeof L }).L;
  return leaflet.divIcon({
    className: "",
    iconAnchor: [12, 36],
    html: `<svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"
        fill="${color}" opacity="${opacity}"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
    </svg>`,
  });
}
