/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { GET, MAX_BATCH_URLS } from "./route";

jest.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: jest.fn() }));

const mockAuth = getAuthenticatedUser as jest.MockedFunction<
  typeof getAuthenticatedUser
>;

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
  mockAuth.mockReset();
});

function request(urls: string[]) {
  const query = urls.map((u) => `url=${encodeURIComponent(u)}`).join("&");
  return new NextRequest(`http://localhost/api/health/batch?${query}`);
}

describe("GET /api/health/batch", () => {
  it("refuses to scan without a session", async () => {
    mockAuth.mockResolvedValue(null);
    global.fetch = jest.fn() as unknown as typeof fetch;

    const res = await GET(request(["http://192.168.1.50:22"]));

    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects a batch larger than the cap instead of opening every socket", async () => {
    mockAuth.mockResolvedValue({ userId: 1, role: "user" });
    global.fetch = jest.fn() as unknown as typeof fetch;
    const urls = Array.from(
      { length: MAX_BATCH_URLS + 1 },
      (_, i) => `http://10.0.0.${i % 254}:80`,
    );

    const res = await GET(request(urls));

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("checks a batch within the cap", async () => {
    mockAuth.mockResolvedValue({ userId: 1, role: "user" });
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;

    const res = await GET(request(["http://a.local", "http://b.local"]));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      "http://a.local": "up",
      "http://b.local": "up",
    });
  });
});
