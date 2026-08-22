/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { GET } from "./route";
import { clearCache } from "./handler";

jest.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: jest.fn() }));

const mockAuth = getAuthenticatedUser as jest.MockedFunction<
  typeof getAuthenticatedUser
>;

const realFetch = global.fetch;

beforeEach(() => clearCache());

afterEach(() => {
  global.fetch = realFetch;
  mockAuth.mockReset();
});

function request() {
  return new NextRequest("http://localhost/api/icons?q=plex");
}

describe("GET /api/icons", () => {
  it("refuses an unauthenticated search without calling upstream", async () => {
    mockAuth.mockResolvedValue(null);
    global.fetch = jest.fn() as unknown as typeof fetch;

    const res = await GET(request());

    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("searches for a signed-in caller", async () => {
    mockAuth.mockResolvedValue({ userId: 1, role: "user" });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ plex: { aliases: [] } }),
    }) as unknown as typeof fetch;

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect((await res.json()).results[0].slug).toBe("plex");
  });
});
