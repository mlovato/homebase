import type Database from "better-sqlite3";
import type { Link, CreateLinkInput, UpdateLinkInput } from "@/lib/types";

export function createLink(
  db: Database.Database,
  userId: number,
  input: CreateLinkInput,
): Link {
  const stmt = db.prepare(`
    INSERT INTO links (user_id, category_id, name, url, url_alt, icon_type, icon_value, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id, category_id, name, url, url_alt, icon_type, icon_value, sort_order
  `);
  return stmt.get(
    userId,
    input.category_id ?? null,
    input.name,
    input.url,
    input.url_alt ?? null,
    input.icon_type,
    input.icon_value ?? null,
    input.sort_order ?? 0,
  ) as Link;
}

export function getLinksByCategoryId(
  db: Database.Database,
  userId: number,
  categoryId: number,
): Link[] {
  return db
    .prepare(
      "SELECT id, category_id, name, url, url_alt, icon_type, icon_value, sort_order FROM links WHERE user_id = ? AND category_id = ? ORDER BY sort_order ASC, id ASC",
    )
    .all(userId, categoryId) as Link[];
}

export function getAllLinks(db: Database.Database, userId: number): Link[] {
  return db
    .prepare(
      "SELECT id, category_id, name, url, url_alt, icon_type, icon_value, sort_order FROM links WHERE user_id = ? ORDER BY sort_order ASC, id ASC",
    )
    .all(userId) as Link[];
}

export function getLinkById(
  db: Database.Database,
  userId: number,
  id: number,
): Link | undefined {
  return db
    .prepare(
      "SELECT id, category_id, name, url, url_alt, icon_type, icon_value, sort_order FROM links WHERE id = ? AND user_id = ?",
    )
    .get(id, userId) as Link | undefined;
}

export function updateLink(
  db: Database.Database,
  userId: number,
  id: number,
  input: UpdateLinkInput,
): Link | undefined {
  const existing = getLinkById(db, userId, id);
  if (!existing) return undefined;

  const updated = { ...existing, ...input };
  db.prepare(
    `
    UPDATE links
    SET category_id = ?, name = ?, url = ?, url_alt = ?, icon_type = ?, icon_value = ?, sort_order = ?
    WHERE id = ? AND user_id = ?
  `,
  ).run(
    updated.category_id ?? null,
    updated.name,
    updated.url,
    updated.url_alt ?? null,
    updated.icon_type,
    updated.icon_value ?? null,
    updated.sort_order,
    id,
    userId,
  );
  return getLinkById(db, userId, id);
}

export function deleteLink(
  db: Database.Database,
  userId: number,
  id: number,
): boolean {
  const result = db
    .prepare("DELETE FROM links WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return result.changes > 0;
}
