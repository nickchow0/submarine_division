// ─── Core photo type used throughout the app ──────────────────────────────────
// This mirrors the shape returned by the Sanity GROQ query in app/page.tsx

export type Photo = {
  _id: string;
  title: string;
  tags: string[];
  aiCaption: string;
  location: string | null;
  camera: string | null;
  dateTaken: string | null; // ISO date string e.g. "2024-11-03"
  lens: string | null;
  focalLength: string | null;
  iso: string | null;
  shutterSpeed: string | null;
  aperture: string | null;
  visible: boolean; // false = hidden from gallery (default true)

  // Image fields projected from the Sanity asset
  src: string; // Full CDN URL from Sanity
  width: number;
  height: number;
  blurDataURL: string | null; // Base64 low-quality placeholder for <Image>
};

// ─── Shape of the raw Sanity document (before projection) ────────────────────
export type SanityPhotoDocument = {
  _id: string;
  _type: "photo";
  title: string;
  tags?: string[];
  aiCaption?: string;
  location?: string;
  camera?: string;
  dateTaken?: string;
  image: {
    asset: {
      _ref: string;
      _type: "reference";
    };
  };
};

// ─── Map pin ──────────────────────────────────────────────────────────────────
export type MapPin = {
  _id: string;
  name: string;
  description: string | null;
  coordinates: { lat: number; lng: number };
  photos: {
    _id: string;
    title: string;
    tags: string[];
    src: string;
    width: number;
    height: number;
    blurDataURL: string | null;
    location: string | null;
    dateTaken: string | null;
    camera: string | null;
    lens: string | null;
    focalLength: string | null;
    aperture: string | null;
    shutterSpeed: string | null;
    iso: string | null;
  }[];
};

// ─── Site-wide feature flags ──────────────────────────────────────────────────
export type SiteSettings = {
  requirePassword: boolean; // when false, password gate is disabled and site is public
  showLocations: boolean; // show map/locations page in nav
  maintenanceMode: boolean; // replace public site with maintenance page
  showCaptions: boolean; // show AI captions in the gallery, modal, and photo page
  autoGenerateCaptions: boolean; // auto-generate AI caption when a photo is uploaded
  bodyFont: string | null; // Google Fonts family name for the body font, null = CSS default
};

export const DEFAULT_SETTINGS: SiteSettings = {
  requirePassword: true,
  showLocations: true,
  maintenanceMode: false,
  showCaptions: false,
  autoGenerateCaptions: true,
  bodyFont: null,
};

// ─── Sanity webhook payload ───────────────────────────────────────────────────
export type SanityWebhookPayload = {
  _id: string;
  _type: string;
  image?: SanityPhotoDocument["image"];
};

// ─── Admin photo (used in AdminDashboard) ─────────────────────────────────────
// Same fields as Photo but intentionally omits blurDataURL (admin grid uses
// raw Sanity CDN URLs and never needs blur placeholders). Adds imageRef for
// caption generation and reupload operations.
export type AdminPhoto = {
  _id: string;
  title: string;
  tags: string[];
  aiCaption: string;
  location: string | null;
  camera: string | null;
  dateTaken: string | null;
  lens: string | null;
  focalLength: string | null;
  iso: string | null;
  shutterSpeed: string | null;
  aperture: string | null;
  visible: boolean;
  src: string;
  width: number;
  height: number;
  imageRef: string;
};

// ─── Admin edit form state ─────────────────────────────────────────────────────
// All fields are strings because they come from <input> elements.
// Null fields from AdminPhoto become empty strings here.
export type EditState = {
  title: string;
  tags: string; // comma-separated string, split on save
  aiCaption: string;
  location: string;
  camera: string;
  dateTaken: string;
  lens: string;
  focalLength: string;
  iso: string;
  shutterSpeed: string;
  aperture: string;
};

// ─── Admin map pin ────────────────────────────────────────────────────────────
// Includes resolved photos for display in the admin locations page.
export type AdminPin = {
  _id: string;
  name: string;
  description: string | null;
  coordinates: { lat: number; lng: number };
  photoIds: string[];
  photos: {
    _id: string;
    title: string;
    src: string;
    width: number;
    height: number;
    blurDataURL: string | null;
  }[];
};

// ─── Pin form state ───────────────────────────────────────────────────────────
// lat/lng are strings because they come from <input> text fields.
// parseFloat() is called on save.
export type PinForm = {
  name: string;
  description: string;
  lat: string;
  lng: string;
  photoIds: string[];
};

// ─── Photo picker item ────────────────────────────────────────────────────────
// Minimal photo shape used in the locations page photo picker.
// Named PhotoPickerItem to avoid collision with the full AdminPhoto type.
export type PhotoPickerItem = {
  _id: string;
  title: string;
  src: string;
};

// ─── Admin API request / response types ──────────────────────────────────────

export type UpdatePhotoRequest = {
  id: string;
  fields: {
    title?: string;
    tags?: string[];
    aiCaption?: string;
    location?: string | null;
    camera?: string | null;
    dateTaken?: string | null;
    lens?: string | null;
    focalLength?: string | null;
    iso?: string | null;
    shutterSpeed?: string | null;
    aperture?: string | null;
    visible?: boolean;
  };
};

export type UpdateCaptionRequest = {
  photoId: string;
  imageRef: string;
};

export type BulkCaptionRequest = {
  photos: { _id: string; imageRef: string }[];
};

export type BulkCaptionResult = {
  id: string;
  ok: boolean;
  caption?: string;
  error?: string;
};

export type CreatePinRequest = {
  name: string;
  description: string | null;
  coordinates: { lat: number; lng: number };
  photoIds: string[];
};

export type UpdatePinRequest = CreatePinRequest & { id: string };

export type UpdateSettingRequest = {
  [key: string]: boolean;
};

export type UploadPhotoResponse = {
  photo: AdminPhoto;
};

// Returned by POST /api/admin/reupload — fields that change when an image is replaced
export type ReuploadPhotoUpdates = {
  src: string;
  width: number;
  height: number;
  imageRef: string;
  camera: string | null;
  lens: string | null;
  focalLength: string | null;
  iso: string | null;
  shutterSpeed: string | null;
  aperture: string | null;
  dateTaken: string | null;
};

export type ReuploadPhotoResponse = {
  ok: boolean;
  updates: ReuploadPhotoUpdates;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
