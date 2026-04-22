import type Database from "better-sqlite3";
import {
  getAllLinks,
  createLink,
  updateLink,
  deleteLink,
} from "@/lib/repositories/links";
import type { CreateLinkInput, UpdateLinkInput } from "@/lib/types";
import { VALID_ICON_TYPES } from "@/lib/types";

export function handleGetLinks(db: Database.Database, userId: number) {
  return getAllLinks(db, userId);
}

export function handleCreateLink(
  db: Database.Database,
  userId: number,
  body: Partial<CreateLinkInput>,
) {
  if (!body.name?.trim()) return { error: "Name is required", status: 400 };
  if (!body.url?.trim()) return { error: "URL is required", status: 400 };
  if (!body.icon_type || !VALID_ICON_TYPES.includes(body.icon_type)) {
    return { error: "icon_type must be builtin, upload, or url", status: 400 };
  }

  const link = createLink(db, userId, {
    category_id: body.category_id ?? null,
    name: body.name.trim(),
    url: body.url.trim(),
    url_alt:
      typeof body.url_alt === "string" && body.url_alt.trim()
        ? body.url_alt.trim()
        : null,
    icon_type: body.icon_type,
    icon_value: body.icon_value ?? null,
    sort_order: body.sort_order ?? 0,
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
  if (body.icon_type && !VALID_ICON_TYPES.includes(body.icon_type)) {
    return { error: "Invalid icon_type", status: 400 };
  }

  const updated = updateLink(db, userId, id, body);
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
