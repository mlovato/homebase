/**
 * @jest-environment node
 */
import {
  fetchFavicon,
  fetchFaviconImage,
  getFavicon,
  MAX_FAVICON_BYTES,
} from "./handler";
import { FETCH_TIMEOUT_MS } from "@/lib/fetchTimeout";

/**
 * A fake web: `pages` answer with HTML, `icons` with an image of the given
 * type whose bytes spell out its own URL, so a test can read back which
 * candidate the favicon was finally taken from. Anything else is a 404.
 */
function mockSite(
  pages: Record<string, string>,
  icons: Record<string, string> = {},
) {
  const encoder = new TextEncoder();
  return jest.fn(async (url: string) => {
    const html = pages[url];
    const iconType = icons[url];
    const body = encoder.encode(html ?? url);
    const contentType = html !== undefined ? "text/html" : iconType;
    return {
      ok: html !== undefined || iconType !== undefined,
      headers: {
        get: (n: string) => (n === "content-type" ? contentType : null),
      },
      text: async () => html ?? "",
      arrayBuffer: async () => body.buffer as ArrayBuffer,
    };
  });
}

async function faviconSource(
  pageUrl: string,
  site: Parameters<typeof fetchFavicon>[1],
): Promise<string | null> {
  const image = await fetchFavicon(pageUrl, site);
  return image ? new TextDecoder().decode(image.body) : null;
}

describe("fetchFavicon", () => {
  it("returns null for invalid url", async () => {
    expect(await faviconSource("not-a-url", mockSite({}))).toBeNull();
  });

  it("finds favicon from link[rel=icon] in HTML", async () => {
    const site = mockSite(
      {
        "http://example.com": `<html><head><link rel="icon" href="/icon.png"></head></html>`,
      },
      { "http://example.com/icon.png": "image/png" },
    );
    expect(await faviconSource("http://example.com", site)).toBe(
      "http://example.com/icon.png",
    );
  });

  it("finds favicon from link[rel='shortcut icon']", async () => {
    const site = mockSite(
      { "http://example.com": `<link rel="shortcut icon" href="/fav.ico">` },
      { "http://example.com/fav.ico": "image/x-icon" },
    );
    expect(await faviconSource("http://example.com", site)).toBe(
      "http://example.com/fav.ico",
    );
  });

  it("reads rel as a list of tokens, in any order and case", async () => {
    const site = mockSite(
      { "http://example.com": `<link rel="Icon Shortcut" href="/fav.png">` },
      { "http://example.com/fav.png": "image/png" },
    );
    expect(await faviconSource("http://example.com", site)).toBe(
      "http://example.com/fav.png",
    );
  });

  it("reads unquoted attributes", async () => {
    const site = mockSite(
      { "http://example.com": `<link rel=icon href=/fav.png>` },
      { "http://example.com/fav.png": "image/png" },
    );
    expect(await faviconSource("http://example.com", site)).toBe(
      "http://example.com/fav.png",
    );
  });

  // Gmail Tracker declares an inline SVG whose markup uses single quotes. The
  // value used to end at the first of them, so a truncated data: URI was
  // fetched, rendered as a broken image and the card fell back to its letter.
  it("reads a double-quoted href that contains single quotes", async () => {
    const dataUri =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E";
    const site = mockSite(
      { "http://example.com": `<link rel="icon" href="${dataUri}" />` },
      { [dataUri]: "image/svg+xml" },
    );
    expect(await faviconSource("http://example.com", site)).toBe(dataUri);
  });

  it("reads an href whose value contains raw markup", async () => {
    const dataUri =
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text>H</text></svg>";
    const site = mockSite(
      { "http://example.com": `<link rel="icon" href="${dataUri}">` },
      { [dataUri]: "image/svg+xml" },
    );
    expect(await faviconSource("http://example.com", site)).toBe(dataUri);
  });

  it("resolves relative href to absolute URL", async () => {
    const site = mockSite(
      { "http://example.com/app/": `<link rel="icon" href="assets/icon.png">` },
      { "http://example.com/app/assets/icon.png": "image/png" },
    );
    expect(await faviconSource("http://example.com/app/", site)).toBe(
      "http://example.com/app/assets/icon.png",
    );
  });

  it("preserves absolute href", async () => {
    const site = mockSite(
      {
        "http://example.com": `<link rel="icon" href="https://cdn.example.com/icon.png">`,
      },
      { "https://cdn.example.com/icon.png": "image/png" },
    );
    expect(await faviconSource("http://example.com", site)).toBe(
      "https://cdn.example.com/icon.png",
    );
  });

  it("falls back to /favicon.ico when no link tag found", async () => {
    const site = mockSite(
      { "http://example.com": `<html><head><title>Test</title></head></html>` },
      { "http://example.com/favicon.ico": "image/x-icon" },
    );
    expect(await faviconSource("http://example.com", site)).toBe(
      "http://example.com/favicon.ico",
    );
  });

  it("falls back to /favicon.ico when the declared icon cannot be fetched", async () => {
    const site = mockSite(
      { "http://example.com": `<link rel="icon" href="/gone.png">` },
      { "http://example.com/favicon.ico": "image/x-icon" },
    );
    expect(await faviconSource("http://example.com", site)).toBe(
      "http://example.com/favicon.ico",
    );
  });

  // Single-page apps answer every path with their index.html, /favicon.ico
  // included — a 200 that is not an icon.
  it("returns null when /favicon.ico is the app's HTML shell", async () => {
    const site = mockSite({
      "http://example.com": `<title>App</title>`,
      "http://example.com/favicon.ico": `<title>App</title>`,
    });
    expect(await faviconSource("http://example.com", site)).toBeNull();
  });

  it("does not download /favicon.ico twice when it is the declared icon", async () => {
    const site = mockSite({
      "http://example.com": `<link rel="icon" href="/favicon.ico">`,
    });
    await fetchFavicon("http://example.com", site);
    const icoFetches = site.mock.calls.filter(
      ([url]) => url === "http://example.com/favicon.ico",
    );
    expect(icoFetches).toHaveLength(1);
  });

  it("returns null when no link tag and /favicon.ico 404s", async () => {
    const site = mockSite({
      "http://example.com": `<html><head><title>Test</title></head></html>`,
    });
    expect(await faviconSource("http://example.com", site)).toBeNull();
  });

  it("returns null when page fetch fails entirely", async () => {
    expect(
      await faviconSource("http://unreachable.local", mockSite({})),
    ).toBeNull();
  });

  it("falls back to /favicon.ico when page fetch throws a network error", async () => {
    const site = mockSite(
      {},
      { "http://opspilot.local/favicon.ico": "image/x-icon" },
    );
    const throwingPage = async (url: string) => {
      if (url === "http://opspilot.local") throw new Error("ECONNREFUSED");
      return site(url);
    };
    expect(await faviconSource("http://opspilot.local", throwingPage)).toBe(
      "http://opspilot.local/favicon.ico",
    );
  });

  // github.com ships `data-base-href` in the same <link> as `href`, and a word
  // boundary sits inside it, so the resolver used to pick the extension-less
  // URL — which 404s, leaving the card with a letter avatar instead of an icon.
  it("ignores an attribute that merely ends in href", async () => {
    const site = mockSite(
      {
        "http://example.com":
          `<link rel="icon" class="js-site-favicon" type="image/svg+xml" ` +
          `href="https://cdn.example.com/favicon.svg" ` +
          `data-base-href="https://cdn.example.com/favicon">`,
      },
      {
        "https://cdn.example.com/favicon.svg": "image/svg+xml",
        "https://cdn.example.com/favicon": "image/svg+xml",
      },
    );
    expect(await faviconSource("http://example.com", site)).toBe(
      "https://cdn.example.com/favicon.svg",
    );
  });

  it("ignores an attribute that merely ends in rel", async () => {
    const site = mockSite(
      { "http://example.com": `<link data-rel="icon" href="/wrong.png">` },
      {
        "http://example.com/wrong.png": "image/png",
        "http://example.com/favicon.ico": "image/x-icon",
      },
    );
    expect(await faviconSource("http://example.com", site)).toBe(
      "http://example.com/favicon.ico",
    );
  });

  it("does not mistake an apple-touch-icon for the favicon", async () => {
    const site = mockSite(
      {
        "http://example.com": `<link rel="apple-touch-icon" href="/touch.png">`,
      },
      {
        "http://example.com/touch.png": "image/png",
        "http://example.com/favicon.ico": "image/x-icon",
      },
    );
    expect(await faviconSource("http://example.com", site)).toBe(
      "http://example.com/favicon.ico",
    );
  });

  it("handles query params in favicon href", async () => {
    const site = mockSite(
      { "http://example.com": `<link rel="icon" href="/icon.png?v=123">` },
      { "http://example.com/icon.png?v=123": "image/png" },
    );
    expect(await faviconSource("http://example.com", site)).toBe(
      "http://example.com/icon.png?v=123",
    );
  });
});

function mockImageFetch(
  bytes: Uint8Array | null,
  contentType?: string,
): Parameters<typeof fetchFaviconImage>[1] {
  return async () => ({
    ok: bytes !== null,
    headers: { get: () => contentType ?? null },
    arrayBuffer: async () => (bytes ?? new Uint8Array()).buffer as ArrayBuffer,
  });
}

describe("fetchFaviconImage", () => {
  it("returns the bytes, content type and an ETag", async () => {
    const result = await fetchFaviconImage(
      "http://example.com/icon.png",
      mockImageFetch(new Uint8Array([1, 2, 3, 4]), "image/png"),
    );
    expect(result?.contentType).toBe("image/png");
    expect(new Uint8Array(result!.body)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(result?.etag).toMatch(/^"[a-f0-9]{40}"$/);
  });

  it("falls back to image/x-icon when the response has no content type", async () => {
    const result = await fetchFaviconImage(
      "http://example.com/favicon.ico",
      mockImageFetch(new Uint8Array([1])),
    );
    expect(result?.contentType).toBe("image/x-icon");
  });

  it("derives the ETag from the bytes, so identical bytes tag identically", async () => {
    const bytes = new Uint8Array([7, 7, 7]);
    const first = await fetchFaviconImage(
      "http://a.test/i.png",
      mockImageFetch(bytes),
    );
    const second = await fetchFaviconImage(
      "http://b.test/i.png",
      mockImageFetch(bytes),
    );
    const other = await fetchFaviconImage(
      "http://a.test/i.png",
      mockImageFetch(new Uint8Array([8, 8, 8])),
    );
    expect(first?.etag).toBe(second?.etag);
    expect(other?.etag).not.toBe(first?.etag);
  });

  it("returns null when the favicon cannot be downloaded", async () => {
    const result = await fetchFaviconImage(
      "http://example.com/icon.png",
      mockImageFetch(null),
    );
    expect(result).toBeNull();
  });
});

describe("favicon fetches are bounded", () => {
  it("passes an abort signal to every fetch", async () => {
    const seen: (AbortSignal | undefined)[] = [];
    const site = mockSite({ "http://example.com": `<title>Test</title>` });
    await fetchFavicon("http://example.com", async (url, init) => {
      seen.push(init?.signal);
      return site(url);
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((s) => s instanceof AbortSignal)).toBe(true);
  });

  it("passes an abort signal to the image fetch", async () => {
    let signal: AbortSignal | undefined;
    await fetchFaviconImage("http://example.com/i.png", async (_url, init) => {
      signal = init?.signal;
      return {
        ok: true,
        headers: { get: () => null },
        arrayBuffer: async () => new Uint8Array([1]).buffer as ArrayBuffer,
      };
    });
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects an icon whose declared size is over the cap", async () => {
    const result = await fetchFaviconImage(
      "http://example.com/huge.png",
      async () => ({
        ok: true,
        headers: {
          get: (n: string) =>
            n === "content-length" ? String(MAX_FAVICON_BYTES + 1) : null,
        },
        arrayBuffer: async () => {
          throw new Error("must not download an oversized icon");
        },
      }),
    );
    expect(result).toBeNull();
  });

  it("rejects an icon whose actual size is over the cap", async () => {
    const oversized = new Uint8Array(MAX_FAVICON_BYTES + 1);
    const result = await fetchFaviconImage(
      "http://example.com/huge.png",
      async () => ({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: async () => oversized.buffer as ArrayBuffer,
      }),
    );
    expect(result).toBeNull();
  });

  it("still accepts an icon at the cap", async () => {
    const atCap = new Uint8Array(MAX_FAVICON_BYTES);
    const result = await fetchFaviconImage(
      "http://example.com/ok.png",
      async () => ({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: async () => atCap.buffer as ArrayBuffer,
      }),
    );
    expect(result).not.toBeNull();
  });
});

describe("favicon content types are restricted to images", () => {
  it.each([
    ["text/html", "HTML would run as a document on our origin"],
    ["application/javascript", "script served from our own origin"],
    ["text/plain", "not an image at all"],
    ["application/octet-stream", "a soft 404 pretending to be a download"],
  ])("rejects %s (%s)", async (contentType) => {
    const result = await fetchFaviconImage(
      "http://example.com/icon",
      mockImageFetch(new Uint8Array([1, 2, 3]), contentType),
    );
    expect(result).toBeNull();
  });

  it("accepts an image type declared with a charset parameter", async () => {
    const result = await fetchFaviconImage(
      "http://example.com/icon.png",
      mockImageFetch(new Uint8Array([1]), "IMAGE/PNG; charset=binary"),
    );
    expect(result?.contentType).toBe("image/png");
  });

  // Most modern sites have no other favicon. The route serves it sandboxed, so
  // it cannot script or reach anything on this origin.
  it("accepts svg, which the route neutralises with its headers", async () => {
    const result = await fetchFaviconImage(
      "http://example.com/favicon.svg",
      mockImageFetch(new Uint8Array([1]), "image/svg+xml"),
    );
    expect(result?.contentType).toBe("image/svg+xml");
  });

  it("accepts the IANA name for .ico", async () => {
    const result = await fetchFaviconImage(
      "http://example.com/favicon.ico",
      mockImageFetch(new Uint8Array([1]), "image/vnd.microsoft.icon"),
    );
    expect(result?.contentType).toBe("image/vnd.microsoft.icon");
  });
});

// The abort timer only ever covered getting the response *headers*: the body was
// read after the timer had already been cleared, so a host that answers and then
// stalls held the request open for good and buffered whatever it did send.
describe("favicon body reads are bounded too", () => {
  let aborted = false;

  /** A body that only ever settles because the timeout aborted it. */
  function stallUntilAbort<T>(signal: AbortSignal): Promise<T> {
    return new Promise<T>((_, reject) => {
      signal.addEventListener("abort", () => {
        aborted = true;
        reject(new Error("aborted"));
      });
    });
  }

  beforeEach(() => {
    aborted = false;
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it("aborts a page whose body never arrives", async () => {
    const site = mockSite({});
    const promise = fetchFavicon("http://example.com/", async (url, init) =>
      url.endsWith("/favicon.ico")
        ? site(url)
        : {
            ...(await site(url)),
            ok: true,
            text: () => stallUntilAbort<string>(init!.signal),
          },
    );

    await jest.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1);

    expect(aborted).toBe(true);
    await expect(promise).resolves.toBeNull();
  });

  it("aborts an icon whose bytes never arrive", async () => {
    const settled = fetchFaviconImage(
      "http://example.com/i.png",
      async (_url, init) => ({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: () => stallUntilAbort<ArrayBuffer>(init!.signal),
      }),
    ).catch(() => "rejected");

    await jest.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1);

    expect(aborted).toBe(true);
    await expect(settled).resolves.toBe("rejected");
  });
});

describe("getFavicon", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  // Self-hosted apps share one machine on different ports. Fetching them all at
  // once made that machine too slow to answer any of them within the timeout.
  it("limits concurrent fetches per machine, whatever the port", async () => {
    let inFlight = 0;
    let peak = 0;
    global.fetch = jest.fn(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return { ok: false, text: async () => "" };
    }) as unknown as typeof fetch;

    const ports = Array.from({ length: 20 }, (_, i) => 3000 + i);
    await Promise.all(
      ports.map((port) => getFavicon(`http://nas.test:${port}`)),
    );

    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(6);
  });

  // Behind a reverse proxy, one machine answers under many hostnames.
  it("caps concurrent fetches across hostnames as well", async () => {
    let inFlight = 0;
    let peak = 0;
    global.fetch = jest.fn(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return { ok: false, text: async () => "" };
    }) as unknown as typeof fetch;

    const hosts = Array.from({ length: 30 }, (_, i) => `app-${i}.nas.test`);
    await Promise.all(hosts.map((host) => getFavicon(`http://${host}`)));

    expect(peak).toBeGreaterThan(6);
    expect(peak).toBeLessThanOrEqual(12);
  });
});
