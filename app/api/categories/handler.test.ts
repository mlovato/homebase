/**
 * @jest-environment node
 */
import { createTestDb } from '@/lib/db'
import { createUser } from '@/lib/repositories/users'
import { createCategory } from '@/lib/repositories/categories'
import {
  handleGetCategories,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
} from './handler'
import type Database from 'better-sqlite3'

let db: Database.Database
let userId: number

beforeEach(() => {
  db = createTestDb()
  userId = createUser(db, { email: 'test@test.com', password_hash: 'hash' }).id
})

afterEach(() => {
  db.close()
})

describe('handleGetCategories', () => {
  it('returns empty categories and uncategorized arrays when no data', () => {
    const result = handleGetCategories(db, userId)
    expect(result.categories).toEqual([])
    expect(result.uncategorized).toEqual([])
  })

  it('returns categories with embedded links', () => {
    createCategory(db, userId, { name: 'Media' })
    const result = handleGetCategories(db, userId)
    expect(result.categories).toHaveLength(1)
    expect(result.categories[0].name).toBe('Media')
    expect(result.categories[0].links).toEqual([])
  })
})

describe('handleCreateCategory', () => {
  it('creates a category', () => {
    const result = handleCreateCategory(db, userId, { name: 'Media' })
    expect(result.status).toBe(201)
    expect(result.data).toMatchObject({ name: 'Media' })
  })

  it('returns 400 when name is missing', () => {
    const result = handleCreateCategory(db, userId, {})
    expect(result.status).toBe(400)
  })

  it('returns 400 when name is whitespace', () => {
    const result = handleCreateCategory(db, userId, { name: '   ' })
    expect(result.status).toBe(400)
  })

  it('returns 409 when category name already exists', () => {
    handleCreateCategory(db, userId, { name: 'Media' })
    const result = handleCreateCategory(db, userId, { name: 'Media' })
    expect(result.status).toBe(409)
    expect(result.error).toMatch(/already exists/i)
  })

  it('returns 409 for case-insensitive duplicate', () => {
    handleCreateCategory(db, userId, { name: 'Media' })
    const result = handleCreateCategory(db, userId, { name: 'media' })
    expect(result.status).toBe(409)
  })

  it('allows same name for different users', () => {
    handleCreateCategory(db, userId, { name: 'Media' })
    const other = createUser(db, { email: 'other@test.com', password_hash: 'hash' })
    const result = handleCreateCategory(db, other.id, { name: 'Media' })
    expect(result.status).toBe(201)
  })
})

describe('handleUpdateCategory', () => {
  it('updates a category', () => {
    const cat = createCategory(db, userId, { name: 'Old' })
    const result = handleUpdateCategory(db, userId, cat.id, { name: 'New' })
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ name: 'New' })
  })

  it('returns 400 when id is NaN', () => {
    const result = handleUpdateCategory(db, userId, NaN, { name: 'Ghost' })
    expect(result.status).toBe(400)
  })

  it('returns 404 when category not found', () => {
    const result = handleUpdateCategory(db, userId, 999, { name: 'Ghost' })
    expect(result.status).toBe(404)
  })

  it('returns 409 when renaming to an existing category name', () => {
    const cat = createCategory(db, userId, { name: 'Media' })
    createCategory(db, userId, { name: 'Tools' })
    const result = handleUpdateCategory(db, userId, cat.id, { name: 'Tools' })
    expect(result.status).toBe(409)
  })

  it('allows keeping the same name on update', () => {
    const cat = createCategory(db, userId, { name: 'Media' })
    const result = handleUpdateCategory(db, userId, cat.id, { name: 'Media' })
    expect(result.status).toBe(200)
  })
})

describe('handleDeleteCategory', () => {
  it('deletes a category', () => {
    const cat = createCategory(db, userId, { name: 'Doomed' })
    const result = handleDeleteCategory(db, userId, cat.id)
    expect(result.status).toBe(200)
  })

  it('returns 400 when id is NaN', () => {
    const result = handleDeleteCategory(db, userId, NaN)
    expect(result.status).toBe(400)
  })

  it('returns 404 when category not found', () => {
    const result = handleDeleteCategory(db, userId, 999)
    expect(result.status).toBe(404)
  })
})
