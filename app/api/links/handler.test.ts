/**
 * @jest-environment node
 */
import { createTestDb } from '@/lib/db'
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
let categoryId: number

beforeEach(() => {
  db = createTestDb()
  categoryId = createCategory(db, { name: 'Media' }).id
})

afterEach(() => {
  db.close()
})

describe('handleGetLinks', () => {
  it('returns empty array when no links', () => {
    expect(handleGetLinks(db)).toEqual([])
  })

  it('returns all links', () => {
    createLink(db, { category_id: categoryId, name: 'Plex', url: 'http://plex', icon_type: 'builtin' })
    expect(handleGetLinks(db)).toHaveLength(1)
  })
})

describe('handleCreateLink', () => {
  const validBody = {
    category_id: 1,
    name: 'Plex',
    url: 'http://localhost:32400',
    icon_type: 'builtin' as const,
    icon_value: 'plex',
  }

  it('creates a link when admin', () => {
    const result = handleCreateLink(db, { ...validBody, category_id: categoryId }, true)
    expect(result.status).toBe(201)
    expect(result.data).toMatchObject({ name: 'Plex' })
  })

  it('returns 401 when not admin', () => {
    const result = handleCreateLink(db, validBody, false)
    expect(result.status).toBe(401)
  })

  it('returns 400 when name is missing', () => {
    const result = handleCreateLink(db, { ...validBody, name: '' }, true)
    expect(result.status).toBe(400)
  })

  it('returns 400 when url is missing', () => {
    const result = handleCreateLink(db, { ...validBody, url: '' }, true)
    expect(result.status).toBe(400)
  })

  it('returns 400 when icon_type is invalid', () => {
    const result = handleCreateLink(db, { ...validBody, icon_type: 'invalid' as any }, true)
    expect(result.status).toBe(400)
  })
})

describe('handleUpdateLink', () => {
  it('updates a link when admin', () => {
    const link = createLink(db, { category_id: categoryId, name: 'Old', url: 'http://old', icon_type: 'builtin' })
    const result = handleUpdateLink(db, link.id, { name: 'New' }, true)
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ name: 'New' })
  })

  it('returns 401 when not admin', () => {
    const link = createLink(db, { name: 'App', url: 'http://app', icon_type: 'builtin' })
    const result = handleUpdateLink(db, link.id, { name: 'New' }, false)
    expect(result.status).toBe(401)
  })

  it('returns 400 when id is NaN', () => {
    const result = handleUpdateLink(db, NaN, { name: 'Ghost' }, true)
    expect(result.status).toBe(400)
  })

  it('returns 400 when icon_type is invalid', () => {
    const link = createLink(db, { name: 'App', url: 'http://app', icon_type: 'builtin' })
    const result = handleUpdateLink(db, link.id, { icon_type: 'invalid' as any }, true)
    expect(result.status).toBe(400)
  })

  it('returns 404 when link not found', () => {
    const result = handleUpdateLink(db, 999, { name: 'Ghost' }, true)
    expect(result.status).toBe(404)
  })
})

describe('handleDeleteLink', () => {
  it('deletes a link when admin', () => {
    const link = createLink(db, { category_id: categoryId, name: 'Plex', url: 'http://plex', icon_type: 'builtin' })
    const result = handleDeleteLink(db, link.id, true)
    expect(result.status).toBe(200)
  })

  it('returns 401 when not admin', () => {
    const link = createLink(db, { name: 'App', url: 'http://app', icon_type: 'builtin' })
    const result = handleDeleteLink(db, link.id, false)
    expect(result.status).toBe(401)
  })

  it('returns 400 when id is NaN', () => {
    const result = handleDeleteLink(db, NaN, true)
    expect(result.status).toBe(400)
  })

  it('returns 404 when link not found', () => {
    const result = handleDeleteLink(db, 999, true)
    expect(result.status).toBe(404)
  })
})
