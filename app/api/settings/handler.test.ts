/**
 * @jest-environment node
 */
import { createTestDb } from '@/lib/db'
import { createUser } from '@/lib/repositories/users'
import { handleGetSettings, handleUpdateSettings } from './handler'
import type Database from 'better-sqlite3'

let db: Database.Database
let userId: number

beforeEach(() => {
  db = createTestDb()
  userId = createUser(db, { email: 'test@test.com', password_hash: 'hash' }).id
})

afterEach(() => db.close())

describe('settings handler', () => {
  it('returns default interval and shortcut when no setting stored', () => {
    const result = handleGetSettings(db, userId)
    expect(result).toEqual({ health_check_interval: '30s', search_shortcut: 'mod+k' })
  })

  it('updates health_check_interval', () => {
    const result = handleUpdateSettings(db, userId, { health_check_interval: '30s' })
    expect(result.data).toMatchObject({ health_check_interval: '30s' })
    expect(result.status).toBe(200)
  })

  it('persists the updated value', () => {
    handleUpdateSettings(db, userId, { health_check_interval: '60s' })
    expect(handleGetSettings(db, userId)).toMatchObject({ health_check_interval: '60s' })
  })

  it('rejects invalid interval value', () => {
    const result = handleUpdateSettings(db, userId, { health_check_interval: '999s' })
    expect(result.error).toBeTruthy()
    expect(result.status).toBe(400)
  })

  it('updates search_shortcut', () => {
    const result = handleUpdateSettings(db, userId, { search_shortcut: '/' })
    expect(result.data).toMatchObject({ search_shortcut: '/' })
    expect(result.status).toBe(200)
  })

  it('persists search_shortcut', () => {
    handleUpdateSettings(db, userId, { search_shortcut: 'mod+/' })
    expect(handleGetSettings(db, userId)).toMatchObject({ search_shortcut: 'mod+/' })
  })

  it('rejects invalid search_shortcut', () => {
    const result = handleUpdateSettings(db, userId, { search_shortcut: 'invalid' })
    expect(result.error).toBeTruthy()
    expect(result.status).toBe(400)
  })

  it('isolates settings between users', () => {
    const userB = createUser(db, { email: 'b@test.com', password_hash: 'hash' }).id
    handleUpdateSettings(db, userId, { health_check_interval: '10s' })

    expect(handleGetSettings(db, userId).health_check_interval).toBe('10s')
    expect(handleGetSettings(db, userB).health_check_interval).toBe('30s')
  })
})
