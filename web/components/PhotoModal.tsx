"use client";

// ─── PhotoModal ───────────────────────────────────────────────────────────────
// Full-screen photo viewer overlay used by the Gallery component.
// No Next.js navigation — the gallery stays mounted in the background.

import { useEffect } from "react";
import Image from "next/image";
import type { Photo } from "@/types";

type Props = {
  photo: Photo;
  prevId: string | null;
  nextId: string | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
  showCaptions?: boolean;
};

export default function PhotoModal({
  photo,
  prevId,
  nextId,
  onClose,
  onNavigate,
  showCaptions = false,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && prevId) onNavigate(prevId);
      if (e.key === "ArrowRight" && nextId) onNavigate(nextId);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNavigate, prevId, nextId]);

  const hasExif =
    photo.camera ||
    photo.lens ||
    photo.focalLength ||
    photo.aperture ||
    photo.shutterSpeed ||
    photo.iso;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 md:p-10"
      onClick={onClose}
    >
      {/* Prev arrow — outside the panel, floating over backdrop */}
      {prevId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(prevId);
          }}
          className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-2 z-10"
          aria-label="Previous photo"
        >
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      )}

      {/* Next arrow — outside the panel, floating over backdrop */}
      {nextId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(nextId);
          }}
          className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-2 z-10"
          aria-label="Next photo"
        >
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      )}

      {/* Modal panel */}
      <div
        className="relative bg-[#000000] rounded-xl w-full max-w-5xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Close button ── */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-4 z-10 text-slate-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* ── Photo ── */}
        <div className="flex-1 min-h-0 flex items-center justify-center px-8 pt-12 pb-8">
          <Image
            key={photo._id}
            src={photo.src}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
            // Modal panel is max-w-5xl (1024px) with px-8 padding each side,
            // so the photo is at most ~880px on large screens.
            sizes="(max-width: 640px) 95vw, (max-width: 1024px) 85vw, 880px"
            quality={90}
            className="object-contain max-w-full max-h-full rounded photo-fade-in"
            style={{ maxHeight: "calc(90dvh - 300px)" }}
            placeholder={photo.blurDataURL ? "blur" : "empty"}
            blurDataURL={photo.blurDataURL ?? undefined}
            priority
          />
        </div>

        {/* ── Metadata strip (bottom) ── */}
        <div
          className="shrink-0 px-7 pb-6 pt-4 space-y-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Caption */}
          {showCaptions && photo.aiCaption && (
            <p className="text-slate-400 text-sm leading-relaxed">
              {photo.aiCaption}
            </p>
          )}

          {/* Tags */}
          {photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {photo.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Location / date */}
          {(photo.location || photo.dateTaken) && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
              {photo.location && (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                  {photo.location}
                </span>
              )}
              {photo.dateTaken && (
                <span>
                  {new Date(photo.dateTaken).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          )}

          {/* EXIF */}
          {hasExif && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500 border-t border-slate-800 pt-2.5">
              {photo.camera && (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                    />
                  </svg>
                  {photo.camera}
                </span>
              )}
              {photo.lens && <span>{photo.lens}</span>}
              {photo.focalLength && <span>{photo.focalLength}</span>}
              {photo.aperture && <span>{photo.aperture}</span>}
              {photo.shutterSpeed && <span>{photo.shutterSpeed}s</span>}
              {photo.iso && <span>ISO {photo.iso}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
