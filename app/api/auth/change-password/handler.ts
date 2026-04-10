import type Database from 'better-sqlite3'
import { hashPassword, verifyCurrentPassword, PASSWORD_HASH_KEY } from '@/lib/password'
import { setSetting } from '@/lib/repositories/settings'

const MIN_PASSWORD_LENGTH = 4

interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

interface ChangePasswordResult {
  success: boolean
  error?: string
}

export async function handleChangePassword(
  db: Database.Database,
  body: ChangePasswordInput,
  envPassword: string
): Promise<ChangePasswordResult> {
  if (!body.newPassword) {
    return { success: false, error: 'New password is required' }
  }
  if (body.newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` }
  }

  const valid = await verifyCurrentPassword(db, body.currentPassword, envPassword)
  if (!valid) {
    return { success: false, error: 'Current password is incorrect' }
  }

  const hash = await hashPassword(body.newPassword)
  setSetting(db, PASSWORD_HASH_KEY, hash)

  return { success: true }
}
