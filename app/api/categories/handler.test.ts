/**
 * @jest-environment node
 */
import { createTestDb } from '@/lib/db'
import { createCategory } from '@/lib/repositories/categories'
import {
  handleGetCategories,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
} from './handler'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

afterEach(() => {
  db.close()
})

describe('handleGetCategories', () => {
  it('returns empty array when no categories', () => {
    const result = handleGetCategories(db)
    expect(result).toEqual([])
  })

  it('returns categories with embedded links', () => {
    createCategory(db, { name: 'Media' })
    const result = handleGetCategories(db)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Media')
    expect(result[0].links).toEqual([])
  })
})

describe('handleCreateCategory', () => {
  it('creates a category when admin', () => {
    const result = handleCreateCategory(db, { name: 'Media' }, true)
    expect(result.status).toBe(201)
    expect(result.data).toMatchObject({ name: 'Media' })
  })

  it('returns 401 when not admin', () => {
    const result = handleCreateCategory(db, { name: 'Media' }, false)
    expect(result.status).toBe(401)
    expect(result.error).toBeTruthy()
  })

  it('returns 400 when name is missing', () => {
    const result = handleCreateCategory(db, {}, true)
    expect(result.status).toBe(400)
  })

  it('returns 400 when name is whitespace', () => {
    const result = handleCreateCategory(db, { name: '   ' }, true)
    expect(result.status).toBe(400)
  })
})

describe('handleUpdateCategory', () => {
  it('updates a category when admin', () => {
    const cat = createCategory(db, { name: 'Old' })
    const result = handleUpdateCategory(db, cat.id, { name: 'New' }, true)
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ name: 'New' })
  })

  it('returns 401 when not admin', () => {
    const cat = createCategory(db, { name: 'Old' })
    const result = handleUpdateCategory(db, cat.id, { name: 'New' }, false)
    expect(result.status).toBe(401)
  })

  it('returns 404 when category not found', () => {
    const result = handleUpdateCategory(db, 999, { name: 'Ghost' }, true)
    expect(result.status).toBe(404)
  })
})

describe('handleDeleteCategory', () => {
  it('deletes a category when admin', () => {
    const cat = createCategory(db, { name: 'Doomed' })
    const result = handleDeleteCategory(db, cat.id, true)
    expect(result.status).toBe(200)
  })

  it('returns 401 when not admin', () => {
    const cat = createCategory(db, { name: 'Safe' })
    const result = handleDeleteCategory(db, cat.id, false)
    expect(result.status).toBe(401)
  })

  it('returns 404 when category not found', () => {
    const result = handleDeleteCategory(db, 999, true)
    expect(result.status).toBe(404)
  })
})
