import { createTestDb } from '@/lib/db'
import { handleGetSettings, handleUpdateSettings } from './handler'

describe('settings handler', () => {
  it('returns default interval and shortcut when no setting stored', () => {
    const db = createTestDb()
    const result = handleGetSettings(db)
    expect(result).toEqual({ health_check_interval: '30s', search_shortcut: 'mod+k' })
  })

  it('updates health_check_interval', () => {
    const db = createTestDb()
    const result = handleUpdateSettings(db, { health_check_interval: '30s' }, true)
    expect(result.data).toMatchObject({ health_check_interval: '30s' })
    expect(result.status).toBe(200)
  })

  it('persists the updated value', () => {
    const db = createTestDb()
    handleUpdateSettings(db, { health_check_interval: '60s' }, true)
    expect(handleGetSettings(db)).toMatchObject({ health_check_interval: '60s' })
  })

  it('rejects invalid interval value', () => {
    const db = createTestDb()
    const result = handleUpdateSettings(db, { health_check_interval: '999s' }, true)
    expect(result.error).toBeTruthy()
    expect(result.status).toBe(400)
  })

  it('rejects non-admin', () => {
    const db = createTestDb()
    const result = handleUpdateSettings(db, { health_check_interval: '10s' }, false)
    expect(result.error).toBe('Unauthorized')
    expect(result.status).toBe(401)
  })

  it('updates search_shortcut', () => {
    const db = createTestDb()
    const result = handleUpdateSettings(db, { search_shortcut: '/' }, true)
    expect(result.data).toMatchObject({ search_shortcut: '/' })
    expect(result.status).toBe(200)
  })

  it('persists search_shortcut', () => {
    const db = createTestDb()
    handleUpdateSettings(db, { search_shortcut: 'mod+/' }, true)
    expect(handleGetSettings(db)).toMatchObject({ search_shortcut: 'mod+/' })
  })

  it('rejects invalid search_shortcut', () => {
    const db = createTestDb()
    const result = handleUpdateSettings(db, { search_shortcut: 'invalid' }, true)
    expect(result.error).toBeTruthy()
    expect(result.status).toBe(400)
  })
})
