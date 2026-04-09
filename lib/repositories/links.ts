import type Database from 'better-sqlite3'
import type { Link, CreateLinkInput, UpdateLinkInput } from '@/lib/types'

export function createLink(db: Database.Database, input: CreateLinkInput): Link {
  const stmt = db.prepare(`
    INSERT INTO links (category_id, name, url, icon_type, icon_value, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `)
  return stmt.get(
    input.category_id ?? null,
    input.name,
    input.url,
    input.icon_type,
    input.icon_value ?? null,
    input.sort_order ?? 0
  ) as Link
}

export function getLinksByCategoryId(
  db: Database.Database,
  categoryId: number
): Link[] {
  return db
    .prepare('SELECT * FROM links WHERE category_id = ? ORDER BY sort_order ASC, id ASC')
    .all(categoryId) as Link[]
}

export function getAllLinks(db: Database.Database): Link[] {
  return db
    .prepare('SELECT * FROM links ORDER BY sort_order ASC, id ASC')
    .all() as Link[]
}

export function getLinkById(
  db: Database.Database,
  id: number
): Link | undefined {
  return db.prepare('SELECT * FROM links WHERE id = ?').get(id) as Link | undefined
}

export function updateLink(
  db: Database.Database,
  id: number,
  input: UpdateLinkInput
): Link | undefined {
  const existing = getLinkById(db, id)
  if (!existing) return undefined

  const updated = { ...existing, ...input }
  db.prepare(`
    UPDATE links
    SET category_id = ?, name = ?, url = ?, icon_type = ?, icon_value = ?, sort_order = ?
    WHERE id = ?
  `).run(
    updated.category_id ?? null,
    updated.name,
    updated.url,
    updated.icon_type,
    updated.icon_value ?? null,
    updated.sort_order,
    id
  )
  return getLinkById(db, id)
}

export function deleteLink(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM links WHERE id = ?').run(id)
  return result.changes > 0
}
