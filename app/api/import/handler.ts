import type Database from "better-sqlite3";
import { storedUploadExists } from "@/lib/uploads";
import { createCategory } from "@/lib/repositories/categories";
import { createLink } from "@/lib/repositories/links";
import type { ExportData, ExportedLink, IconType } from "@/lib/types";
import { VALID_ICON_TYPES } from "@/lib/types";
import {
  isFilledString,
  isHttpUrl,
  isOptionalHttpUrl,
  isOptionalSortOrder,
  isOptionalText,
} from "@/lib/validation";

/**
 * How many uploaded icons the import refers to but the store does not have.
 *
 * An export names those files without carrying them, so restoring a backup on
 * another machine leaves those cards with no icon of their own. Reporting the
 * count is what stops that being silent. Counted per distinct file, since the
 * same icon may be reused by several links.
 */
function countMissingIcons(
  links: ExportedLink[],
  iconExists: (iconValue: string) => boolean,
): number {
  const uploaded = new Set(
    links
      .filter((link) => link.icon_type === "upload" && link.icon_value)
      .map((link) => link.icon_value as string),
  );
  return [...uploaded].filter((icon) => !iconExists(icon)).length;
}

function isValidLink(l: unknown): boolean {
  if (!l || typeof l !== "object") return false;
  const link = l as Record<string, unknown>;
  return (
    isFilledString(link.name) &&
    isHttpUrl(link.url) &&
    isOptionalHttpUrl(link.url_alt) &&
    isOptionalSortOrder(link.sort_order) &&
    isOptionalText(link.icon_value) &&
    VALID_ICON_TYPES.includes(link.icon_type as IconType)
  );
}

function hasDuplicateCategoryNames(categories: { name: string }[]): boolean {
  const seen = new Set<string>();
  for (const cat of categories) {
    const key = cat.name.trim().toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
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
        isFilledString(cat.name) &&
        isOptionalSortOrder(cat.sort_order) &&
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
  iconExists: (iconValue: string) => boolean = storedUploadExists,
) {
  if (!isValidBody(body))
    return { error: "Invalid import format", status: 400 };
  // The categories API rejects duplicate names, so importing them would create
  // rows the user can never rename afterwards.
  if (hasDuplicateCategoryNames(body.categories))
    return { error: "Duplicate category names in import", status: 400 };

  db.transaction(() => {
    db.prepare("DELETE FROM links WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM categories WHERE user_id = ?").run(userId);

    for (const cat of body.categories) {
      const created = createCategory(db, userId, {
        name: cat.name.trim(),
        sort_order: cat.sort_order,
      });
      for (const link of cat.links) {
        createLink(db, userId, {
          category_id: created.id,
          name: link.name.trim(),
          url: link.url.trim(),
          url_alt: link.url_alt ?? null,
          icon_type: link.icon_type,
          icon_value: link.icon_value ?? null,
          sort_order: link.sort_order,
        });
      }
    }

    for (const link of body.uncategorized) {
      createLink(db, userId, {
        category_id: null,
        name: link.name.trim(),
        url: link.url.trim(),
        url_alt: link.url_alt ?? null,
        icon_type: link.icon_type,
        icon_value: link.icon_value ?? null,
        sort_order: link.sort_order,
      });
    }
  })();

  const allLinks = [
    ...body.categories.flatMap((c) => c.links),
    ...body.uncategorized,
  ];
  return {
    data: { ok: true, missingIcons: countMissingIcons(allLinks, iconExists) },
    status: 200,
  };
}
