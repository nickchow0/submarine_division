// ─── Admin Auth API ───────────────────────────────────────────────────────────
// Validates the admin password and sets a separate httpOnly cookie.
// Requires the site cookie to already be present (middleware enforces this).

import { NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? ''
const COOKIE_NAME    = 'admin_access'
const COOKIE_VALUE   = 'granted'

export async function POST(request: Request) {
  const { password } = await request.json()

  if (!ADMIN_PASSWORD) {
    return NextResponse.json({ success: false, error: 'Admin password not configured' }, { status: 500 })
  }

  if (password === ADMIN_PASSWORD) {
    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })
    return response
  }

  return NextResponse.json({ success: false }, { status: 401 })
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
