// ─── Middleware ───────────────────────────────────────────────────────────────
// Runs on the server BEFORE any page or API route is rendered.
// If the visitor hasn't entered the site password, they get redirected
// to /password — no HTML, no images, no data is leaked.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'site_access'
const COOKIE_VALUE = 'granted'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow the password page itself, its API route, and static assets
  if (
    pathname === '/password' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Check for the auth cookie
  const accessCookie = request.cookies.get(COOKIE_NAME)
  if (accessCookie?.value === COOKIE_VALUE) {
    return NextResponse.next()
  }

  // Not authenticated — redirect to password page
  const passwordUrl = request.nextUrl.clone()
  passwordUrl.pathname = '/password'
  return NextResponse.redirect(passwordUrl)
}

// Apply middleware to all routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
