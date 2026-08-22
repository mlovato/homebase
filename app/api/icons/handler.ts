import {
  DASHBOARD_ICONS_CDN,
  DASHBOARD_ICONS_METADATA_URL,
} from "@/lib/constants";
import { withFetchTimeout } from "@/lib/fetchTimeout";

export const METADATA_URL = DASHBOARD_ICONS_METADATA_URL;
export const CDN_BASE = DASHBOARD_ICONS_CDN;

interface RawMeta {
  aliases?: string[];
}

interface IconEntry {
  slug: string;
  name: string;
  aliases: string[];
}

export interface IconResult {
  slug: string;
  name: string;
  url: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** After a failed refresh, wait this long before hammering upstream again. */
const CACHE_RETRY_MS = 5 * 60 * 1000;

let cache: { entries: IconEntry[]; expiresAt: number } | null = null;

export function clearCache(): void {
  cache = null;
}

async function loadIcons(fetchFn: typeof fetch): Promise<IconEntry[]> {
  // TTL so a long-running container picks up newly published icons, and neither
  // a failed nor an empty response can poison the cache until the next restart.
  if (cache && cache.expiresAt > Date.now()) return cache.entries;

  const serveStale = () => {
    if (cache) cache.expiresAt = Date.now() + CACHE_RETRY_MS;
    return cache?.entries ?? [];
  };

  const res = await withFetchTimeout((signal) =>
    fetchFn(METADATA_URL, {
      signal,
      next: { revalidate: CACHE_TTL_MS / 1000 },
    } as RequestInit),
  );
  if (!res.ok) return serveStale();

  const raw: Record<string, RawMeta> = await res.json();
  const entries = Object.entries(raw).map(([slug, meta]) => ({
    slug,
    name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    aliases: meta.aliases ?? [],
  }));
  if (entries.length === 0) return serveStale();

  cache = { entries, expiresAt: Date.now() + CACHE_TTL_MS };
  return entries;
}

export async function searchIcons(
  q: string,
  fetchFn: typeof fetch = fetch,
): Promise<IconResult[]> {
  const query = q.toLowerCase().trim();
  if (query.length < 2) return [];

  const icons = await loadIcons(fetchFn);

  function rank(icon: IconEntry): number {
    if (icon.slug === query) return 0;
    if (icon.slug.startsWith(query)) return 1;
    if (icon.slug.includes(query)) return 2;
    const name = icon.name.toLowerCase();
    if (name === query) return 3;
    if (name.startsWith(query)) return 4;
    return 5;
  }

  return icons
    .filter(
      (icon) =>
        icon.slug.includes(query) ||
        icon.name.toLowerCase().includes(query) ||
        icon.aliases.some((a) => a.toLowerCase().includes(query)),
    )
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 8)
    .map(({ slug, name }) => ({ slug, name, url: `${CDN_BASE}/${slug}.svg` }));
}
