import type Database from 'better-sqlite3'
import { createSessionToken, COOKIE_NAME } from '@/lib/auth'
import { verifyCurrentPassword } from '@/lib/password'

export interface LoginRequest {
  password: string
}

export interface LoginResult {
  success: boolean
  token?: string
  error?: string
}

export async function handleLogin(
  body: LoginRequest,
  db: Database.Database,
  adminPassword: string,
  jwtSecret: string
): Promise<LoginResult> {
  if (!body.password) {
    return { success: false, error: 'Password is required' }
  }

  const valid = await verifyCurrentPassword(db, body.password, adminPassword)
  if (!valid) {
    return { success: false, error: 'Invalid password' }
  }

  // TODO: Commit 4 will look up the actual user by email
  const token = await createSessionToken({ userId: 0, role: 'admin' }, jwtSecret)
  return { success: true, token }
}

export { COOKIE_NAME }
