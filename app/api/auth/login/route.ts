import { NextRequest, NextResponse } from 'next/server'
import { handleLogin, COOKIE_NAME } from './handler'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const result = await handleLogin(
    body,
    process.env.ADMIN_PASSWORD ?? '',
    process.env.JWT_SECRET ?? ''
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, result.token!, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })
  return response
}
