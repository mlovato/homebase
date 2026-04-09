export type IconType = 'builtin' | 'upload' | 'url'

export type HealthCheckInterval = '10s' | '30s' | '60s' | 'never'

export const HEALTH_CHECK_INTERVALS: HealthCheckInterval[] = ['10s', '30s', '60s', 'never']

export const INTERVAL_TO_MS: Record<HealthCheckInterval, number | null> = {
  '10s': 10000,
  '30s': 30000,
  '60s': 60000,
  'never': null,
}

export const DEFAULT_HEALTH_CHECK_INTERVAL: HealthCheckInterval = '30s'

export type SearchShortcut = string

export const DEFAULT_SEARCH_SHORTCUT: SearchShortcut = 'mod+k'

export function parseShortcut(shortcut: SearchShortcut): { mod: boolean; key: string } {
  const hasMod = shortcut.startsWith('mod+')
  return { mod: hasMod, key: hasMod ? shortcut.slice(4) : shortcut }
}

export function formatShortcut(shortcut: SearchShortcut): string {
  if (!shortcut) return formatShortcut(DEFAULT_SEARCH_SHORTCUT)
  const { mod, key } = parseShortcut(shortcut)
  const upper = key.toUpperCase()
  return mod ? `⌘${upper} / Ctrl ${upper}` : upper
}

export function isValidShortcut(shortcut: string): boolean {
  return /^(mod\+)?[a-z0-9`~!@#$%^&*()\-=[\]\\;',./ ]$/i.test(shortcut)
}

export interface Category {
  id: number
  name: string
  sort_order: number
}

export interface Link {
  id: number
  category_id: number | null
  name: string
  url: string
  icon_type: IconType
  icon_value: string | null
  sort_order: number
}

export interface CategoryWithLinks extends Category {
  links: Link[]
}

export interface CreateCategoryInput {
  name: string
  sort_order?: number
}

export interface UpdateCategoryInput {
  name?: string
  sort_order?: number
}

export interface CreateLinkInput {
  category_id?: number | null
  name: string
  url: string
  icon_type: IconType
  icon_value?: string | null
  sort_order?: number
}

export interface UpdateLinkInput {
  category_id?: number | null
  name?: string
  url?: string
  icon_type?: IconType
  icon_value?: string | null
  sort_order?: number
}
