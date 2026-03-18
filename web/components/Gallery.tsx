"use client";

// ─── Gallery ──────────────────────────────────────────────────────────────────
// Handles search, tag filtering, and the photo modal.
//
// When a photo is clicked we use window.history.pushState to update the URL to
// /photo/[id] WITHOUT triggering a Next.js navigation — so the gallery page
// stays completely mounted in the background and the modal overlays it.
//
// Visiting /photo/[id] directly (shared link, hard navigation) bypasses this
// component entirely and shows the full dedicated photo page instead.

import { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Fuse from "fuse.js";
import type { Photo } from "@/types";
import { buildSearchIndex, searchPhotos } from "@/lib/search";
import { trackEvent } from "@/lib/analytics";
import SearchBar from "./SearchBar";
import TagFilter from "./TagFilter";
import PhotoModal from "./PhotoModal";

export default function Gallery({
  photos,
  showCaptions = false,
}: {
  photos: Photo[];
  showCaptions?: boolean;
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Search index ───────────────────────────────────────────────────────────
  const fuseIndex = useMemo<Fuse<Photo>>(
    () => buildSearchIndex(photos),
    [photos],
  );

  // ── All unique tags ────────────────────────────────────────────────────────
  const allTags = useMemo(
    () => [...new Set(photos.flatMap((p) => p.tags))].sort(),
    [photos],
  );

  // ── Derived: visible photos after search + tag filter ─────────────────────
  const visiblePhotos = useMemo(() => {
    let results = query.trim() ? searchPhotos(fuseIndex, query) : photos;
    if (activeTag) results = results.filter((p) => p.tags.includes(activeTag));
    return results;
  }, [query, activeTag, fuseIndex, photos]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const selectedPhoto = useMemo(
    () => photos.find((p) => p._id === selectedId) ?? null,
    [photos, selectedId],
  );

  // Derive prev/next from the filtered list so modal arrows stay within
  // whatever search/tag filter is currently active.
  const selectedIndex = useMemo(
    () => visiblePhotos.findIndex((p) => p._id === selectedId),
    [visiblePhotos, selectedId],
  );
  const prevId = selectedIndex > 0 ? visiblePhotos[selectedIndex - 1]._id : null;
  const nextId =
    selectedIndex < visiblePhotos.length - 1 ? visiblePhotos[selectedIndex + 1]._id : null;

  // Next.js patches window.history.pushState on the instance, which means
  // calling it normally triggers a Next.js navigation. The original browser
  // implementation lives on the prototype and is unaffected — we call that
  // directly to update the address bar URL without any routing side-effects.
  const nativePush = useCallback((url: string) => {
    Object.getPrototypeOf(window.history).pushState.call(
      window.history,
      null,
      "",
      url,
    );
  }, []);

  // Open modal: update URL without triggering Next.js navigation
  const openModal = useCallback(
    (id: string) => {
      setSelectedId(id);
      nativePush(`/photo/${id}`);
    },
    [nativePush],
  );

  // Close modal: restore gallery URL
  const closeModal = useCallback(() => {
    setSelectedId(null);
    nativePush("/gallery");
  }, [nativePush]);

  // Navigate within modal: update URL to the new photo
  const navigateModal = useCallback(
    (id: string) => {
      setSelectedId(id);
      nativePush(`/photo/${id}`);
    },
    [nativePush],
  );

  // Sync with browser back / forward buttons
  useEffect(() => {
    const handlePopstate = () => {
      const match = window.location.pathname.match(/^\/photo\/(.+)$/);
      setSelectedId(match ? match[1] : null);
    };
    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, []);

  // ── Search handlers ────────────────────────────────────────────────────────
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setActiveTag(null);
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
    setQuery("");
  }, []);

  // Fire gallery_search 500ms after the user stops typing.
  // Only [query] is in the dep array so the debounce resets only when the
  // query changes — not when the result count shifts. visiblePhotos.length is
  // captured inside the closure and will be current when the timer fires.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      trackEvent("gallery_search", {
        search_term: trimmed,
        result_count: visiblePhotos.length,
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Fire tag_filter when a tag is selected
  useEffect(() => {
    if (!activeTag) return;
    trackEvent("tag_filter", { tag_name: activeTag });
  }, [activeTag]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Masonry grid */}
      {visiblePhotos.length > 0 ? (
        <div className="columns-1 sm:columns-2 xl:columns-3 gap-3 p-4 max-w-7xl mx-auto">
          {visiblePhotos.map((photo) => (
            <PhotoCard key={photo._id} photo={photo} onOpen={openModal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-slate-500">
          <p className="text-lg">No photos match your search.</p>
          <button
            onClick={() => {
              setQuery("");
              setActiveTag(null);
            }}
            className="mt-3 text-sky-500 hover:text-sky-400 text-sm underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Photo modal — rendered over the gallery, no page navigation */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          prevId={prevId}
          nextId={nextId}
          onClose={closeModal}
          onNavigate={navigateModal}
          showCaptions={showCaptions}
        />
      )}
      {/* Search + tag filter */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm py-4 space-y-3">
        <SearchBar
          onSearch={handleSearch}
          resultCount={visiblePhotos.length}
          totalCount={photos.length}
        />
        <TagFilter
          tags={allTags}
          activeTag={activeTag}
          onTagClick={handleTagClick}
        />
      </div>
    </>
  );
}

// ── PhotoCard ─────────────────────────────────────────────────────────────────

type CardProps = { photo: Photo; onOpen: (id: string) => void };

function PhotoCard({ photo, onOpen }: CardProps) {
  return (
    <div className="break-inside-avoid mb-3 group">
      <div
        className="overflow-hidden bg-slate-900 cursor-pointer"
        onClick={() => onOpen(photo._id)}
      >
        <div className="relative overflow-hidden">
          <Image
            src={photo.src}
            alt={photo.title}
            width={photo.width}
            height={photo.height}
            // Gallery is 1 col on mobile, 2 on sm, 3 on xl.
            // These sizes tell the browser the rendered width so it picks the
            // right srcset entry — mobile gets ~400px, desktop gets ~600px.
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            quality={75}
            className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105"
            placeholder={photo.blurDataURL ? "blur" : "empty"}
            blurDataURL={photo.blurDataURL ?? undefined}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
