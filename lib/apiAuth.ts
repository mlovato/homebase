import { cookies } from 'next/headers'
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth'

export async function isAdminRequest(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value ?? ''
  const result = await verifySessionToken(token, process.env.JWT_SECRET ?? '')
  return result.valid
}
