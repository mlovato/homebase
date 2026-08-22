/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth";
import { proxy, config } from "./proxy";

const SECRET = "test-secret-long-enough-for-hmac-sha256!!";

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

async function sessionCookie(): Promise<string> {
  const token = await createSessionToken({ userId: 1, role: "admin" }, SECRET);
  return `${COOKIE_NAME}=${token}`;
}

function request(
  url: string,
  init: { method?: string; headers?: Record<string, string> } = {},
) {
  return new NextRequest(url, {
    method: init.method ?? "GET",
    headers: new Headers(init.headers ?? {}),
  });
}

describe("page routes", () => {
  it("redirects to login without a session", async () => {
    const res = await proxy(request("http://nas.local:7000/"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/login");
  });

  it("lets a signed-in caller through", async () => {
    const res = await proxy(
      request("http://nas.local:7000/admin", {
        headers: { cookie: await sessionCookie() },
      }),
    );

    expect(res.headers.get("location")).toBeNull();
  });

  it("leaves the login page reachable", async () => {
    const res = await proxy(request("http://nas.local:7000/admin/login"));
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("state-changing API requests from another origin", () => {
  const foreign = { origin: "http://nas.local:9999", host: "nas.local:7000" };

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "refuses %s carrying a foreign Origin",
    async (method) => {
      const res = await proxy(
        request("http://nas.local:7000/api/import", {
          method,
          headers: { ...foreign, cookie: await sessionCookie() },
        }),
      );

      expect(res.status).toBe(403);
    },
  );

  it("refuses an unparsable Origin", async () => {
    const res = await proxy(
      request("http://nas.local:7000/api/users", {
        method: "POST",
        headers: { origin: "not-a-url", host: "nas.local:7000" },
      }),
    );

    expect(res.status).toBe(403);
  });

  it("allows the app's own origin", async () => {
    const res = await proxy(
      request("http://nas.local:7000/api/users", {
        method: "POST",
        headers: { origin: "http://nas.local:7000", host: "nas.local:7000" },
      }),
    );

    expect(res.status).not.toBe(403);
  });

  it("matches the forwarded host when a reverse proxy rewrote Host", async () => {
    const res = await proxy(
      request("http://internal:7000/api/links", {
        method: "POST",
        headers: {
          origin: "https://home.example.com",
          host: "internal:7000",
          "x-forwarded-host": "home.example.com",
        },
      }),
    );

    expect(res.status).not.toBe(403);
  });

  // Each hop in a proxy chain appends to x-forwarded-host, so the header arrives
  // as a comma-separated list. Compared whole, it never equals the browser's
  // Origin host and every save is refused.
  it("matches the first forwarded host when proxies chained the header", async () => {
    const res = await proxy(
      request("http://internal:7000/api/links", {
        method: "POST",
        headers: {
          origin: "https://home.example.com",
          host: "internal:7000",
          "x-forwarded-host": "home.example.com, edge.internal",
        },
      }),
    );

    expect(res.status).not.toBe(403);
  });

  it("allows a request with no Origin header", async () => {
    const res = await proxy(
      request("http://nas.local:7000/api/links", { method: "POST" }),
    );

    expect(res.status).not.toBe(403);
  });

  it("leaves reads alone, since CORS keeps the response unreadable", async () => {
    const res = await proxy(
      request("http://nas.local:7000/api/export", { headers: foreign }),
    );

    expect(res.status).not.toBe(403);
  });

  it("never redirects an API request", async () => {
    const res = await proxy(request("http://nas.local:7000/api/links"));

    expect(res.status).not.toBe(307);
    expect(res.headers.get("location")).toBeNull();
  });
});

// The checks above call proxy() directly, so nothing else would notice if the
// API paths stopped being routed through it — and then the origin gate simply
// would not run.
describe("matcher coverage", () => {
  it.each(["/", "/admin/:path*", "/api/:path*"])(
    "routes %s through the middleware",
    (pattern) => {
      expect(config.matcher).toContain(pattern);
    },
  );
});
