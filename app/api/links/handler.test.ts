/**
 * @jest-environment node
 */
import { createTestDb } from '@/lib/db'
import { createUser } from '@/lib/repositories/users'
import { createCategory } from '@/lib/repositories/categories'
import { createLink } from '@/lib/repositories/links'
import {
  handleGetLinks,
  handleCreateLink,
  handleUpdateLink,
  handleDeleteLink,
} from './handler'
import type Database from 'better-sqlite3'

let db: Database.Database
let userId: number
let categoryId: number

beforeEach(() => {
  db = createTestDb()
  userId = createUser(db, { email: 'test@test.com', password_hash: 'hash' }).id
  categoryId = createCategory(db, userId, { name: 'Media' }).id
})

afterEach(() => {
  db.close()
})

describe('handleGetLinks', () => {
  it('returns empty array when no links', () => {
    expect(handleGetLinks(db, userId)).toEqual([])
  })

  it('returns all links', () => {
    createLink(db, userId, { category_id: categoryId, name: 'Plex', url: 'http://plex', icon_type: 'builtin' })
    expect(handleGetLinks(db, userId)).toHaveLength(1)
  })
})

describe('handleCreateLink', () => {
  const validBody = {
    name: 'Plex',
    url: 'http://localhost:32400',
    icon_type: 'builtin' as const,
    icon_value: 'plex',
  }

  it('creates a link', () => {
    const result = handleCreateLink(db, userId, { ...validBody, category_id: categoryId })
    expect(result.status).toBe(201)
    expect(result.data).toMatchObject({ name: 'Plex' })
  })

  it('returns 400 when name is missing', () => {
    const result = handleCreateLink(db, userId, { ...validBody, name: '' })
    expect(result.status).toBe(400)
  })

  it('returns 400 when url is missing', () => {
    const result = handleCreateLink(db, userId, { ...validBody, url: '' })
    expect(result.status).toBe(400)
  })

  it('returns 400 when icon_type is invalid', () => {
    const result = handleCreateLink(db, userId, { ...validBody, icon_type: 'invalid' as any })
    expect(result.status).toBe(400)
  })
})

describe('handleUpdateLink', () => {
  it('updates a link', () => {
    const link = createLink(db, userId, { category_id: categoryId, name: 'Old', url: 'http://old', icon_type: 'builtin' })
    const result = handleUpdateLink(db, userId, link.id, { name: 'New' })
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ name: 'New' })
  })

  it('returns 400 when id is NaN', () => {
    const result = handleUpdateLink(db, userId, NaN, { name: 'Ghost' })
    expect(result.status).toBe(400)
  })

  it('returns 400 when icon_type is invalid', () => {
    const link = createLink(db, userId, { name: 'App', url: 'http://app', icon_type: 'builtin' })
    const result = handleUpdateLink(db, userId, link.id, { icon_type: 'invalid' as any })
    expect(result.status).toBe(400)
  })

  it('returns 404 when link not found', () => {
    const result = handleUpdateLink(db, userId, 999, { name: 'Ghost' })
    expect(result.status).toBe(404)
  })
})

describe('handleDeleteLink', () => {
  it('deletes a link', () => {
    const link = createLink(db, userId, { category_id: categoryId, name: 'Plex', url: 'http://plex', icon_type: 'builtin' })
    const result = handleDeleteLink(db, userId, link.id)
    expect(result.status).toBe(200)
  })

  it('returns 400 when id is NaN', () => {
    const result = handleDeleteLink(db, userId, NaN)
    expect(result.status).toBe(400)
  })

  it('returns 404 when link not found', () => {
    const result = handleDeleteLink(db, userId, 999)
    expect(result.status).toBe(404)
  })
})
