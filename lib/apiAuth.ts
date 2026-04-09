import { NextRequest } from 'next/server'
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth'

export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value ?? ''
  const result = await verifySessionToken(token, process.env.JWT_SECRET ?? '')
  return result.valid
}
