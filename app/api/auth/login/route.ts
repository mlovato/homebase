import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { COOKIE_NAME } from '@/lib/auth'
import { handleLogin } from './handler'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const result = await handleLogin(
    body,
    getDb(),
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
