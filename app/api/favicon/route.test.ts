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

function mockFetchSequence(faviconBody: Uint8Array) {
  return jest.fn(async (input: string) => {
    if (input === "http://example.com") {
      return {
        ok: true,
        status: 200,
        text: async () => `<link rel="icon" href="/icon.png">`,
      } as unknown as Response;
    }
    if (input === "http://example.com/icon.png") {
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
}

function request(ifNoneMatch?: string): NextRequest {
  const headers = new Headers();
  if (ifNoneMatch) headers.set("if-none-match", ifNoneMatch);
  return new NextRequest(
    "http://localhost/api/favicon?url=http://example.com",
    { headers },
  );
}

describe("GET /api/favicon", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: 1, role: "admin" });
  });

  afterEach(() => {
    global.fetch = realFetch;
    mockAuth.mockReset();
  });

  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);
    global.fetch = mockFetchSequence(FAVICON_BYTES) as unknown as typeof fetch;

    const res = await GET(request());

    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 when url is missing", async () => {
    const res = await GET(new NextRequest("http://localhost/api/favicon"));
    expect(res.status).toBe(400);
  });

  it("returns the favicon with a revalidating cache header and an ETag", async () => {
    global.fetch = mockFetchSequence(FAVICON_BYTES) as unknown as typeof fetch;

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=0, must-revalidate",
    );
    expect(res.headers.get("ETag")).toMatch(/^"[a-f0-9]+"$/);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 304 when the client's If-None-Match matches the current favicon", async () => {
    global.fetch = mockFetchSequence(FAVICON_BYTES) as unknown as typeof fetch;

    const first = await GET(request());
    const etag = first.headers.get("ETag")!;

    const second = await GET(request(etag));

    expect(second.status).toBe(304);
    expect(second.headers.get("ETag")).toBe(etag);
    expect(await second.arrayBuffer()).toEqual(new ArrayBuffer(0));
  });

  it("changes the ETag when the favicon bytes change", async () => {
    global.fetch = mockFetchSequence(FAVICON_BYTES) as unknown as typeof fetch;
    const first = await GET(request());
    const oldEtag = first.headers.get("ETag")!;

    global.fetch = mockFetchSequence(
      new Uint8Array([9, 9, 9, 9]),
    ) as unknown as typeof fetch;
    const afterChange = await GET(request(oldEtag));

    expect(afterChange.status).toBe(200);
    expect(afterChange.headers.get("ETag")).not.toBe(oldEtag);
  });

  it("marks the proxied bytes non-sniffable and script-free", async () => {
    // The bytes come from a third-party host but are served from this app's
    // origin, so opening the proxy URL directly must not run anything.
    global.fetch = mockFetchSequence(FAVICON_BYTES) as unknown as typeof fetch;

    const res = await GET(request());

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

    const res = await GET(request());
    expect(res.status).toBe(404);
  });
});
