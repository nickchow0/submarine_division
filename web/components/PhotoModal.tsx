"use client";

// ─── PhotoModal ───────────────────────────────────────────────────────────────
// Full-screen photo viewer overlay used by the Portfolio component.
// No Next.js navigation — the portfolio stays mounted in the background.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { formatCamera } from "@/lib/exif";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/components/icons";

// Set to true by swipe navigation before onNavigate fires; read during
// CurrentPhotoFrame's render to suppress the fade-in animation for swipes.
let pendingSwipeNav = false;

const VERTICAL_CONSTRAINT = "calc(90svh - 240px)";

// Renders the current photo with a CSS size transition.
// The `photo-frame` class enables width/aspect-ratio transitions.
// The `photo-frame-instant` class overrides to transition:none during swipe —
// both the class change and the new dimensions land in the same React commit,
// so the browser never has a chance to start the transition.
// CSS transitions don't fire on initial mount (no old value to animate from),
// so the frame never animates when the modal first opens.
function CurrentPhotoFrame({ photo }: { photo: Photo }) {
  const ratio = photo.width / photo.height;
  // Read synchronously during render — plain module variable, not a React ref
  const isSwipe = pendingSwipeNav;
  const fadeIn = !isSwipe;

  useEffect(() => {
    pendingSwipeNav = false;
  }, [photo._id]);

  return (
    <div
      className={`photo-frame relative overflow-hidden bg-black shadow-2xl${isSwipe ? " photo-frame-instant" : ""}`}
      style={{
        width: `calc(${ratio.toFixed(6)} * ${VERTICAL_CONSTRAINT})`,
        maxWidth: "100%",
        aspectRatio: `${photo.width} / ${photo.height}`,
        maxHeight: VERTICAL_CONSTRAINT,
      }}
    >
      {/* Keyed by photo ID so photo-fade-in re-triggers on every navigation */}
      <div key={photo._id} className={`absolute inset-0 ${fadeIn ? "photo-fade-in" : ""}`}>
        <Image
          src={photo.src}
          alt={photo.title}
          fill
          sizes="(max-width: 640px) 95vw, (max-width: 1024px) 85vw, 880px"
          className="object-contain"
          priority
          placeholder="empty"
        />
      </div>
    </div>
  );
}

type Props = {
  photo: Photo;
  prevPhoto?: Photo | null;
  nextPhoto?: Photo | null;
  prefetchPhotos?: Photo[];
  onClose: () => void;
  onNavigate: (id: string) => void;
  showCaptions?: boolean;
};

export default function PhotoModal({
  photo,
  prevPhoto,
  nextPhoto,
  prefetchPhotos = [],
  onClose,
  onNavigate,
  showCaptions = false,
}: Props) {
  const [isNavigatingByButton, setIsNavigatingByButton] = useState(false);
  const [isNavigatingBySwipe, setIsNavigatingBySwipe] = useState(false);

  const prevId = prevPhoto?._id ?? null;
  const nextId = nextPhoto?._id ?? null;

  const handleButtonNavigate = (id: string) => {
    setIsNavigatingByButton(true);
    onNavigate(id);
    // Duration matches the new slow transition
    setTimeout(() => setIsNavigatingByButton(false), 1200);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && prevId) handleButtonNavigate(prevId);
      if (e.key === "ArrowRight" && nextId) handleButtonNavigate(nextId);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prevId, nextId]);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    trackEvent("photo_view", {
      photo_id: photo._id,
      photo_title: photo.title,
      location: photo.location ?? null,
    });
  }, [photo]);

  const touchStartX = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsAnimating(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    setSwipeOffset(
      (delta > 0 && !prevId) || (delta < 0 && !nextId) ? delta * 0.2 : delta,
    );
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    const containerWidth = trackRef.current?.offsetWidth ?? window.innerWidth;

    const navigate = (id: string, direction: number) => {
      setIsNavigatingBySwipe(true);
      setIsAnimating(true);
      setSwipeOffset(direction * containerWidth);
      setTimeout(() => {
        setIsAnimating(false);
        setSwipeOffset(0);
        setIsNavigatingBySwipe(false);
        pendingSwipeNav = true;
        onNavigate(id);
      }, 350); // Match track transition duration
    };

    if (delta > 50 && prevId) {
      navigate(prevId, 1);
    } else if (delta < -50 && nextId) {
      navigate(nextId, -1);
    } else {
      setIsAnimating(true);
      setSwipeOffset(0);
      setTimeout(() => setIsAnimating(false), 200);
    }
  };

  const hasExif =
    photo.camera ||
    photo.lens ||
    photo.focalLength ||
    photo.aperture ||
    photo.shutterSpeed ||
    photo.iso;

  // Renders a peek (prev/next) photo frame — no size transition needed.
  const renderPeekPhoto = (p: Photo, stableKey: string) => {
    const ratio = p.width / p.height;
    return (
      <div
        key={stableKey}
        className="relative overflow-hidden bg-black shadow-2xl"
        style={{
          width: `calc(${ratio.toFixed(6)} * ${VERTICAL_CONSTRAINT})`,
          maxWidth: "100%",
          aspectRatio: `${p.width} / ${p.height}`,
          maxHeight: VERTICAL_CONSTRAINT,
          transition: "opacity 0.2s ease-out",
        }}
      >
        <Image
          src={p.src}
          alt={p.title}
          fill
          sizes="(max-width: 640px) 95vw, (max-width: 1024px) 85vw, 880px"
          className="object-contain"
          placeholder="empty"
        />
      </div>
    );
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[2000] bg-black flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
            width: `calc(${(p.width / p.height).toFixed(6)} * (90dvh - 240px))`,
            maxWidth: "100%",
            aspectRatio: `${p.width} / ${p.height}`,
            maxHeight: "calc(90dvh - 240px)",
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
        className="relative bg-[#000000] w-full h-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar: prev / next + close ── */}
        <div className="shrink-0 flex items-center justify-between px-2 pt-2 pb-1">
          <div className="flex items-center">
            {prevId ? (
              <button
                onClick={() => handleButtonNavigate(prevId)}
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
                onClick={() => handleButtonNavigate(nextId)}
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
        <div className="flex-1 min-h-0 relative overflow-hidden flex items-center">
          {/* Sliding Track */}
          <div
            ref={trackRef}
            className="w-full relative overflow-visible"
            style={{
              transform: swipeOffset
                ? `translateX(${swipeOffset}px)`
                : undefined,
              transition: isAnimating
                ? "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                : "none",
            }}
          >
            {/* Previous Photo (Peek) */}
            {prevPhoto && (
              <div
                className="absolute inset-0 flex items-center justify-center -translate-x-full px-4 sm:px-8 py-4"
                aria-hidden="true"
              >
                {renderPeekPhoto(prevPhoto, "prev-photo")}
              </div>
            )}

            {/* Current Photo */}
            <div className="relative flex items-center justify-center px-4 sm:px-8 py-4">
              <CurrentPhotoFrame photo={photo} />
            </div>

            {/* Next Photo (Peek) */}
            {nextPhoto && (
              <div
                className="absolute inset-0 flex items-center justify-center translate-x-full px-4 sm:px-8 py-4"
                aria-hidden="true"
              >
                {renderPeekPhoto(nextPhoto, "next-photo")}
              </div>
            )}
          </div>
        </div>

        {/* ── Metadata strip (bottom) ── */}
        <div
          className="shrink-0 px-4 sm:px-7 pb-4 sm:pb-6 pt-3 sm:pt-4 space-y-2.5 overflow-y-auto max-h-[45vh] sm:max-h-none"
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
                <span key={tag} className="tag-badge !text-[12px]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Location / date */}
          {(photo.location || photo.dateTaken) && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs sm:text-sm text-slate-500">
              {photo.location && (
                <span className="flex items-center gap-1.5 whitespace-nowrap">
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
                <span className="whitespace-nowrap">
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
            <details className="border-t border-slate-800 pt-2.5 group">
              <summary className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 cursor-pointer select-none list-none hover:text-slate-300 transition-colors">
                <svg
                  className="w-3.5 h-3.5 shrink-0 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
                Photo details
              </summary>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs sm:text-sm text-slate-500 mt-2">
                {photo.camera && (
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
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
                {photo.lens && (
                  <span className="whitespace-nowrap">{photo.lens}</span>
                )}
                {photo.focalLength && (
                  <span className="whitespace-nowrap">{photo.focalLength}</span>
                )}
                {photo.aperture && (
                  <span className="whitespace-nowrap">{photo.aperture}</span>
                )}
                {photo.shutterSpeed && (
                  <span className="whitespace-nowrap">
                    {photo.shutterSpeed}s
                  </span>
                )}
                {photo.iso && (
                  <span className="whitespace-nowrap">ISO {photo.iso}</span>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
