// ─── Middleware ───────────────────────────────────────────────────────────────
// Runs on the server BEFORE any page or API route is rendered.
// If the visitor hasn't entered the site password, they get redirected
// to /password — no HTML, no images, no data is leaked.
//
// The site password can be disabled via the admin settings panel.
// When disabled, this middleware fetches the setting from Sanity (cached 60s).

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SITE_COOKIE  = 'site_access'
const SITE_VALUE   = 'granted'
const ADMIN_COOKIE = 'admin_access'
const ADMIN_VALUE  = 'granted'

// ── requirePassword cache ─────────────────────────────────────────────────────
// Fetched from Sanity once per minute (per Edge worker instance) so we don't
// hit the API on every unauthenticated request.

let cachedRequirePassword: boolean | null = null
let cacheExpiry = 0

async function isPasswordRequired(): Promise<boolean> {
  // Env var override — useful for testing and environments without Sanity access
  if (process.env.REQUIRE_PASSWORD === 'true')  return true
  if (process.env.REQUIRE_PASSWORD === 'false') return false

  if (Date.now() < cacheExpiry && cachedRequirePassword !== null) {
    return cachedRequirePassword
  }
  try {
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const dataset   = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
    const token     = process.env.SANITY_READ_TOKEN
    const query     = encodeURIComponent(
      '*[_type == "siteSettings" && _id == "siteSettings"][0]{ "requirePassword": coalesce(requirePassword, true) }'
    )
    const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) {
      const data = await res.json() as { result?: { requirePassword?: boolean } }
      cachedRequirePassword = data.result?.requirePassword ?? true
      cacheExpiry = Date.now() + 60_000 // cache for 1 minute
      return cachedRequirePassword
    }
  } catch {
    // Fall through — default to requiring password (fail safe)
  }
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow the password page, its API, and static assets through
  if (
    pathname === '/password' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/generate-caption') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // ── 1. Site-level auth ────────────────────────────────────────────────────
  const siteCookie = request.cookies.get(SITE_COOKIE)
  if (siteCookie?.value !== SITE_VALUE) {
    const passwordRequired = await isPasswordRequired()
    if (passwordRequired) {
      const url = request.nextUrl.clone()
      url.pathname = '/password'
      return NextResponse.redirect(url)
    }
    // Password disabled — fall through to admin check below
  }

  // ── 2. Admin-level auth (extra layer on top of site auth) ─────────────────
  // Both /admin/* pages and /api/admin/* routes require the admin cookie.
  // /admin/login and /api/admin/auth/* are exempt so the admin can log in.
  const isAdminRoute     = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  const isAdminLoginPage = pathname === '/admin/login'
  const isAdminAuthApi   = pathname.startsWith('/api/admin/auth')

  if (isAdminRoute && !isAdminLoginPage && !isAdminAuthApi) {
    const adminCookie = request.cookies.get(ADMIN_COOKIE)
    if (adminCookie?.value !== ADMIN_VALUE) {
      // For API routes return 401 JSON rather than redirecting to the login page
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

// Apply middleware to all routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
