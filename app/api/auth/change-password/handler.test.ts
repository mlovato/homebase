/**
 * @jest-environment node
 */
import { createTestDb } from '@/lib/db'
import { handleChangePassword } from './handler'
import { hashPassword, verifyHashedPassword, PASSWORD_HASH_KEY } from '@/lib/password'
import { getSetting } from '@/lib/repositories/settings'
import type Database from 'better-sqlite3'

const ENV_PASSWORD = 'envpassword'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

afterEach(() => db.close())

describe('handleChangePassword', () => {
  it('changes password when current matches env var', async () => {
    const result = await handleChangePassword(db, {
      currentPassword: ENV_PASSWORD,
      newPassword: 'newpass123',
    }, ENV_PASSWORD)

    expect(result.success).toBe(true)
    const stored = getSetting(db, PASSWORD_HASH_KEY)
    expect(stored).toBeDefined()
    expect(await verifyHashedPassword('newpass123', stored!)).toBe(true)
  })

  it('changes password when current matches DB-stored hash', async () => {
    const hash = await hashPassword('dbpass')
    const { setSetting } = await import('@/lib/repositories/settings')
    setSetting(db, PASSWORD_HASH_KEY, hash)

    const result = await handleChangePassword(db, {
      currentPassword: 'dbpass',
      newPassword: 'updated',
    }, ENV_PASSWORD)

    expect(result.success).toBe(true)
    const newHash = getSetting(db, PASSWORD_HASH_KEY)!
    expect(await verifyHashedPassword('updated', newHash)).toBe(true)
  })

  it('rejects when current password is wrong', async () => {
    const result = await handleChangePassword(db, {
      currentPassword: 'wrong',
      newPassword: 'newpass',
    }, ENV_PASSWORD)

    expect(result).toEqual({ success: false, error: 'Current password is incorrect' })
  })

  it('rejects when new password is empty', async () => {
    const result = await handleChangePassword(db, {
      currentPassword: ENV_PASSWORD,
      newPassword: '',
    }, ENV_PASSWORD)

    expect(result).toEqual({ success: false, error: 'New password is required' })
  })

  it('rejects when new password is too short', async () => {
    const result = await handleChangePassword(db, {
      currentPassword: ENV_PASSWORD,
      newPassword: 'ab',
    }, ENV_PASSWORD)

    expect(result).toEqual({ success: false, error: 'New password must be at least 4 characters' })
  })
})
