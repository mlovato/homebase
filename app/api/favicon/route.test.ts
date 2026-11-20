/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { GET } from "./route";

jest.mock("@/lib/apiAuth", () => ({
  getAuthenticatedUser: jest.fn(),
}));

const mockAuth = getAuthenticatedUser as jest.MockedFunction<
  typeof getAuthenticatedUser
>;

const FAVICON_BYTES = new Uint8Array([1, 2, 3, 4]);

/** The route caches by page URL, so each test uses a page of its own. */
let pageCounter = 0;
function newPage(): string {
  pageCounter++;
  return `http://site-${pageCounter}.test`;
}

/** Installs a site whose page declares /icon.png, answered with `faviconBody`. */
function serve(page: string, faviconBody: Uint8Array = FAVICON_BYTES) {
  const site = jest.fn(async (input: string) => {
    if (input === page) {
      return {
        ok: true,
        status: 200,
        text: async () => `<link rel="icon" href="/icon.png">`,
      } as unknown as Response;
    }
    if (input === `${page}/icon.png`) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "image/png" }),
        arrayBuffer: async () => faviconBody.buffer,
      } as unknown as Response;
    }
    return {
      ok: false,
      status: 404,
      text: async () => "",
    } as unknown as Response;
  });
  global.fetch = site as unknown as typeof fetch;
  return site;
}

function takeSiteDown() {
  global.fetch = jest.fn(async () => {
    throw new Error("ETIMEDOUT");
  }) as unknown as typeof fetch;
}

/** Moves the clock well past the window in which a stored icon is fresh. */
function ageCache() {
  const later = Date.now() + 24 * 60 * 60 * 1000;
  jest.spyOn(Date, "now").mockReturnValue(later);
}

function request(page: string, ifNoneMatch?: string): NextRequest {
  const headers = new Headers();
  if (ifNoneMatch) headers.set("if-none-match", ifNoneMatch);
  return new NextRequest(
    `http://localhost/api/favicon?url=${encodeURIComponent(page)}`,
    { headers },
  );
}

/** Lets a background refresh started by the previous request finish. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("GET /api/favicon", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: 1, role: "admin" });
  });

  afterEach(() => {
    global.fetch = realFetch;
    mockAuth.mockReset();
    jest.restoreAllMocks();
  });

  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);
    const page = newPage();
    const site = serve(page);

    const res = await GET(request(page));

    expect(res.status).toBe(401);
    expect(site).not.toHaveBeenCalled();
  });

  it("returns 400 when url is missing", async () => {
    const res = await GET(new NextRequest("http://localhost/api/favicon"));
    expect(res.status).toBe(400);
  });

  it("returns the favicon with a revalidating cache header and an ETag", async () => {
    const page = newPage();
    serve(page);

    const res = await GET(request(page));

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=0, must-revalidate",
    );
    expect(res.headers.get("ETag")).toMatch(/^"[a-f0-9]+"$/);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 304 when the client's If-None-Match matches the current favicon", async () => {
    const page = newPage();
    serve(page);

    const first = await GET(request(page));
    const etag = first.headers.get("ETag")!;

    const second = await GET(request(page, etag));

    expect(second.status).toBe(304);
    expect(second.headers.get("ETag")).toBe(etag);
    expect(await second.arrayBuffer()).toEqual(new ArrayBuffer(0));
  });

  // Every dashboard load asks for every icon at once. Scraping each site again
  // each time overloaded the NAS hosting them, timing requests out into letter
  // avatars, so a recently fetched icon is answered from memory.
  it("answers a recently fetched icon without contacting the site again", async () => {
    const page = newPage();
    const site = serve(page);

    await GET(request(page));
    site.mockClear();
    const res = await GET(request(page));

    expect(res.status).toBe(200);
    expect(site).not.toHaveBeenCalled();
  });

  it("picks up a changed favicon once the stored one is old", async () => {
    const page = newPage();
    serve(page);
    const first = await GET(request(page));
    const oldEtag = first.headers.get("ETag")!;

    serve(page, new Uint8Array([9, 9, 9, 9]));
    ageCache();

    // The old icon is answered at once while the new one is fetched behind it.
    const meanwhile = await GET(request(page, oldEtag));
    expect(meanwhile.status).toBe(304);
    await flush();

    const afterChange = await GET(request(page, oldEtag));
    expect(afterChange.status).toBe(200);
    expect(afterChange.headers.get("ETag")).not.toBe(oldEtag);
  });

  it("keeps serving the last good favicon when the site stops answering", async () => {
    const page = newPage();
    serve(page);
    const first = await GET(request(page));

    takeSiteDown();
    ageCache();
    await GET(request(page));
    await flush();

    const res = await GET(request(page));
    expect(res.status).toBe(200);
    expect(res.headers.get("ETag")).toBe(first.headers.get("ETag"));
  });

  it("marks the proxied bytes non-sniffable and script-free", async () => {
    // The bytes come from a third-party host but are served from this app's
    // origin, so opening the proxy URL directly must not run anything.
    const page = newPage();
    serve(page);

    const res = await GET(request(page));

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Content-Security-Policy")).toContain(
      "default-src 'none'",
    );
  });

  it("returns 404 when no favicon can be resolved", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      text: async () => "",
    })) as unknown as typeof fetch;

    const res = await GET(request(newPage()));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the site cannot be reached at all", async () => {
    takeSiteDown();
    const res = await GET(request(newPage()));
    expect(res.status).toBe(404);
  });

  it("returns 404 for a url that does not parse", async () => {
    const res = await GET(request("not a url"));
    expect(res.status).toBe(404);
  });
});
