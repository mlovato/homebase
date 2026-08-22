import type Database from "better-sqlite3";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  getCategoriesWithLinks,
  getUncategorizedLinks,
} from "@/lib/repositories/categories";
import type { CreateCategoryInput, UpdateCategoryInput } from "@/lib/types";

export function handleGetCategories(db: Database.Database, userId: number) {
  return {
    categories: getCategoriesWithLinks(db, userId),
    uncategorized: getUncategorizedLinks(db, userId),
  };
}

export function handleCreateCategory(
  db: Database.Database,
  userId: number,
  body: Partial<CreateCategoryInput>,
) {
  if (!body.name?.trim()) return { error: "Name is required", status: 400 };

  const trimmed = body.name.trim();
  const existing = getCategories(db, userId);
  if (existing.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
    return {
      error: "A category with the same name already exists",
      status: 409,
    };
  }

  const category = createCategory(db, userId, {
    name: trimmed,
    sort_order: body.sort_order,
  });
  return { data: category, status: 201 };
}

export function handleUpdateCategory(
  db: Database.Database,
  userId: number,
  id: number,
  body: Partial<UpdateCategoryInput>,
) {
  if (isNaN(id)) return { error: "Invalid id", status: 400 };

  // Creating rejects a blank name, so accepting one here would leave a section
  // whose heading renders empty and cannot be told from any other.
  const name = body.name?.trim();
  if (body.name !== undefined && !name) {
    return { error: "Name is required", status: 400 };
  }

  if (name) {
    const existing = getCategories(db, userId);
    if (
      existing.some(
        (c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      return {
        error: "A category with the same name already exists",
        status: 409,
      };
    }
  }

  // Spread conditionally: `updateCategory` merges over the existing row, so an
  // own key holding `undefined` would overwrite the stored name with NULL.
  const updated = updateCategory(db, userId, id, {
    ...body,
    ...(name && { name }),
  });
  if (!updated) return { error: "Not found", status: 404 };

  return { data: updated, status: 200 };
}

export function handleDeleteCategory(
  db: Database.Database,
  userId: number,
  id: number,
) {
  if (isNaN(id)) return { error: "Invalid id", status: 400 };

  const deleted = deleteCategory(db, userId, id);
  if (!deleted) return { error: "Not found", status: 404 };

  return { data: { ok: true }, status: 200 };
}
