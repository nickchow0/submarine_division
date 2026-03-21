"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

  return <>{children}</>;
}
