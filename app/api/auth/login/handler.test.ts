/**
 * @jest-environment node
 */
import { handleLogin } from './handler'
import { createTestDb } from '@/lib/db'
import { hashPassword, PASSWORD_HASH_KEY } from '@/lib/password'
import { setSetting } from '@/lib/repositories/settings'
import type Database from 'better-sqlite3'

const ADMIN_PASSWORD = 'secret123'
const JWT_SECRET = 'test-secret-long-enough-for-hmac-sha256!!'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

afterEach(() => db.close())

describe('handleLogin', () => {
  it('returns success and token with correct env password', async () => {
    const result = await handleLogin({ password: ADMIN_PASSWORD }, db, ADMIN_PASSWORD, JWT_SECRET)
    expect(result.success).toBe(true)
    expect(typeof result.token).toBe('string')
    expect(result.error).toBeUndefined()
  })

  it('returns error with wrong password', async () => {
    const result = await handleLogin({ password: 'wrong' }, db, ADMIN_PASSWORD, JWT_SECRET)
    expect(result.success).toBe(false)
    expect(result.token).toBeUndefined()
    expect(result.error).toBeTruthy()
  })

  it('returns error with empty password', async () => {
    const result = await handleLogin({ password: '' }, db, ADMIN_PASSWORD, JWT_SECRET)
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('authenticates against DB-stored hash when set', async () => {
    const hash = await hashPassword('dbpassword')
    setSetting(db, PASSWORD_HASH_KEY, hash)

    const result = await handleLogin({ password: 'dbpassword' }, db, ADMIN_PASSWORD, JWT_SECRET)
    expect(result.success).toBe(true)
    expect(typeof result.token).toBe('string')
  })

  it('rejects env password when DB hash is set', async () => {
    const hash = await hashPassword('dbpassword')
    setSetting(db, PASSWORD_HASH_KEY, hash)

    const result = await handleLogin({ password: ADMIN_PASSWORD }, db, ADMIN_PASSWORD, JWT_SECRET)
    expect(result.success).toBe(false)
  })
})
