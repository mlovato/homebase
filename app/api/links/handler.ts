import type Database from 'better-sqlite3'
import {
  getAllLinks,
  createLink,
  updateLink,
  deleteLink,
  getLinkById,
} from '@/lib/repositories/links'
import type { CreateLinkInput, UpdateLinkInput, IconType } from '@/lib/types'

const VALID_ICON_TYPES: IconType[] = ['builtin', 'upload', 'url']

export function handleGetLinks(db: Database.Database) {
  return getAllLinks(db)
}

export function handleCreateLink(
  db: Database.Database,
  body: Partial<CreateLinkInput>,
  isAdmin: boolean
) {
  if (!isAdmin) return { error: 'Unauthorized', status: 401 }
  if (!body.name?.trim()) return { error: 'Name is required', status: 400 }
  if (!body.url?.trim()) return { error: 'URL is required', status: 400 }
  if (!body.icon_type || !VALID_ICON_TYPES.includes(body.icon_type)) {
    return { error: 'icon_type must be builtin, upload, or url', status: 400 }
  }

  const link = createLink(db, {
    category_id: body.category_id ?? null,
    name: body.name.trim(),
    url: body.url.trim(),
    icon_type: body.icon_type,
    icon_value: body.icon_value ?? null,
    sort_order: body.sort_order ?? 0,
  })
  return { data: link, status: 201 }
}

export function handleUpdateLink(
  db: Database.Database,
  id: number,
  body: Partial<UpdateLinkInput>,
  isAdmin: boolean
) {
  if (!isAdmin) return { error: 'Unauthorized', status: 401 }
  if (isNaN(id)) return { error: 'Invalid id', status: 400 }
  if (body.icon_type && !VALID_ICON_TYPES.includes(body.icon_type)) {
    return { error: 'Invalid icon_type', status: 400 }
  }

  const updated = updateLink(db, id, body)
  if (!updated) return { error: 'Not found', status: 404 }

  return { data: updated, status: 200 }
}

export function handleDeleteLink(
  db: Database.Database,
  id: number,
  isAdmin: boolean
) {
  if (!isAdmin) return { error: 'Unauthorized', status: 401 }
  if (isNaN(id)) return { error: 'Invalid id', status: 400 }

  const deleted = deleteLink(db, id)
  if (!deleted) return { error: 'Not found', status: 404 }

  return { data: { ok: true }, status: 200 }
}
