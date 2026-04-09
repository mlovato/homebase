import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth'

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
  adminPassword: string,
  jwtSecret: string
): Promise<LoginResult> {
  if (!body.password) {
    return { success: false, error: 'Password is required' }
  }

  if (!verifyPassword(body.password, adminPassword)) {
    return { success: false, error: 'Invalid password' }
  }

  const token = await createSessionToken(jwtSecret)
  return { success: true, token }
}

export { COOKIE_NAME }
