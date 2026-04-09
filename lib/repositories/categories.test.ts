/**
 * @jest-environment node
 */
import { createTestDb } from '@/lib/db'
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from './categories'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

afterEach(() => {
  db.close()
})

describe('createCategory', () => {
  it('creates a category and returns it with an id', () => {
    const cat = createCategory(db, { name: 'Media' })
    expect(cat.id).toBeGreaterThan(0)
    expect(cat.name).toBe('Media')
    expect(cat.sort_order).toBe(0)
  })

  it('respects a custom sort_order', () => {
    const cat = createCategory(db, { name: 'Tools', sort_order: 5 })
    expect(cat.sort_order).toBe(5)
  })
})

describe('getCategories', () => {
  it('returns empty array when no categories exist', () => {
    expect(getCategories(db)).toEqual([])
  })

  it('returns all categories sorted by sort_order', () => {
    createCategory(db, { name: 'Z Last', sort_order: 10 })
    createCategory(db, { name: 'A First', sort_order: 0 })
    createCategory(db, { name: 'M Middle', sort_order: 5 })

    const cats = getCategories(db)
    expect(cats.map(c => c.name)).toEqual(['A First', 'M Middle', 'Z Last'])
  })
})

describe('getCategoryById', () => {
  it('returns the category when found', () => {
    const created = createCategory(db, { name: 'Test' })
    const found = getCategoryById(db, created.id)
    expect(found).toEqual(created)
  })

  it('returns undefined when not found', () => {
    expect(getCategoryById(db, 999)).toBeUndefined()
  })
})

describe('updateCategory', () => {
  it('updates the name', () => {
    const cat = createCategory(db, { name: 'Old Name' })
    const updated = updateCategory(db, cat.id, { name: 'New Name' })
    expect(updated?.name).toBe('New Name')
  })

  it('updates sort_order', () => {
    const cat = createCategory(db, { name: 'Media', sort_order: 0 })
    const updated = updateCategory(db, cat.id, { sort_order: 3 })
    expect(updated?.sort_order).toBe(3)
  })

  it('returns undefined when category does not exist', () => {
    expect(updateCategory(db, 999, { name: 'Ghost' })).toBeUndefined()
  })
})

describe('deleteCategory', () => {
  it('removes the category', () => {
    const cat = createCategory(db, { name: 'To Delete' })
    const deleted = deleteCategory(db, cat.id)
    expect(deleted).toBe(true)
    expect(getCategoryById(db, cat.id)).toBeUndefined()
  })

  it('returns false when category does not exist', () => {
    expect(deleteCategory(db, 999)).toBe(false)
  })
})
