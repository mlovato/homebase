/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { GET } from "./route";

jest.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: jest.fn() }));

const mockAuth = getAuthenticatedUser as jest.MockedFunction<
  typeof getAuthenticatedUser
>;

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
  mockAuth.mockReset();
});

function request(url: string) {
  return new NextRequest(
    `http://localhost/api/health?url=${encodeURIComponent(url)}`,
  );
}

describe("GET /api/health", () => {
  it("refuses to probe a host without a session", async () => {
    mockAuth.mockResolvedValue(null);
    global.fetch = jest.fn() as unknown as typeof fetch;

    const res = await GET(request("http://192.168.1.50:22"));

    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("probes the host for an authenticated caller", async () => {
    mockAuth.mockResolvedValue({ userId: 1, role: "user" });
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;

    const res = await GET(request("http://plex.local:32400"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "up" });
  });

  // The dashboard's offline gate calls it this way, once per round of checks:
  // it must answer at once without reaching out to anything.
  it("answers without probing anything when no url is given", async () => {
    mockAuth.mockResolvedValue({ userId: 1, role: "user" });
    global.fetch = jest.fn() as unknown as typeof fetch;

    const res = await GET(new NextRequest("http://localhost/api/health"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "unknown" });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
