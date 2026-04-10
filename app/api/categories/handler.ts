import type Database from 'better-sqlite3'
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesWithLinks,
  getUncategorizedLinks,
} from '@/lib/repositories/categories'
import type { CreateCategoryInput, UpdateCategoryInput } from '@/lib/types'

export function handleGetCategories(db: Database.Database, userId: number) {
  return {
    categories: getCategoriesWithLinks(db, userId),
    uncategorized: getUncategorizedLinks(db, userId),
  }
}

export function handleCreateCategory(
  db: Database.Database,
  userId: number,
  body: Partial<CreateCategoryInput>
) {
  if (!body.name?.trim()) return { error: 'Name is required', status: 400 }

  const category = createCategory(db, userId, { name: body.name.trim(), sort_order: body.sort_order ?? 0 })
  return { data: category, status: 201 }
}

export function handleUpdateCategory(
  db: Database.Database,
  userId: number,
  id: number,
  body: Partial<UpdateCategoryInput>
) {
  if (isNaN(id)) return { error: 'Invalid id', status: 400 }

  const updated = updateCategory(db, userId, id, body)
  if (!updated) return { error: 'Not found', status: 404 }

  return { data: updated, status: 200 }
}

export function handleDeleteCategory(
  db: Database.Database,
  userId: number,
  id: number
) {
  if (isNaN(id)) return { error: 'Invalid id', status: 400 }

  const deleted = deleteCategory(db, userId, id)
  if (!deleted) return { error: 'Not found', status: 404 }

  return { data: { ok: true }, status: 200 }
}
