import { createHash } from "crypto";
import { PROXYABLE_IMAGE_CONTENT_TYPES } from "@/lib/constants";
import { withFetchTimeout } from "@/lib/fetchTimeout";
import { createKeyedLimiter, createLimiter } from "@/lib/limiter";
import { createRefreshingCache } from "@/lib/refreshingCache";

/** Favicons are a few KB; anything past this is not an icon worth proxying. */
export const MAX_FAVICON_BYTES = 1024 * 1024;

/**
 * Sites scraped at once per hostname. A dashboard asks for every icon together,
 * and most self-hosted apps live on one machine on different ports: on the NAS
 * an unbounded burst of ~30 page renders pushed apps that answer in 0.2s alone
 * past the fetch timeout, while six at a time loaded all of them in about 1.5s.
 * Per hostname, so a host that never answers holds back only its own icons.
 */
const MAX_FETCHES_PER_HOST = 6;

/** Covers one machine reached under many hostnames, as behind a reverse proxy. */
const MAX_FETCHES_TOTAL = 12;

/**
 * An icon older than this is still served, but refetched behind the answer.
 * Favicons rarely change, and each refresh re-renders every site's page.
 */
const FAVICON_REFRESH_MS = 10 * 60 * 1000;

/** Bounds memory: each entry holds up to MAX_FAVICON_BYTES. */
const MAX_CACHED_FAVICONS = 200;

type FetchInit = { signal: AbortSignal };

interface PageResponse {
  ok: boolean;
  text: () => Promise<string>;
}

interface ImageResponse {
  ok: boolean;
  headers: { get: (name: string) => string | null };
  arrayBuffer: () => Promise<ArrayBuffer>;
}

type Fetcher<R> = (url: string, init?: FetchInit) => Promise<R>;

export interface FaviconImage {
  body: ArrayBuffer;
  contentType: string;
  etag: string;
}

// Quote-aware, so a `>` inside an attribute value (an inline SVG data: URI, for
// one) does not end the tag early.
const LINK_TAG_RE = /<link\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

// Each value runs to its own closing quote: the other kind of quote is legal
// inside it, and inline SVG data: URIs are full of them. Names are matched
// whole, so `data-base-href` (which GitHub ships beside `href`) is never read
// as `href`.
const ATTRIBUTE_RE =
  /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

function attributesOf(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const [, name, double, single, bare] of tag.matchAll(ATTRIBUTE_RE)) {
    const key = name.toLowerCase();
    // As in HTML, the first occurrence of a repeated attribute wins.
    if (!attributes.has(key)) attributes.set(key, double ?? single ?? bare);
  }
  return attributes;
}

function extractFaviconHref(html: string): string | null {
  for (const [tag] of html.matchAll(LINK_TAG_RE)) {
    const attributes = attributesOf(tag);
    const rel = attributes.get("rel")?.toLowerCase().split(/\s+/) ?? [];
    const href = attributes.get("href");
    if (rel.includes("icon") && href) return href;
  }
  return null;
}

/** The icon the page declares in a <link rel=icon>, as an absolute URL. */
async function findDeclaredFavicon(
  pageUrl: string,
  fetchFn: Fetcher<PageResponse>,
): Promise<string | null> {
  try {
    const html = await withFetchTimeout(async (signal) => {
      const res = await fetchFn(pageUrl, { signal });
      return res.ok ? res.text() : null;
    });
    const href = html ? extractFaviconHref(html) : null;
    return href ? new URL(href, pageUrl).href : null;
  } catch {
    return null;
  }
}

/**
 * Downloads a page's favicon: the icon its HTML declares, else the
 * conventional /favicon.ico — whichever first turns out to be a real image.
 */
export async function fetchFavicon(
  pageUrl: string,
  fetchFn: Fetcher<PageResponse & ImageResponse> = fetch,
): Promise<FaviconImage | null> {
  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    return null;
  }

  const declared = await findDeclaredFavicon(pageUrl, fetchFn);
  const candidates = new Set([declared, `${origin}/favicon.ico`]);
  for (const candidate of candidates) {
    if (!candidate) continue;
    const image = await fetchFaviconImage(candidate, fetchFn).catch(() => null);
    if (image) return image;
  }
  return null;
}

/** What a server that omits Content-Type on a favicon almost always means. */
const DEFAULT_CONTENT_TYPE = "image/x-icon";

/** Drops any `; charset=...` parameter so the value can be matched exactly. */
function normalizeContentType(raw: string | null): string {
  return (raw ?? DEFAULT_CONTENT_TYPE).split(";")[0].trim().toLowerCase();
}

/**
 * Downloads a resolved favicon, tagging it with a hash of its bytes so an
 * unchanged icon can be answered with a bodiless 304.
 *
 * Anything that is not an allow-listed image type is refused rather than
 * proxied, so the next candidate gets its turn.
 */
export async function fetchFaviconImage(
  faviconUrl: string,
  fetchFn: Fetcher<ImageResponse> = fetch,
): Promise<FaviconImage | null> {
  return withFetchTimeout(async (signal) => {
    const res = await fetchFn(faviconUrl, { signal });
    if (!res.ok) return null;

    if (Number(res.headers.get("content-length")) > MAX_FAVICON_BYTES)
      return null;

    const contentType = normalizeContentType(res.headers.get("content-type"));
    if (!PROXYABLE_IMAGE_CONTENT_TYPES.has(contentType)) return null;

    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_FAVICON_BYTES) return null;

    return {
      body,
      contentType,
      etag: `"${createHash("sha1").update(Buffer.from(body)).digest("hex")}"`,
    };
  });
}

const limitPerHost = createKeyedLimiter(MAX_FETCHES_PER_HOST);
const limitTotal = createLimiter(MAX_FETCHES_TOTAL);

const favicons = createRefreshingCache<FaviconImage>({
  // The hostname slot is taken first, so tasks queued behind a stalled host
  // wait without also holding one of the shared slots.
  load: async (pageUrl) =>
    limitPerHost(new URL(pageUrl).hostname, () =>
      limitTotal.run(() => fetchFavicon(pageUrl)),
    ),
  refreshAfterMs: FAVICON_REFRESH_MS,
  maxEntries: MAX_CACHED_FAVICONS,
});

/**
 * A page's favicon, answered from memory once it has been fetched.
 *
 * A stored icon is never given up for a failed refetch, so a site that is slow
 * or down on one dashboard load keeps its icon instead of falling back to the
 * initial-letter avatar.
 */
export function getFavicon(pageUrl: string): Promise<FaviconImage | null> {
  return favicons.get(pageUrl);
}
