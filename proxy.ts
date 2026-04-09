import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  // Skip auth for the login page itself
  if (request.nextUrl.pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value ?? ''
  const result = await verifySessionToken(token, process.env.JWT_SECRET ?? '')

  if (!result.valid) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Match /admin and all sub-paths
  matcher: ['/admin/:path*'],
}
