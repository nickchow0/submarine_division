// ─── Root Layout ──────────────────────────────────────────────────────────────
// This wraps every page in the app. Anything you put here (nav, footer,
// fonts, metadata) appears on every page automatically.
//
// This is a Server Component (no 'use client') — it renders on the server
// and streams HTML to the browser.

import type { Metadata } from 'next'
import './globals.css'

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
        {/* Google Fonts — Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        {/* ── Header ── */}
        <header className="text-center pt-12 pb-6 bg-gradient-to-b from-ocean-900 to-ocean-950 border-b border-ocean-700">
          <h1 className="text-3xl font-light tracking-wider">
            {/* Replace with your site name */}
            <span className="text-sky-400 font-semibold">Submarine Division</span> Photography
          </h1>
          <p className="text-slate-500 text-sm mt-1">Underwater &amp; Nature Image Library</p>
        </header>

        {/* ── Page content ── */}
        <main>{children}</main>

        {/* ── Footer ── */}
        <footer className="text-center py-8 text-slate-600 text-xs border-t border-ocean-700 mt-12">
          &copy; {new Date().getFullYear()} Submarine Division. All rights reserved.
        </footer>
      </body>
    </html>
  )
}
