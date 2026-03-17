// ─── Middleware ───────────────────────────────────────────────────────────────
// Runs on the server BEFORE any page or API route is rendered.
// If the visitor hasn't entered the site password, they get redirected
// to /password — no HTML, no images, no data is leaked.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SITE_COOKIE  = 'site_access'
const SITE_VALUE   = 'granted'
const ADMIN_COOKIE = 'admin_access'
const ADMIN_VALUE  = 'granted'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow the password page, its API, and static assets through
  if (
    pathname === '/password' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // ── 1. Site-level auth ────────────────────────────────────────────────────
  const siteCookie = request.cookies.get(SITE_COOKIE)
  if (siteCookie?.value !== SITE_VALUE) {
    const url = request.nextUrl.clone()
    url.pathname = '/password'
    return NextResponse.redirect(url)
  }

  // ── 2. Admin-level auth (extra layer on top of site auth) ─────────────────
  // Both /admin/* pages and /api/admin/* routes require the admin cookie.
  // /admin/login and /api/admin/auth/* are exempt so the admin can log in.
  const isAdminRoute    = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  const isAdminLoginPage = pathname === '/admin/login'
  const isAdminAuthApi  = pathname.startsWith('/api/admin/auth')

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
