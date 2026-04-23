type FetchFn = (
  url: string,
) => Promise<{ ok: boolean; text: () => Promise<string> }>;

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
    const res = await fetchFn(url);
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
    const res = await fetchFn(fallback);
    if (res.ok) return fallback;
  } catch {
    // ignore
  }

  return null;
}
