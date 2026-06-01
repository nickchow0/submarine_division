"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { Photo } from "@/types";

const INACTIVITY_MS = 60_000;
const SLIDE_INTERVAL_MS = 5_000;
const FADE_OUT_MS = 600;

export default function Screensaver({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => setActive(false), []);

  // Inactivity timer — reset on any user interaction.
  // Index and visible are set inside the timeout callback (not synchronously
  // in the effect body) to avoid cascading renders.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const activate = () => {
      setIndex(Math.floor(Math.random() * photos.length));
      setVisible(false);
      setActive(true);
    };

    const reset = () => {
      clearTimeout(timeout);
      if (active) setActive(false);
      timeout = setTimeout(activate, INACTIVITY_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    timeout = setTimeout(activate, INACTIVITY_MS);

    return () => {
      clearTimeout(timeout);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [active, photos.length]);

  // Advance slide every SLIDE_INTERVAL_MS while active
  useEffect(() => {
    if (!active || photos.length === 0) return;

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % photos.length);
      }, FADE_OUT_MS);
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [active, photos.length]);

  if (!active || photos.length === 0) return null;

  const photo = photos[index];

  return (
    <div
      className="fixed inset-0 z-50 bg-black cursor-pointer"
      onClick={dismiss}
      onKeyDown={dismiss}
      onTouchStart={(e) => e.nativeEvent.stopImmediatePropagation()}
      onTouchEnd={(e) => { e.preventDefault(); dismiss(); }}
    >
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <Image
          key={photo._id}
          src={`${photo.src}?w=1920&q=80&fm=jpg&auto=format`}
          alt={photo.title}
          fill
          className="object-contain"
          unoptimized
          priority
          onLoad={() => setVisible(true)}
        />
      </div>
    </div>
  );
}
