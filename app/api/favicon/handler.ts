import { createHash } from "crypto";
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

const ICON_LINK_RE =
  /<link[^>]*\brel=["'](?:shortcut )?icon["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i;
const ICON_LINK_RE_ALT =
  /<link[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["'](?:shortcut )?icon["'][^>]*>/i;

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
    new URL(url);
    origin = new URL(url).origin;
  } catch {
    return null;
  }

  try {
    const res = await withFetchTimeout((signal) => fetchFn(url, { signal }));
    if (res.ok) {
      const html = await res.text();
      const href = extractFaviconHref(html);
      if (href) {
        return resolveHref(href, url);
      }
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

/**
 * Downloads a resolved favicon, tagging it with a hash of its bytes so an
 * unchanged icon can be answered with a bodiless 304.
 */
export async function fetchFaviconImage(
  faviconUrl: string,
  fetchFn: ImageFetchFn = fetch,
): Promise<FaviconImage | null> {
  const res = await withFetchTimeout((signal) =>
    fetchFn(faviconUrl, { signal }),
  );
  if (!res.ok) return null;

  if (Number(res.headers.get("content-length")) > MAX_FAVICON_BYTES)
    return null;

  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_FAVICON_BYTES) return null;

  return {
    body,
    contentType: res.headers.get("content-type") ?? "image/x-icon",
    etag: `"${createHash("sha1").update(Buffer.from(body)).digest("hex")}"`,
  };
}
