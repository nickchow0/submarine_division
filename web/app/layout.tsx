// ─── Root Layout ──────────────────────────────────────────────────────────────
// This wraps every page in the app. Anything you put here (nav, footer,
// fonts, metadata) appears on every page automatically.
//
// This is a Server Component (no 'use client') — it renders on the server
// and streams HTML to the browser.

import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import ImageProtection from '@/components/ImageProtection'
import PageTransition from '@/components/PageTransition'

// Metadata is used by search engines and social media previews
export const metadata: Metadata = {
  title: 'Photo Gallery',
  description: 'Underwater & nature photography — searchable image library',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — Inter (body) + Cormorant Garamond (title) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Italiana&display=swap"
          rel="stylesheet"
        />
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
            <Link href="/map"     className="text-sm text-slate-400 hover:text-sky-400 transition-colors">Map</Link>
            <Link href="/about"   className="text-sm text-slate-400 hover:text-sky-400 transition-colors">About</Link>
          </nav>
        </header>

        {/* ── Page content ── */}
        <PageTransition>{children}</PageTransition>

        {/* ── Footer ── */}
        <footer className="text-center py-8 text-slate-600 text-xs mt-12">
          &copy; {new Date().getFullYear()} SubmarineDivision. All rights reserved.
        </footer>
      </body>
    </html>
  )
}
