import type Database from "better-sqlite3";
import {
  getAllLinks,
  createLink,
  updateLink,
  deleteLink,
} from "@/lib/repositories/links";
import { getCategoryById } from "@/lib/repositories/categories";
import type { CreateLinkInput, UpdateLinkInput } from "@/lib/types";
import { VALID_ICON_TYPES } from "@/lib/types";
import {
  isFilledString,
  isHttpUrl,
  isOptionalHttpUrl,
  isOptionalSortOrder,
  SORT_ORDER_ERROR,
} from "@/lib/validation";

const URL_ERROR = "URL must start with http:// or https://";
const ALT_URL_ERROR = "Alternative URL must start with http:// or https://";

/**
 * A link pointing at someone else's category satisfies the foreign key, but the
 * dashboard and the export both read links per category, so it silently
 * disappears from each of them; a link pointing at a category that does not
 * exist fails the foreign key and surfaces as an opaque 500.
 */
function ownsCategory(
  db: Database.Database,
  userId: number,
  categoryId: number | null | undefined,
): boolean {
  if (categoryId == null) return true;
  return getCategoryById(db, userId, categoryId) !== undefined;
}

export function handleGetLinks(db: Database.Database, userId: number) {
  return getAllLinks(db, userId);
}

export function handleCreateLink(
  db: Database.Database,
  userId: number,
  body: Partial<CreateLinkInput>,
) {
  if (!isFilledString(body.name))
    return { error: "Name is required", status: 400 };
  if (!isFilledString(body.url))
    return { error: "URL is required", status: 400 };
  if (!isHttpUrl(body.url)) return { error: URL_ERROR, status: 400 };
  if (!isOptionalHttpUrl(body.url_alt))
    return { error: ALT_URL_ERROR, status: 400 };
  if (!isOptionalSortOrder(body.sort_order)) {
    return { error: SORT_ORDER_ERROR, status: 400 };
  }
  if (!body.icon_type || !VALID_ICON_TYPES.includes(body.icon_type)) {
    return { error: "icon_type must be builtin, upload, or url", status: 400 };
  }
  if (!ownsCategory(db, userId, body.category_id)) {
    return { error: "Category not found", status: 404 };
  }

  const link = createLink(db, userId, {
    category_id: body.category_id ?? null,
    name: body.name.trim(),
    url: body.url.trim(),
    url_alt: body.url_alt,
    icon_type: body.icon_type,
    icon_value: body.icon_value ?? null,
    sort_order: body.sort_order,
  });
  return { data: link, status: 201 };
}

export function handleUpdateLink(
  db: Database.Database,
  userId: number,
  id: number,
  body: Partial<UpdateLinkInput>,
) {
  if (isNaN(id)) return { error: "Invalid id", status: 400 };

  // Blanking a field is not the same as omitting it: an empty name leaves the
  // card with no label, and an empty url renders href="" so the card navigates
  // back to the dashboard. Creating rejects both, so updating must too.
  if (body.name !== undefined && !isFilledString(body.name)) {
    return { error: "Name is required", status: 400 };
  }
  if (body.url !== undefined) {
    if (!isFilledString(body.url))
      return { error: "URL is required", status: 400 };
    if (!isHttpUrl(body.url)) return { error: URL_ERROR, status: 400 };
  }
  if (body.url_alt !== undefined && !isOptionalHttpUrl(body.url_alt)) {
    return { error: ALT_URL_ERROR, status: 400 };
  }
  if (!isOptionalSortOrder(body.sort_order)) {
    return { error: SORT_ORDER_ERROR, status: 400 };
  }
  if (
    body.icon_type !== undefined &&
    !VALID_ICON_TYPES.includes(body.icon_type)
  ) {
    return { error: "icon_type must be builtin, upload, or url", status: 400 };
  }
  if (!ownsCategory(db, userId, body.category_id)) {
    return { error: "Category not found", status: 404 };
  }

  // Spread conditionally: `updateLink` merges over the existing row, so an own
  // key holding `undefined` would overwrite the stored value with NULL.
  const updated = updateLink(db, userId, id, {
    ...body,
    ...(body.name !== undefined && { name: body.name.trim() }),
    ...(body.url !== undefined && { url: body.url.trim() }),
  });
  if (!updated) return { error: "Not found", status: 404 };

  return { data: updated, status: 200 };
}

export function handleDeleteLink(
  db: Database.Database,
  userId: number,
  id: number,
) {
  if (isNaN(id)) return { error: "Invalid id", status: 400 };

  const deleted = deleteLink(db, userId, id);
  if (!deleted) return { error: "Not found", status: 404 };

  return { data: { ok: true }, status: 200 };
}
