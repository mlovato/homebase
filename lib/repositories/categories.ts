import type Database from "better-sqlite3";
import type {
  Category,
  CategoryWithLinks,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/types";

function getNextSortOrder(db: Database.Database, userId: number): number {
  const row = db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) AS current_max FROM categories WHERE user_id = ?",
    )
    .get(userId) as { current_max: number };
  return row.current_max + 1;
}

export function createCategory(
  db: Database.Database,
  userId: number,
  input: CreateCategoryInput,
): Category {
  const sortOrder = input.sort_order ?? getNextSortOrder(db, userId);
  const stmt = db.prepare(
    "INSERT INTO categories (user_id, name, sort_order) VALUES (?, ?, ?) RETURNING id, name, sort_order",
  );
  return stmt.get(userId, input.name, sortOrder) as Category;
}

export function getCategories(
  db: Database.Database,
  userId: number,
): Category[] {
  return db
    .prepare(
      "SELECT id, name, sort_order FROM categories WHERE user_id = ? ORDER BY sort_order ASC, id ASC",
    )
    .all(userId) as Category[];
}

export function getCategoryById(
  db: Database.Database,
  userId: number,
  id: number,
): Category | undefined {
  return db
    .prepare(
      "SELECT id, name, sort_order FROM categories WHERE id = ? AND user_id = ?",
    )
    .get(id, userId) as Category | undefined;
}

export function updateCategory(
  db: Database.Database,
  userId: number,
  id: number,
  input: UpdateCategoryInput,
): Category | undefined {
  const existing = getCategoryById(db, userId, id);
  if (!existing) return undefined;

  const updated = { ...existing, ...input };
  db.prepare(
    "UPDATE categories SET name = ?, sort_order = ? WHERE id = ? AND user_id = ?",
  ).run(updated.name, updated.sort_order, id, userId);
  return getCategoryById(db, userId, id);
}

export function deleteCategory(
  db: Database.Database,
  userId: number,
  id: number,
): boolean {
  const result = db
    .prepare("DELETE FROM categories WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return result.changes > 0;
}

export function getCategoriesWithLinks(
  db: Database.Database,
  userId: number,
): CategoryWithLinks[] {
  const categories = getCategories(db, userId);
  const links = db
    .prepare(
      "SELECT id, category_id, name, url, url_alt, icon_type, icon_value, sort_order FROM links WHERE user_id = ? ORDER BY sort_order ASC, id ASC",
    )
    .all(userId) as import("@/lib/types").Link[];

  return categories.map((cat) => ({
    ...cat,
    links: links.filter((l) => l.category_id === cat.id),
  }));
}

export function getUncategorizedLinks(
  db: Database.Database,
  userId: number,
): import("@/lib/types").Link[] {
  return db
    .prepare(
      "SELECT id, category_id, name, url, url_alt, icon_type, icon_value, sort_order FROM links WHERE user_id = ? AND category_id IS NULL ORDER BY sort_order ASC, id ASC",
    )
    .all(userId) as import("@/lib/types").Link[];
}
