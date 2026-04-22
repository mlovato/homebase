import type Database from "better-sqlite3";
import {
  getCategoriesWithLinks,
  getUncategorizedLinks,
} from "@/lib/repositories/categories";
import type { ExportData, ExportedLink, Link } from "@/lib/types";

function mapLink(l: Link): ExportedLink {
  return {
    name: l.name,
    url: l.url,
    url_alt: l.url_alt,
    icon_type: l.icon_type,
    icon_value: l.icon_value,
    sort_order: l.sort_order,
  };
}

export function handleExport(
  db: Database.Database,
  userId: number,
): ExportData {
  const categories = getCategoriesWithLinks(db, userId);
  const uncategorized = getUncategorizedLinks(db, userId);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    categories: categories.map((c) => ({
      name: c.name,
      sort_order: c.sort_order,
      links: c.links.map(mapLink),
    })),
    uncategorized: uncategorized.map(mapLink),
  };
}
