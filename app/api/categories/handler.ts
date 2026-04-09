import type Database from 'better-sqlite3'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
  getCategoriesWithLinks,
  getUncategorizedLinks,
} from '@/lib/repositories/categories'
import type { CreateCategoryInput, UpdateCategoryInput } from '@/lib/types'

export function handleGetCategories(db: Database.Database) {
  return {
    categories: getCategoriesWithLinks(db),
    uncategorized: getUncategorizedLinks(db),
  }
}

export function handleCreateCategory(
  db: Database.Database,
  body: Partial<CreateCategoryInput>,
  isAdmin: boolean
) {
  if (!isAdmin) return { error: 'Unauthorized', status: 401 }
  if (!body.name?.trim()) return { error: 'Name is required', status: 400 }

  const category = createCategory(db, { name: body.name.trim(), sort_order: body.sort_order ?? 0 })
  return { data: category, status: 201 }
}

export function handleUpdateCategory(
  db: Database.Database,
  id: number,
  body: Partial<UpdateCategoryInput>,
  isAdmin: boolean
) {
  if (!isAdmin) return { error: 'Unauthorized', status: 401 }
  if (isNaN(id)) return { error: 'Invalid id', status: 400 }

  const updated = updateCategory(db, id, body)
  if (!updated) return { error: 'Not found', status: 404 }

  return { data: updated, status: 200 }
}

export function handleDeleteCategory(
  db: Database.Database,
  id: number,
  isAdmin: boolean
) {
  if (!isAdmin) return { error: 'Unauthorized', status: 401 }
  if (isNaN(id)) return { error: 'Invalid id', status: 400 }

  const deleted = deleteCategory(db, id)
  if (!deleted) return { error: 'Not found', status: 404 }

  return { data: { ok: true }, status: 200 }
}
