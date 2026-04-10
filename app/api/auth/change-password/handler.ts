import type Database from 'better-sqlite3'
import { hashPassword, verifyHashedPassword } from '@/lib/password'
import { getUserByIdWithHash, updateUser } from '@/lib/repositories/users'

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
  userId: number,
  body: ChangePasswordInput
): Promise<ChangePasswordResult> {
  if (!body.newPassword) {
    return { success: false, error: 'New password is required' }
  }
  if (body.newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` }
  }

  const user = getUserByIdWithHash(db, userId)

  if (!user) {
    return { success: false, error: 'User not found' }
  }

  const valid = await verifyHashedPassword(body.currentPassword, user.password_hash)
  if (!valid) {
    return { success: false, error: 'Current password is incorrect' }
  }

  const newHash = await hashPassword(body.newPassword)
  updateUser(db, userId, { password_hash: newHash })

  return { success: true }
}
