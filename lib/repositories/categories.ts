import type Database from 'better-sqlite3'
import type { Category, CategoryWithLinks, CreateCategoryInput, UpdateCategoryInput } from '@/lib/types'

export function createCategory(
  db: Database.Database,
  input: CreateCategoryInput
): Category {
  const stmt = db.prepare(
    'INSERT INTO categories (name, sort_order) VALUES (?, ?) RETURNING *'
  )
  return stmt.get(input.name, input.sort_order ?? 0) as Category
}

export function getCategories(db: Database.Database): Category[] {
  return db
    .prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC')
    .all() as Category[]
}

export function getCategoryById(
  db: Database.Database,
  id: number
): Category | undefined {
  return db
    .prepare('SELECT * FROM categories WHERE id = ?')
    .get(id) as Category | undefined
}

export function updateCategory(
  db: Database.Database,
  id: number,
  input: UpdateCategoryInput
): Category | undefined {
  const existing = getCategoryById(db, id)
  if (!existing) return undefined

  const updated = { ...existing, ...input }
  db.prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?').run(
    updated.name,
    updated.sort_order,
    id
  )
  return getCategoryById(db, id)
}

export function deleteCategory(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  return result.changes > 0
}

export function getCategoriesWithLinks(db: Database.Database): CategoryWithLinks[] {
  const categories = getCategories(db)
  const links = db
    .prepare('SELECT * FROM links ORDER BY sort_order ASC, id ASC')
    .all() as import('@/lib/types').Link[]

  return categories.map(cat => ({
    ...cat,
    links: links.filter(l => l.category_id === cat.id),
  }))
}

export function getUncategorizedLinks(db: Database.Database): import('@/lib/types').Link[] {
  return db
    .prepare('SELECT * FROM links WHERE category_id IS NULL ORDER BY sort_order ASC, id ASC')
    .all() as import('@/lib/types').Link[]
}
