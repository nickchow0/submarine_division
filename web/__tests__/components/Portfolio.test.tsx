// web/__tests__/components/Portfolio.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { Photo } from "@/types";
import React from "react";

// Mock next/image — renders a plain <img> in jsdom
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement("img", { src, alt }),
}));

// Mock next/link — renders a plain <a> in jsdom
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...rest }, children),
}));

// Mock PhotoModal — prevents jsdom failures from its transitive dependencies
vi.mock("@/components/PhotoModal", () => ({
  default: () => null,
}));

// Import Portfolio AFTER mocks are registered
import Portfolio from "@/components/Portfolio";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    _id: "photo-1",
    title: "Test Photo",
    tags: [],
    aiCaption: "",
    location: null,
    camera: null,
    dateTaken: null,
    lens: null,
    focalLength: null,
    iso: null,
    shutterSpeed: null,
    aperture: null,
    visible: true,
    src: "https://cdn.sanity.io/images/abc/production/test.jpg",
    width: 800,
    height: 600,
    blurDataURL: null,
    ...overrides,
  };
}

const PHOTOS: Photo[] = [
  makePhoto({ _id: "1", title: "Hammerhead Shark", tags: ["shark"] }),
  makePhoto({ _id: "2", title: "Manta Ray", tags: ["ray"] }),
  makePhoto({ _id: "3", title: "Coral Garden", tags: ["coral"] }),
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Portfolio", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Portfolio calls Object.getPrototypeOf(window.history).pushState directly.
    // Spy on the History prototype to prevent jsdom navigation errors.
    vi.spyOn(
      Object.getPrototypeOf(window.history),
      "pushState",
    ).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders all photos initially", () => {
    render(<Portfolio photos={PHOTOS} />);
    expect(screen.getByAltText("Hammerhead Shark")).toBeInTheDocument();
    expect(screen.getByAltText("Manta Ray")).toBeInTheDocument();
    expect(screen.getByAltText("Coral Garden")).toBeInTheDocument();
  });

  it("filters photos by search query after the 150ms debounce", () => {
    render(<Portfolio photos={PHOTOS} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "hammerhead" } });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByAltText("Hammerhead Shark")).toBeInTheDocument();
    expect(screen.queryByAltText("Manta Ray")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Coral Garden")).not.toBeInTheDocument();
  });

  it('shows the "no results" message when the query matches nothing', () => {
    render(<Portfolio photos={PHOTOS} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "zzznomatch" } });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByText(/no photos match/i)).toBeInTheDocument();
  });

  it("filters photos by tag when a tag is clicked", () => {
    render(<Portfolio photos={PHOTOS} />);

    fireEvent.click(screen.getByRole("button", { name: "coral" }));

    expect(screen.getByAltText("Coral Garden")).toBeInTheDocument();
    expect(screen.queryByAltText("Hammerhead Shark")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Manta Ray")).not.toBeInTheDocument();
  });

  it('restores all photos when "Clear filters" is clicked', () => {
    render(<Portfolio photos={PHOTOS} />);

    // Trigger no-results state
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "zzznomatch" } });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    fireEvent.click(screen.getByText(/clear filters/i));

    expect(screen.getByAltText("Hammerhead Shark")).toBeInTheDocument();
    expect(screen.getByAltText("Manta Ray")).toBeInTheDocument();
    expect(screen.getByAltText("Coral Garden")).toBeInTheDocument();
  });
});
