import type Database from "better-sqlite3";
import { createCategory } from "@/lib/repositories/categories";
import { createLink } from "@/lib/repositories/links";
import type { ExportData, IconType } from "@/lib/types";
import { VALID_ICON_TYPES } from "@/lib/types";

function isValidLink(l: unknown): boolean {
  if (!l || typeof l !== "object") return false;
  const link = l as Record<string, unknown>;
  return (
    typeof link.name === "string" &&
    link.name.trim() !== "" &&
    typeof link.url === "string" &&
    link.url.trim() !== "" &&
    VALID_ICON_TYPES.includes(link.icon_type as IconType)
  );
}

function isValidBody(data: unknown): data is ExportData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (!Array.isArray(d.categories)) return false;
  if (!Array.isArray(d.uncategorized)) return false;
  if (
    !d.categories.every((c: unknown) => {
      if (!c || typeof c !== "object") return false;
      const cat = c as Record<string, unknown>;
      return (
        typeof cat.name === "string" &&
        cat.name.trim() !== "" &&
        Array.isArray(cat.links) &&
        cat.links.every(isValidLink)
      );
    })
  )
    return false;
  return d.uncategorized.every(isValidLink);
}

export function handleImport(
  db: Database.Database,
  userId: number,
  body: unknown,
) {
  if (!isValidBody(body))
    return { error: "Invalid import format", status: 400 };

  db.transaction(() => {
    db.prepare("DELETE FROM links WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM categories WHERE user_id = ?").run(userId);

    for (const cat of body.categories) {
      const created = createCategory(db, userId, {
        name: cat.name,
        sort_order: cat.sort_order ?? 0,
      });
      for (const link of cat.links) {
        createLink(db, userId, {
          category_id: created.id,
          name: link.name,
          url: link.url,
          icon_type: link.icon_type,
          icon_value: link.icon_value ?? null,
          sort_order: link.sort_order ?? 0,
        });
      }
    }

    for (const link of body.uncategorized) {
      createLink(db, userId, {
        category_id: null,
        name: link.name,
        url: link.url,
        icon_type: link.icon_type,
        icon_value: link.icon_value ?? null,
        sort_order: link.sort_order ?? 0,
      });
    }
  })();

  return { data: { ok: true }, status: 200 };
}
