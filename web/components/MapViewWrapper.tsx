// MapView handles its own lazy Leaflet loading inside useEffect,
// so next/dynamic + ssr:false is no longer needed here.
// This wrapper exists solely as the client-component boundary between
// the server-rendered MapPage and the interactive MapView.
export { default } from "@/components/MapView";
