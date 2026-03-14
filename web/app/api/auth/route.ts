// ─── Password Auth API ───────────────────────────────────────────────────────
// POST /api/auth — validates the password and sets a cookie server-side.
// The password check happens entirely on the server so it's never exposed
// in client-side JavaScript bundles.

import { NextResponse } from 'next/server'

const SITE_PASSWORD = process.env.SITE_PASSWORD ?? ''
const COOKIE_NAME = 'site_access'
const COOKIE_VALUE = 'granted'

export async function POST(request: Request) {
  const body = await request.json()
  const { password } = body

  if (password === SITE_PASSWORD) {
    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    return response
  }

  return NextResponse.json({ success: false }, { status: 401 })
}
