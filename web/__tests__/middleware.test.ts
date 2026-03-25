// @vitest-environment node
// Tests the middleware's requirePassword bypass behavior.
// Uses vi.resetModules() before each test to clear the module-level Sanity cache.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

function makeRequest(path: string, cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  });
}

function mockSanityFetch(requirePassword: boolean) {
  return vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ result: { requirePassword } }),
  } as Response);
}

describe("middleware – requirePassword bypass", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules(); // clears the module-level Sanity cache between tests
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("redirects to /password when no cookie and requirePassword is true", async () => {
    mockSanityFetch(true);
    const { middleware } = await import("@/middleware");
    const response = await middleware(makeRequest("/portfolio"));
    expect(response.headers.get("location")).toContain("/password");
  });

  it("allows through when no cookie and requirePassword is false", async () => {
    mockSanityFetch(false);
    const { middleware } = await import("@/middleware");
    const response = await middleware(makeRequest("/portfolio"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not fetch Sanity when site_access cookie is already set", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const { middleware } = await import("@/middleware");
    const response = await middleware(
      makeRequest("/portfolio", { site_access: "granted" }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });

  it("caches the Sanity result and does not re-fetch within the 60s TTL", async () => {
    const fetchSpy = mockSanityFetch(true);
    const { middleware } = await import("@/middleware");

    // Two requests — Sanity should only be called once (second hits cache)
    await middleware(makeRequest("/portfolio"));
    await middleware(makeRequest("/portfolio"));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after the 60s cache TTL expires", async () => {
    const fetchSpy = mockSanityFetch(true);
    const { middleware } = await import("@/middleware");

    await middleware(makeRequest("/portfolio"));
    vi.advanceTimersByTime(61_000); // expire the cache
    await middleware(makeRequest("/portfolio"));

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("defaults to requiring password when the Sanity fetch fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));
    const { middleware } = await import("@/middleware");
    const response = await middleware(makeRequest("/portfolio"));
    expect(response.headers.get("location")).toContain("/password");
  });

  it("always allows the /password page through without any fetch", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const { middleware } = await import("@/middleware");
    const response = await middleware(makeRequest("/password"));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });
});
