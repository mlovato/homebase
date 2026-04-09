import { DASHBOARD_ICONS_CDN, DASHBOARD_ICONS_METADATA_URL } from '@/lib/constants'

export const METADATA_URL = DASHBOARD_ICONS_METADATA_URL
export const CDN_BASE = DASHBOARD_ICONS_CDN

interface RawMeta {
  aliases?: string[]
}

interface IconEntry {
  slug: string
  name: string
  aliases: string[]
}

export interface IconResult {
  slug: string
  name: string
  url: string
}

let cache: IconEntry[] | null = null

export function clearCache(): void {
  cache = null
}

async function loadIcons(fetchFn: typeof fetch): Promise<IconEntry[]> {
  if (cache) return cache
  const res = await fetchFn(METADATA_URL, { next: { revalidate: 86400 } } as RequestInit)
  const raw: Record<string, RawMeta> = await res.json()
  cache = Object.entries(raw).map(([slug, meta]) => ({
    slug,
    name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    aliases: meta.aliases ?? [],
  }))
  return cache
}

export async function searchIcons(
  q: string,
  fetchFn: typeof fetch = fetch
): Promise<IconResult[]> {
  const query = q.toLowerCase().trim()
  if (query.length < 2) return []

  const icons = await loadIcons(fetchFn)
  return icons
    .filter(icon =>
      icon.slug.includes(query) ||
      icon.name.toLowerCase().includes(query) ||
      icon.aliases.some(a => a.toLowerCase().includes(query))
    )
    .slice(0, 8)
    .map(({ slug, name }) => ({ slug, name, url: `${CDN_BASE}/${slug}.svg` }))
}
