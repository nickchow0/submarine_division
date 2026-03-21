"use client";

import Image from "next/image";
import { type AdminPhoto } from "@/types";
import { type SortKey } from "@/lib/hooks/usePhotoManagement";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
      <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-3xl font-light text-sky-400">{value}</p>
      {sub && <p className="text-slate-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PhotoTableProps {
  /** The filtered+sorted list to display */
  photos: AdminPhoto[];
  /** All photos (for StatCard total/visible/hidden counts) */
  allPhotos: AdminPhoto[];

  /** Sort controls */
  sortBy: SortKey;
  setSortBy: (v: SortKey) => void;

  /** Filter controls */
  filterVisibility: "all" | "visible" | "hidden";
  setFilterVisibility: (v: "all" | "visible" | "hidden") => void;
  filterCaption: "all" | "missing";
  setFilterCaption: (v: "all" | "missing") => void;
  filterTag: string;
  setFilterTag: (v: string) => void;

  /** Selection */
  selectedIds: Set<string>;
  onSelectId: (id: string) => void;

  /** Photo actions */
  onEdit: (photo: AdminPhoto) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onReupload: (id: string) => void;
  onRegenerateCaption: (id: string, imageRef: string) => void;

  /** Caption regen state */
  captionIds: Set<string>;

  /** Per-photo feedback */
  feedback: { id: string; msg: string; detail?: string } | null;
  onShowErrorDetail?: (msg: string, detail: string) => void;

  /** Delete confirmation state */
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  deletingId: string | null;

  /** Reupload spinner state */
  reuploadingId: string | null;
}

// ─── PhotoTable ───────────────────────────────────────────────────────────────

export default function PhotoTable({
  photos,
  allPhotos,
  sortBy,
  setSortBy,
  filterVisibility,
  setFilterVisibility,
  filterCaption,
  setFilterCaption,
  filterTag,
  setFilterTag,
  selectedIds,
  onSelectId,
  onEdit,
  onDelete,
  onToggleVisibility,
  onReupload,
  onRegenerateCaption,
  captionIds,
  feedback,
  onShowErrorDetail,
  confirmDeleteId,
  setConfirmDeleteId,
  deletingId,
  reuploadingId,
}: PhotoTableProps) {
  // ── Stats (derived from allPhotos) ─────────────────────────────────────────
  const totalPhotos = allPhotos.length;
  const hiddenPhotos = allPhotos.filter((p) => !p.visible).length;
  const missingCap = allPhotos.filter((p) => !p.aiCaption).length;
  const uniqueTags = new Set(allPhotos.flatMap((p) => p.tags)).size;
  const hasCaptions = totalPhotos - missingCap;

  return (
    <>
      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Total photos"
          value={totalPhotos}
          sub={hiddenPhotos > 0 ? `${hiddenPhotos} hidden` : undefined}
        />
        <StatCard
          label="With captions"
          value={hasCaptions}
          sub={`${missingCap} missing`}
        />
        <StatCard label="Unique tags" value={uniqueTags} />
        <StatCard
          label="Coverage"
          value={
            totalPhotos
              ? `${Math.round((hasCaptions / totalPhotos) * 100)}%`
              : "—"
          }
          sub="captioned"
        />
      </div>

      {/* ── Sort & filter bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500"
        >
          <option value="date-desc">Date ↓ newest</option>
          <option value="date-asc">Date ↑ oldest</option>
          <option value="title-asc">Title A → Z</option>
          <option value="title-desc">Title Z → A</option>
        </select>

        {/* Visibility filter */}
        <div className="flex rounded-lg overflow-hidden border border-slate-700 text-sm">
          {(["all", "visible", "hidden"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilterVisibility(v)}
              className={`px-3 py-1.5 capitalize transition-colors ${filterVisibility === v ? "bg-slate-600 text-slate-100" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Caption filter */}
        <button
          onClick={() =>
            setFilterCaption(filterCaption === "all" ? "missing" : "all")
          }
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${filterCaption === "missing" ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
        >
          No caption
        </button>

        {/* Tag search */}
        <input
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          placeholder="Filter by tag…"
          className="text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500 w-36"
        />

        {/* Result count */}
        <span className="text-xs text-slate-600 ml-1">
          {photos.length}
          {photos.length !== allPhotos.length
            ? ` / ${allPhotos.length}`
            : ""}{" "}
          photo{photos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Photo grid ─────────────────────────────────────────────────────── */}
      {photos.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          {allPhotos.length === 0
            ? "No photos found in Sanity."
            : "No photos match the current filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo._id}
              onClick={() => onEdit(photo)}
              className={`bg-slate-900 border rounded-xl overflow-hidden flex flex-col transition-colors cursor-pointer hover:border-slate-600 ${
                selectedIds.has(photo._id)
                  ? "border-sky-500 ring-1 ring-sky-500/50"
                  : photo.visible
                    ? "border-slate-800"
                    : "border-slate-700/50 opacity-60"
              }`}
            >
              {/* Image — object-contain so the full photo is always visible */}
              <div className="relative aspect-square bg-slate-950">
                <Image
                  src={`${photo.src}?w=800&fm=jpg`}
                  alt={photo.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1280px) 33vw, 400px"
                  unoptimized
                />
                {/* Selection checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectId(photo._id);
                  }}
                  className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedIds.has(photo._id)
                      ? "bg-sky-500 border-sky-500"
                      : "bg-black/40 border-slate-400 hover:border-sky-400"
                  }`}
                >
                  {selectedIds.has(photo._id) && (
                    <svg
                      className="w-3 h-3 text-black"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </button>
                {!photo.visible && (
                  <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-slate-400 text-xs px-1.5 py-0.5 rounded">
                    Hidden
                  </span>
                )}
                {feedback?.id === photo._id && (
                  <span className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 bg-sky-500/20 backdrop-blur-sm text-sky-400 text-xs px-2 py-1 rounded">
                    <span>{feedback.msg}</span>
                    {feedback.detail && onShowErrorDetail && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowErrorDetail(feedback.msg, feedback.detail!);
                        }}
                        className="underline hover:text-sky-300 transition-colors shrink-0"
                      >
                        Details
                      </button>
                    )}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="px-3 pt-2.5 pb-1 flex-1">
                <p className="text-slate-200 text-sm font-medium truncate">
                  {photo.title}
                </p>
                <p className="text-slate-500 text-xs mt-0.5 line-clamp-2 leading-relaxed">
                  {photo.aiCaption || (
                    <span className="italic text-slate-600">No caption</span>
                  )}
                </p>
                {photo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {photo.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500/80"
                      >
                        {tag}
                      </span>
                    ))}
                    {photo.tags.length > 4 && (
                      <span className="text-xs text-slate-600">
                        +{photo.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action bar — stop propagation so these don't open the edit modal */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="border-t border-slate-800 mt-2 px-3 py-2 flex items-center justify-between"
              >
                {/* Left: visibility + reupload + caption */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggleVisibility(photo._id)}
                    title={
                      photo.visible ? "Hide from gallery" : "Show in gallery"
                    }
                    className={`transition-colors ${photo.visible ? "text-slate-500 hover:text-slate-300" : "text-slate-600 hover:text-sky-400"}`}
                  >
                    {photo.visible ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => onReupload(photo._id)}
                    disabled={reuploadingId === photo._id}
                    title="Replace image file"
                    className="text-slate-500 hover:text-sky-400 disabled:opacity-40 transition-colors"
                  >
                    {reuploadingId === photo._id ? (
                      <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                        />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      onRegenerateCaption(photo._id, photo.imageRef)
                    }
                    disabled={captionIds.has(photo._id)}
                    title="Regenerate caption with AI"
                    className="text-slate-500 hover:text-sky-400 disabled:opacity-40 transition-colors"
                  >
                    {captionIds.has(photo._id) ? (
                      <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Right: edit + delete */}
                <div className="flex items-center gap-2">
                  {confirmDeleteId === photo._id ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => onDelete(photo._id)}
                        disabled={!!deletingId}
                        title="Confirm delete"
                        className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-40"
                      >
                        {deletingId === photo._id ? (
                          <span className="inline-block w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "Delete?"
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        title="Cancel"
                        className="text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(photo._id)}
                      title="Delete photo"
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
