"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Module-level: survives client-side navigation, cleared on arrival
let pendingEnterDir: "left" | "right" | null = null;
import type { Photo } from "@/types";
import { trackEvent } from "@/lib/analytics";

type Props = {
  photo: Photo;
  prevId: string | null;
  nextId: string | null;
  children: React.ReactNode;
};

export default function PhotoPageClient({
  photo,
  prevId,
  nextId,
  children,
}: Props) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [enterClass, setEnterClass] = useState("");

  // Apply slide-in if this page was reached via a swipe
  useEffect(() => {
    if (pendingEnterDir) {
      const cls =
        pendingEnterDir === "right"
          ? "photo-slide-from-right"
          : "photo-slide-from-left";
      setEnterClass(cls);
      pendingEnterDir = null;
      setTimeout(() => setEnterClass(""), 350);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && prevId) {
        router.push(`/photo/${prevId}`);
      } else if (e.key === "ArrowRight" && nextId) {
        router.push(`/photo/${nextId}`);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prevId, nextId, router]);

  useEffect(() => {
    let startX: number | null = null;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      setIsAnimating(false);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startX === null) return;
      const delta = e.touches[0].clientX - startX;
      setOffset(
        (delta > 0 && !prevId) || (delta < 0 && !nextId)
          ? delta * 0.2
          : delta
      );
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (startX === null) return;
      const delta = e.changedTouches[0].clientX - startX;
      startX = null;
      setIsAnimating(true);

      if (delta > 50 && prevId) {
        pendingEnterDir = "left"; // arriving page slides in from the left
        setOffset(window.innerWidth);
        setTimeout(() => router.push(`/photo/${prevId}`), 200);
      } else if (delta < -50 && nextId) {
        pendingEnterDir = "right"; // arriving page slides in from the right
        setOffset(-window.innerWidth);
        setTimeout(() => router.push(`/photo/${nextId}`), 200);
      } else {
        setOffset(0);
        setTimeout(() => setIsAnimating(false), 200);
      }
    };

    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [prevId, nextId, router]);

  // Fires only on mount — the prop never changes while this component is
  // mounted (navigating to a new /photo/[id] causes a full remount).
  useEffect(() => {
    trackEvent("photo_view", {
      photo_id: photo._id,
      photo_title: photo.title,
      location: photo.location ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={enterClass}
      style={{
        transform: offset ? `translateX(${offset}px)` : undefined,
        transition: isAnimating ? "transform 0.2s ease-out" : undefined,
      }}
    >
      {children}
    </div>
  );
}
