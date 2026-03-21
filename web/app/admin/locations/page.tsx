"use client";

// ─── Admin: Location / Map Pin Management ─────────────────────────────────────
// • Click anywhere on the map to drop a new pin
// • Fill in name, description, assign photos
// • Edit or delete existing pins
// • Changes are written to Sanity in real time

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import AdminMapPickerWrapper from "@/components/AdminMapPickerWrapper";
import type { AdminPin, PinForm, PhotoPickerItem } from "@/types";

const EMPTY_FORM: PinForm = {
  name: "",
  description: "",
  lat: "",
  lng: "",
  photoIds: [],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminLocationsPage() {
  const [pins, setPins] = useState<AdminPin[]>([]);
  const [photos, setPhotos] = useState<PhotoPickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<PinForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // ── Fetch data ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pinsRes, photosRes] = await Promise.all([
        fetch("/api/admin/locations"),
        fetch("/api/admin/photos-list"),
      ]);
      const pinsData = await pinsRes.json();
      const photosData = await photosRes.json();
      setPins(pinsData.pins ?? []);
      setPhotos(photosData.photos ?? []);
    } catch (err) {
      console.error("Failed to load locations data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Map click → pre-fill coordinates ────────────────────────────────────────
  function handleMapClick(lat: number, lng: number) {
    setPendingCoords({ lat, lng });
    setForm((f) => ({ ...f, lat: lat.toFixed(5), lng: lng.toFixed(5) }));
    setEditingId(null);
  }

  // ── Start editing existing pin ───────────────────────────────────────────────
  // Accepts PinBase so it's compatible with AdminMapPickerWrapper's onPinClick,
  // then looks up the full AdminPin from state to access description/photoIds.
  function startEdit(base: { _id: string }) {
    const pin = pins.find((p) => p._id === base._id);
    if (!pin) return;
    setEditingId(pin._id);
    setForm({
      name: pin.name,
      description: pin.description ?? "",
      lat: String(pin.coordinates.lat),
      lng: String(pin.coordinates.lng),
      photoIds: pin.photoIds,
    });
    setPendingCoords(pin.coordinates);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPendingCoords(null);
  }

  // ── Save (create or update) ──────────────────────────────────────────────────
  async function savePin() {
    if (!form.name.trim() || !form.lat || !form.lng) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      coordinates: { lat: parseFloat(form.lat), lng: parseFloat(form.lng) },
      photoIds: form.photoIds,
    };

    const res = await fetch("/api/admin/locations", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });

    if (res.ok) {
      await fetchData();
      cancelForm();
    } else {
      alert("Save failed — check console");
    }
    setSaving(false);
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function deletePin(id: string) {
    if (!confirm("Delete this location?")) return;
    await fetch("/api/admin/locations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchData();
    if (editingId === id) cancelForm();
  }

  // ── Toggle photo selection ────────────────────────────────────────────────────
  function togglePhoto(id: string) {
    setForm((f) => ({
      ...f,
      photoIds: f.photoIds.includes(id)
        ? f.photoIds.filter((p) => p !== id)
        : [...f.photoIds, id],
    }));
  }

  const isFormOpen = pendingCoords !== null || editingId !== null;
  const isFormReady = form.name.trim() && form.lat && form.lng;

  return (
    <div>
      {/* Header — constrained width */}
      <div className="max-w-5xl mx-auto px-4 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2
              style={{ fontFamily: "'Italiana', serif" }}
              className="text-3xl text-sky-400 tracking-wider"
            >
              Locations
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Click the map to place a pin, then assign photos to it.
            </p>
          </div>
          <a
            href="/admin"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Admin
          </a>
        </div>
      </div>
      {/* Map — full width, same structure as the public map page */}
      <div
        style={{
          position: "relative",
          height: "calc(80vh - 160px)",
          marginBottom: "1.5rem",
        }}
      >
        {!loading && (
          <AdminMapPickerWrapper
            pins={pins}
            pendingCoords={pendingCoords}
            onMapClick={handleMapClick}
            onPinClick={startEdit}
          />
        )}
      </div>
      {/* Content below map — constrained width */}
      <div className="max-w-5xl mx-auto px-4 pb-10">
        {/* Form */}
        {isFormOpen && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-6">
            <h3 className="text-slate-200 font-medium mb-4">
              {editingId ? "Edit location" : "New location"}
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">
                  Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Truk Lagoon"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">
                  Description
                </label>
                <input
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Optional short description"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Latitude *
                </label>
                <input
                  value={form.lat}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lat: e.target.value }))
                  }
                  placeholder="e.g. 7.3522"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Longitude *
                </label>
                <input
                  value={form.lng}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lng: e.target.value }))
                  }
                  placeholder="e.g. 151.8474"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Photo picker */}
            <div className="mb-4">
              <label className="text-xs text-slate-500 mb-2 block">
                Tagged photos ({form.photoIds.length} selected)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-160 overflow-y-auto">
                {photos.map((photo) => {
                  const selected = form.photoIds.includes(photo._id);
                  return (
                    <button
                      key={photo._id}
                      onClick={() => togglePhoto(photo._id)}
                      title={photo.title}
                      className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                        selected
                          ? "border-sky-400"
                          : "border-transparent opacity-50 hover:opacity-80"
                      }`}
                    >
                      <Image
                        src={photo.src}
                        alt={photo.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 30vw, 180px"
                        quality={75}
                      />
                      {selected && (
                        <div className="absolute inset-0 bg-sky-400/20 flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-sky-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={savePin}
                disabled={saving || !isFormReady}
                className="text-sm bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Add pin"}
              </button>
              <button
                onClick={cancelForm}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors px-3 py-2"
              >
                Cancel
              </button>
              {editingId && (
                <button
                  onClick={() => deletePin(editingId)}
                  className="ml-auto text-sm text-red-500 hover:text-red-400 transition-colors px-3 py-2"
                >
                  Delete location
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pin list */}
        {!loading && pins.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-600 uppercase tracking-widest mb-3">
              {pins.length} location{pins.length !== 1 ? "s" : ""}
            </p>
            {pins.map((pin) => (
              <div
                key={pin._id}
                className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium">
                    {pin.name}
                  </p>
                  <p className="text-slate-600 text-xs mt-0.5">
                    {pin.coordinates.lat.toFixed(4)},{" "}
                    {pin.coordinates.lng.toFixed(4)}
                    {" · "}
                    {pin.photos.length} photo
                    {pin.photos.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => startEdit(pin)}
                  className="text-slate-500 hover:text-sky-400 transition-colors text-sm"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>{" "}
      {/* end constrained content */}
    </div>
  );
}
