import {
  DASHBOARD_ICONS_CDN,
  DASHBOARD_ICONS_METADATA_URL,
} from "@/lib/constants";
import { withFetchTimeout } from "@/lib/fetchTimeout";
import { fuzzyMatches } from "@/lib/fuzzy";

export const METADATA_URL = DASHBOARD_ICONS_METADATA_URL;
export const CDN_BASE = DASHBOARD_ICONS_CDN;

interface RawMeta {
  aliases?: string[];
}

interface IconEntry {
  slug: string;
  name: string;
  /** Lowercased once when the list is cached, not once per search. */
  nameLower: string;
  aliasesLower: string[];
}

export interface IconResult {
  slug: string;
  name: string;
  url: string;
}

const MAX_RESULTS = 8;
/** Ranks above every match tier, so a filter can read it as "no match". */
const NO_MATCH = Number.MAX_SAFE_INTEGER;

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

  try {
    const raw = await withFetchTimeout(async (signal) => {
      const res = await fetchFn(METADATA_URL, {
        signal,
        next: { revalidate: CACHE_TTL_MS / 1000 },
      } as RequestInit);
      return res.ok ? ((await res.json()) as Record<string, RawMeta>) : null;
    });
    if (!raw) return serveStale();

    const entries = Object.entries(raw).map(([slug, meta]) => {
      const name = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        slug,
        name,
        nameLower: name.toLowerCase(),
        aliasesLower: (meta.aliases ?? []).map((a) => a.toLowerCase()),
      };
    });
    if (entries.length === 0) return serveStale();

    cache = { entries, expiresAt: Date.now() + CACHE_TTL_MS };
    return entries;
  } catch (error) {
    // A timeout, connection reset or unparsable body is the usual way a refresh
    // fails, and it arrives as a rejection rather than a non-ok response. It
    // must not throw away a cache that is still perfectly usable. With nothing
    // cached there is nothing to serve, so the failure stays loud.
    if (!cache) throw error;
    return serveStale();
  }
}

export async function searchIcons(
  q: string,
  fetchFn: typeof fetch = fetch,
): Promise<IconResult[]> {
  const query = q.toLowerCase().trim();
  if (query.length < 2) return [];

  const icons = await loadIcons(fetchFn);

  // One score per icon decides both whether it matches and how well, so the two
  // can never disagree, and it is computed once rather than inside the sort.
  function rank(icon: IconEntry): number {
    if (icon.slug === query) return 0;
    if (icon.slug.startsWith(query)) return 1;
    if (icon.slug.includes(query)) return 2;
    if (icon.nameLower === query) return 3;
    if (icon.nameLower.startsWith(query)) return 4;
    if (icon.nameLower.includes(query)) return 5;
    if (icon.aliasesLower.some((a) => a.includes(query))) return 6;
    // Only a subsequence, so it sits below every literal match.
    if (fuzzyMatches(query, icon.slug) || fuzzyMatches(query, icon.nameLower)) {
      return 7;
    }
    return NO_MATCH;
  }

  return icons
    .map((icon) => ({ icon, score: rank(icon) }))
    .filter(({ score }) => score !== NO_MATCH)
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_RESULTS)
    .map(({ icon }) => ({
      slug: icon.slug,
      name: icon.name,
      url: `${CDN_BASE}/${icon.slug}.svg`,
    }));
}
