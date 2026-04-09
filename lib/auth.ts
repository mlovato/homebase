import { SignJWT, jwtVerify } from 'jose'

const TOKEN_EXPIRY = '24h'
const COOKIE_NAME = 'dashy_session'

export function verifyPassword(submitted: string, expected: string): boolean {
  return submitted.length > 0 && submitted === expected
}

export async function createSessionToken(secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(key)
}

export type VerifyResult = { valid: true } | { valid: false }

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<VerifyResult> {
  if (!token) return { valid: false }
  try {
    const key = new TextEncoder().encode(secret)
    await jwtVerify(token, key)
    return { valid: true }
  } catch {
    return { valid: false }
  }
}

export { COOKIE_NAME }
