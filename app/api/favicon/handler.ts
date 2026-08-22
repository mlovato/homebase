import { createHash } from "crypto";
import { PROXYABLE_IMAGE_CONTENT_TYPES } from "@/lib/constants";
import { withFetchTimeout } from "@/lib/fetchTimeout";

/** Favicons are a few KB; anything past this is not an icon worth proxying. */
export const MAX_FAVICON_BYTES = 1024 * 1024;

type FetchInit = { signal: AbortSignal };

type FetchFn = (
  url: string,
  init?: FetchInit,
) => Promise<{ ok: boolean; text: () => Promise<string> }>;

type ImageFetchFn = (
  url: string,
  init?: FetchInit,
) => Promise<{
  ok: boolean;
  headers: { get: (name: string) => string | null };
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

export interface FaviconImage {
  body: ArrayBuffer;
  contentType: string;
  etag: string;
}

// The attribute names are anchored on whitespace, not on \b: a word boundary
// also sits inside `data-base-href`, and GitHub ships one of those in the same
// tag — so the resolver picked up an extension-less URL that 404s, and the icon
// silently fell back to the initial-letter avatar.
const ICON_LINK_RE =
  /<link[^>]*\srel=["'](?:shortcut )?icon["'][^>]*\shref=["']([^"']+)["'][^>]*>/i;
const ICON_LINK_RE_ALT =
  /<link[^>]*\shref=["']([^"']+)["'][^>]*\srel=["'](?:shortcut )?icon["'][^>]*>/i;

function extractFaviconHref(html: string): string | null {
  const match = ICON_LINK_RE.exec(html) ?? ICON_LINK_RE_ALT.exec(html);
  return match?.[1] ?? null;
}

function resolveHref(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

export async function resolveFavicon(
  url: string,
  fetchFn: FetchFn = fetch,
): Promise<string | null> {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return null;
  }

  try {
    const html = await withFetchTimeout(async (signal) => {
      const res = await fetchFn(url, { signal });
      return res.ok ? res.text() : null;
    });
    if (html) {
      const href = extractFaviconHref(html);
      if (href) return resolveHref(href, url);
    }
  } catch {
    // fall through to /favicon.ico fallback
  }

  try {
    const fallback = `${origin}/favicon.ico`;
    const res = await withFetchTimeout((signal) =>
      fetchFn(fallback, { signal }),
    );
    if (res.ok) return fallback;
  } catch {
    // ignore
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
 * proxied: the caller answers that with a 404 and the icon falls back to the
 * site's own /favicon.ico and then to the initial-letter avatar.
 */
export async function fetchFaviconImage(
  faviconUrl: string,
  fetchFn: ImageFetchFn = fetch,
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
