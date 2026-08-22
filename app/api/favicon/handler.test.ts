import { fetchFaviconImage, resolveFavicon } from "./handler";

function mockFetch(responses: Record<string, { ok: boolean; body?: string }>) {
  return async (url: string) => {
    const resp = responses[url];
    if (!resp) return { ok: false, status: 404, text: async () => "" };
    return {
      ok: resp.ok,
      status: resp.ok ? 200 : 404,
      text: async () => resp.body ?? "",
    };
  };
}

describe("resolveFavicon", () => {
  it("returns null for invalid url", async () => {
    const result = await resolveFavicon("not-a-url", mockFetch({}));
    expect(result).toBeNull();
  });

  it("finds favicon from link[rel=icon] in HTML", async () => {
    const html = `<html><head><link rel="icon" href="/icon.png"></head></html>`;
    const result = await resolveFavicon(
      "http://example.com",
      mockFetch({
        "http://example.com": { ok: true, body: html },
      }),
    );
    expect(result).toBe("http://example.com/icon.png");
  });

  it("finds favicon from link[rel='shortcut icon']", async () => {
    const html = `<html><head><link rel="shortcut icon" href="/fav.ico"></head></html>`;
    const result = await resolveFavicon(
      "http://example.com",
      mockFetch({
        "http://example.com": { ok: true, body: html },
      }),
    );
    expect(result).toBe("http://example.com/fav.ico");
  });

  it("resolves relative href to absolute URL", async () => {
    const html = `<link rel="icon" href="assets/icon.png">`;
    const result = await resolveFavicon(
      "http://example.com/app/",
      mockFetch({
        "http://example.com/app/": { ok: true, body: html },
      }),
    );
    expect(result).toBe("http://example.com/app/assets/icon.png");
  });

  it("preserves absolute href", async () => {
    const html = `<link rel="icon" href="https://cdn.example.com/icon.png">`;
    const result = await resolveFavicon(
      "http://example.com",
      mockFetch({
        "http://example.com": { ok: true, body: html },
      }),
    );
    expect(result).toBe("https://cdn.example.com/icon.png");
  });

  it("falls back to /favicon.ico when no link tag found", async () => {
    const html = `<html><head><title>Test</title></head></html>`;
    const result = await resolveFavicon(
      "http://example.com",
      mockFetch({
        "http://example.com": { ok: true, body: html },
        "http://example.com/favicon.ico": { ok: true },
      }),
    );
    expect(result).toBe("http://example.com/favicon.ico");
  });

  it("returns null when no link tag and /favicon.ico 404s", async () => {
    const html = `<html><head><title>Test</title></head></html>`;
    const result = await resolveFavicon(
      "http://example.com",
      mockFetch({
        "http://example.com": { ok: true, body: html },
        "http://example.com/favicon.ico": { ok: false },
      }),
    );
    expect(result).toBeNull();
  });

  it("returns null when page fetch fails entirely", async () => {
    const result = await resolveFavicon(
      "http://unreachable.local",
      mockFetch({}),
    );
    expect(result).toBeNull();
  });

  it("falls back to /favicon.ico when page fetch throws a network error", async () => {
    const throwingFetch = async (url: string) => {
      if (url === "http://opspilot.local/favicon.ico")
        return { ok: true, text: async () => "" };
      throw new Error("ECONNREFUSED");
    };
    const result = await resolveFavicon("http://opspilot.local", throwingFetch);
    expect(result).toBe("http://opspilot.local/favicon.ico");
  });

  it("handles query params in favicon href", async () => {
    const html = `<link rel="icon" href="/icon.png?v=123">`;
    const result = await resolveFavicon(
      "http://example.com",
      mockFetch({
        "http://example.com": { ok: true, body: html },
      }),
    );
    expect(result).toBe("http://example.com/icon.png?v=123");
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
