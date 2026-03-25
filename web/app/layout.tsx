// ─── Root Layout ──────────────────────────────────────────────────────────────
// This wraps every page in the app. Anything you put here (nav, footer,
// fonts, metadata) appears on every page automatically.
//
// This is a Server Component (no 'use client') — it renders on the server
// and streams HTML to the browser.

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import Script from "next/script";
import "./globals.css";
import ImageProtection from "@/components/ImageProtection";
import FontSessionApplier from "@/components/FontSessionApplier";
import PageTransition from "@/components/PageTransition";
import Analytics from "@/components/Analytics";
import { sanityWriteClient, SITE_SETTINGS_QUERY } from "@/lib/sanity";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/types";
import { FONTS } from "@/lib/fonts";

// Metadata is used by search engines and social media previews
export const metadata: Metadata = {
  title: "Photo Gallery",
  description: "Underwater & nature photography — searchable image library",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore, settings] = await Promise.all([
    cookies(),
    sanityWriteClient
      .fetch<SiteSettings | null>(SITE_SETTINGS_QUERY)
      .catch(() => null),
  ]);
  const isAdmin = cookieStore.get("admin_access")?.value === "granted";
  const { showLocations, maintenanceMode, bodyFont } = settings ?? DEFAULT_SETTINGS;
  const activeFont = bodyFont ? FONTS.find(f => f.family === bodyFont) ?? null : null;

  // Maintenance mode — show a placeholder instead of the site,
  // but admin users can still navigate normally.
  const showMaintenance = maintenanceMode && !isAdmin;

  return (
    <html lang="en">
      <head>
        {/* Google Fonts — body font (from settings or CSS default) + Italiana (title) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href={`https://fonts.googleapis.com/css2?family=${activeFont?.googleFamily ?? 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400'}&family=Italiana&display=swap`}
          rel="stylesheet"
        />
        {/* Leaflet CSS — served from /public so it works without postcss-import.
            Must be a plain <link> because @import in globals.css needs postcss-import
            and CSS imports inside next/dynamic chunks are unreliable. */}
        <link rel="stylesheet" href="/leaflet.css" />
      </head>
      <body className="min-h-screen" style={activeFont ? { fontFamily: activeFont.stack } : undefined}>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="lazyOnload"
            />
            <Script id="ga4-init" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
              `}
            </Script>
            <Analytics />
          </>
        )}
        <ImageProtection />
        <FontSessionApplier />
        {/* ── Header ── */}
        <header className="text-center pt-12 pb-6 bg-black">
          <h1 className="font-title text-[24px] leading-[32px] sm:text-[30px] sm:leading-[36px] md:text-[36px] md:leading-[40px] lg:text-[48px] lg:leading-[48px] font-normal tracking-tight sm:tracking-wider">
            <Link href="/" className="text-sky-400 hover:text-sky-300 transition-colors">SubmarineDivision</Link>
          </h1>
          <p className="page-subtitle mt-[4px]">Underwater Photography by Nick Chow</p>
          <nav className="mt-4 flex justify-center gap-6">
            <Link href="/gallery" className="nav-link">Gallery</Link>
            {showLocations && (
              <Link href="/map" className="nav-link">Map</Link>
            )}
            <Link href="/about" className="nav-link">About</Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm text-slate-600 hover:text-sky-400 transition-colors"
              >
                Admin
              </Link>
            )}
          </nav>
        </header>

        {/* ── Page content ── */}
        {showMaintenance ? (
          <div className="flex flex-col items-center justify-center py-40 text-center px-4">
            <p className="font-title text-[36px] text-sky-400 mb-4">Coming soon</p>
            <p className="text-slate-500 text-sm max-w-xs">We&apos;re working on something new. Check back soon.</p>
          </div>
        ) : (
          <PageTransition>{children}</PageTransition>
        )}

        {/* ── Footer ── */}
        <footer className="text-center py-8 text-slate-600 text-xs mt-12">
          &copy; {new Date().getFullYear()} SubmarineDivision. All rights
          reserved.
        </footer>
      </body>
    </html>
  );
}
