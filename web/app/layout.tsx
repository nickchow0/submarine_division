// ─── Root Layout ──────────────────────────────────────────────────────────────
// This wraps every page in the app. Anything you put here (nav, footer,
// fonts, metadata) appears on every page automatically.
//
// This is a Server Component (no 'use client') — it renders on the server
// and streams HTML to the browser.

import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import './globals.css'
import ImageProtection from '@/components/ImageProtection'
import PageTransition from '@/components/PageTransition'
import { sanityClient, SITE_SETTINGS_QUERY } from '@/lib/sanity'
import { DEFAULT_SETTINGS, type SiteSettings } from '@/types'

// Metadata is used by search engines and social media previews
export const metadata: Metadata = {
  title: 'Photo Gallery',
  description: 'Underwater & nature photography — searchable image library',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [cookieStore, settings] = await Promise.all([
    cookies(),
    sanityClient.fetch<SiteSettings | null>(SITE_SETTINGS_QUERY).catch(() => null),
  ])
  const isAdmin = cookieStore.get('admin_access')?.value === 'granted'
  const { showLocations, maintenanceMode } = settings ?? DEFAULT_SETTINGS

  // Maintenance mode — show a placeholder instead of the site,
  // but admin users can still navigate normally.
  const showMaintenance = maintenanceMode && !isAdmin

  return (
    <html lang="en">
      <head>
        {/* Google Fonts — Inter (body) + Italiana (title) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Italiana&display=swap"
          rel="stylesheet"
        />
        {/* Leaflet CSS — served from /public so it works without postcss-import.
            Must be a plain <link> because @import in globals.css needs postcss-import
            and CSS imports inside next/dynamic chunks are unreliable. */}
        <link rel="stylesheet" href="/leaflet.css" />
      </head>
      <body className="min-h-screen">
        <ImageProtection />
        {/* ── Header ── */}
        <header className="text-center pt-12 pb-6 bg-black">
          <h1 style={{ fontFamily: "'Italiana', serif" }} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight sm:tracking-wider">
            <Link href="/" className="text-sky-400 hover:text-sky-300 transition-colors">SubmarineDivision</Link>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Underwater Photography by Nick Chow</p>
          <nav className="mt-4 flex justify-center gap-6">
            <Link href="/gallery" className="text-sm text-slate-400 hover:text-sky-400 transition-colors">Gallery</Link>
            {showLocations && (
              <Link href="/map" className="text-sm text-slate-400 hover:text-sky-400 transition-colors">Map</Link>
            )}
            <Link href="/about"   className="text-sm text-slate-400 hover:text-sky-400 transition-colors">About</Link>
            {isAdmin && (
              <Link href="/admin" className="text-sm text-slate-600 hover:text-sky-400 transition-colors">Admin</Link>
            )}
          </nav>
        </header>

        {/* ── Page content ── */}
        {showMaintenance ? (
          <div className="flex flex-col items-center justify-center py-40 text-center px-4">
            <p style={{ fontFamily: "'Italiana', serif" }} className="text-4xl text-sky-400 mb-4">Coming soon</p>
            <p className="text-slate-500 text-sm max-w-xs">We&apos;re working on something new. Check back soon.</p>
          </div>
        ) : (
          <PageTransition>{children}</PageTransition>
        )}

        {/* ── Footer ── */}
        <footer className="text-center py-8 text-slate-600 text-xs mt-12">
          &copy; {new Date().getFullYear()} SubmarineDivision. All rights reserved.
        </footer>
      </body>
    </html>
  )
}
