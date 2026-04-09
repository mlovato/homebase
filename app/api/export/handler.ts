import type Database from 'better-sqlite3'
import { getCategoriesWithLinks, getUncategorizedLinks } from '@/lib/repositories/categories'
import type { ExportData } from '@/lib/types'

export function handleExport(db: Database.Database): ExportData {
  const categories = getCategoriesWithLinks(db)
  const uncategorized = getUncategorizedLinks(db)

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    categories: categories.map(c => ({
      name: c.name,
      sort_order: c.sort_order,
      links: c.links.map(l => ({
        name: l.name,
        url: l.url,
        icon_type: l.icon_type,
        icon_value: l.icon_value,
        sort_order: l.sort_order,
      })),
    })),
    uncategorized: uncategorized.map(l => ({
      name: l.name,
      url: l.url,
      icon_type: l.icon_type,
      icon_value: l.icon_value,
      sort_order: l.sort_order,
    })),
  }
}
