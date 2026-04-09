import { createTestDb } from '@/lib/db'
import { createCategory } from '@/lib/repositories/categories'
import { createLink } from '@/lib/repositories/links'
import { getCategoriesWithLinks, getUncategorizedLinks } from '@/lib/repositories/categories'
import { handleImport } from './handler'

const validPayload = {
  version: 1 as const,
  exported_at: '2024-01-01T00:00:00.000Z',
  categories: [
    {
      name: 'Media',
      sort_order: 0,
      links: [
        { name: 'Plex', url: 'http://plex', icon_type: 'builtin' as const, icon_value: 'plex', sort_order: 0 },
      ],
    },
  ],
  uncategorized: [
    { name: 'Misc', url: 'http://misc', icon_type: 'builtin' as const, icon_value: null, sort_order: 0 },
  ],
}

describe('import handler', () => {
  it('returns 401 if not admin', () => {
    const db = createTestDb()
    const result = handleImport(db, validPayload, false)
    expect(result.status).toBe(401)
  })

  it('returns 400 for missing version', () => {
    const db = createTestDb()
    const result = handleImport(db, { categories: [], uncategorized: [] }, true)
    expect(result.status).toBe(400)
  })

  it('returns 400 for missing categories array', () => {
    const db = createTestDb()
    const result = handleImport(db, { version: 1, uncategorized: [] }, true)
    expect(result.status).toBe(400)
  })

  it('returns 400 for link missing name', () => {
    const db = createTestDb()
    const result = handleImport(db, {
      version: 1,
      categories: [],
      uncategorized: [{ url: 'http://x', icon_type: 'builtin' }],
    }, true)
    expect(result.status).toBe(400)
  })

  it('returns 400 for link with invalid icon_type', () => {
    const db = createTestDb()
    const result = handleImport(db, {
      version: 1,
      categories: [],
      uncategorized: [{ name: 'X', url: 'http://x', icon_type: 'bad' }],
    }, true)
    expect(result.status).toBe(400)
  })

  it('imports categories and links', () => {
    const db = createTestDb()
    const result = handleImport(db, validPayload, true)
    expect(result.status).toBe(200)
    const categories = getCategoriesWithLinks(db)
    expect(categories).toHaveLength(1)
    expect(categories[0].name).toBe('Media')
    expect(categories[0].links).toHaveLength(1)
    expect(categories[0].links[0].name).toBe('Plex')
  })

  it('imports uncategorized links with null category_id', () => {
    const db = createTestDb()
    handleImport(db, validPayload, true)
    const uncategorized = getUncategorizedLinks(db)
    expect(uncategorized).toHaveLength(1)
    expect(uncategorized[0].name).toBe('Misc')
    expect(uncategorized[0].category_id).toBeNull()
  })

  it('replaces all existing data', () => {
    const db = createTestDb()
    const cat = createCategory(db, { name: 'Old', sort_order: 0 })
    createLink(db, { category_id: cat.id, name: 'OldLink', url: 'http://old', icon_type: 'builtin', icon_value: null, sort_order: 0 })

    handleImport(db, validPayload, true)

    const categories = getCategoriesWithLinks(db)
    expect(categories).toHaveLength(1)
    expect(categories.find(c => c.name === 'Old')).toBeUndefined()
  })

  it('handles import with no categories or links', () => {
    const db = createTestDb()
    const result = handleImport(db, { version: 1, exported_at: '', categories: [], uncategorized: [] }, true)
    expect(result.status).toBe(200)
    expect(getCategoriesWithLinks(db)).toHaveLength(0)
    expect(getUncategorizedLinks(db)).toHaveLength(0)
  })
})
