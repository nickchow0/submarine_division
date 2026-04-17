"use client";

// ─── PhotoModal ───────────────────────────────────────────────────────────────
// Full-screen photo viewer overlay used by the Portfolio component.
// No Next.js navigation — the portfolio stays mounted in the background.

import { useEffect } from "react";
import Image from "next/image";
import type { Photo } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { formatCamera } from "@/lib/exif";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/components/icons";

type Props = {
  photo: Photo;
  prevId: string | null;
  nextId: string | null;
  prefetchPhotos?: Photo[];
  onClose: () => void;
  onNavigate: (id: string) => void;
  showCaptions?: boolean;
};

export default function PhotoModal({
  photo,
  prevId,
  nextId,
  prefetchPhotos = [],
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

  useEffect(() => {
    trackEvent("photo_view", {
      photo_id: photo._id,
      photo_title: photo.title,
      location: photo.location ?? null,
    });
  }, [photo]);

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
      className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-2 sm:p-6 md:p-10"
      onClick={onClose}
    >
      {/* Hidden prefetch images for the next 3 photos */}
      {prefetchPhotos.map((p) => (
        <div
          key={`pf-${p._id}`}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            aspectRatio: `${p.width} / ${p.height}`,
            maxHeight: "calc(90dvh - 240px)",
            width: `min(100%, calc(${(p.width / p.height).toFixed(6)} * (90dvh - 150px)))`,
            visibility: "hidden",
            pointerEvents: "none",
          }}
        >
          <Image
            src={p.src}
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 95vw, (max-width: 1024px) 85vw, 880px"
          />
        </div>
      ))}

      {/* Modal panel */}
      <div
        className="relative bg-[#000000] rounded-xl w-full max-w-5xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar: prev / next + close ── */}
        <div className="shrink-0 flex items-center justify-between px-2 pt-2 pb-1">
          <div className="flex items-center">
            {prevId ? (
              <button
                onClick={() => onNavigate(prevId)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            ) : (
              <span className="p-2 text-slate-700">
                <ChevronLeftIcon className="w-5 h-5" />
              </span>
            )}
            {nextId ? (
              <button
                onClick={() => onNavigate(nextId)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                aria-label="Next photo"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            ) : (
              <span className="p-2 text-slate-700">
                <ChevronRightIcon className="w-5 h-5" />
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-colors"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ── Photo ── */}
        <div className="flex-1 min-h-0 flex items-center justify-center px-4 pt-2 pb-3 sm:px-8 sm:pb-8">
          {/* Aspect-ratio wrapper reserves the exact photo space before the image
              loads so the modal never jumps in size. Width is the smaller of
              (a) the available flex width and (b) the width implied by maxHeight
              × the photo's aspect ratio — whichever constraint binds first. */}
          <div
            key={photo._id}
            className="relative overflow-hidden photo-fade-in bg-slate-900"
            style={{
              aspectRatio: `${photo.width} / ${photo.height}`,
              maxHeight: "calc(90dvh - 240px)",
              width: `min(100%, calc(${(photo.width / photo.height).toFixed(6)} * (90dvh - 240px)))`,
            }}
          >
            <Image
              src={photo.src}
              alt={photo.title}
              fill
              // Modal panel is max-w-5xl (1024px) with px-8 padding each side,
              // so the photo is at most ~880px on large screens.
              sizes="(max-width: 640px) 95vw, (max-width: 1024px) 85vw, 880px"
              quality={90}
              className="object-contain"
              placeholder={photo.blurDataURL ? "blur" : "empty"}
              blurDataURL={photo.blurDataURL ?? undefined}
              priority
            />
          </div>
        </div>

        {/* ── Metadata strip (bottom) ── */}
        <div
          className="shrink-0 px-4 sm:px-7 pb-4 sm:pb-6 pt-3 sm:pt-4 space-y-2.5 overflow-y-auto max-h-[35vmin] sm:max-h-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Caption */}
          {showCaptions && photo.aiCaption && (
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              {photo.aiCaption}
            </p>
          )}

          {/* Tags */}
          {photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {photo.tags.map((tag) => (
                <span
                  key={tag}
                  className="tag-badge"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Location / date */}
          {(photo.location || photo.dateTaken) && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs sm:text-sm text-slate-500">
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
                  })}
                </span>
              )}
            </div>
          )}

          {/* EXIF */}
          {hasExif && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs sm:text-sm text-slate-500 border-t border-slate-800 pt-2.5">
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
                  {formatCamera(photo.camera)}
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
