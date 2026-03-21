"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { Photo } from "@/types";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

type Props = {
  photos: Photo[];
  /** Time in ms between auto-advances (default 5000) */
  interval?: number;
};

export default function Carousel({ photos, interval = 5000 }: Props) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Auto-advance
  useEffect(() => {
    if (isPaused || photos.length <= 1) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [isPaused, next, interval, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  if (photos.length === 0) return null;

  const photo = photos[current];

  return (
    <div
      className="relative w-full h-[70vh] overflow-hidden bg-black flex items-center justify-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Image — aspect-ratio wrapper so fade-in covers only the photo area */}
      <div
        key={photo._id}
        className="relative photo-fade-in"
        style={{
          aspectRatio: `${photo.width} / ${photo.height}`,
          maxHeight: "70vh",
          width: `min(100%, calc(${(photo.width / photo.height).toFixed(6)} * 70vh))`,
        }}
      >
        <Image
          src={photo.src}
          alt={photo.title}
          fill
          className="object-contain"
          placeholder={photo.blurDataURL ? "blur" : "empty"}
          blurDataURL={photo.blurDataURL ?? undefined}
          priority={current === 0}
          // The rendered width is min(100vw, aspectRatio × 70vh) — portrait
          // photos are narrower than the viewport so we tell the browser the
          // true width so it doesn't over-fetch.
          sizes={`(max-width: 768px) min(100vw, calc(${(photo.width / photo.height).toFixed(4)} * 70vh)), min(100vw, calc(${(photo.width / photo.height).toFixed(4)} * 70vh))`}
        />
      </div>

      {/* Hidden prefetch images for all non-current photos */}
      {photos.map((p, i) => {
        if (i === current) return null;
        return (
          <div
            key={`pf-${p._id}`}
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              aspectRatio: `${p.width} / ${p.height}`,
              maxHeight: "70vh",
              width: `min(100%, calc(${(p.width / p.height).toFixed(6)} * 70vh))`,
              visibility: "hidden",
              pointerEvents: "none",
            }}
          >
            <Image
              src={p.src}
              alt=""
              fill
              priority
              sizes={`(max-width: 768px) min(100vw, calc(${(p.width / p.height).toFixed(4)} * 70vh)), min(100vw, calc(${(p.width / p.height).toFixed(4)} * 70vh))`}
            />
          </div>
        );
      })}

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        aria-label="Previous photo"
      >
        <ChevronLeftIcon className="w-6 h-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        aria-label="Next photo"
      >
        <ChevronRightIcon className="w-6 h-6" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === current ? "bg-sky-400" : "bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Go to photo ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
