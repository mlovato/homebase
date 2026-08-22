/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { createTestDb, getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createUser } from "@/lib/repositories/users";
import { POST } from "./route";
import type Database from "better-sqlite3";

jest.mock("@/lib/db", () => {
  const actual = jest.requireActual("@/lib/db");
  return { ...actual, getDb: jest.fn() };
});

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

let db: Database.Database;

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-long-enough-for-hmac-sha256!!";
});

beforeEach(async () => {
  db = createTestDb();
  createUser(db, {
    email: "admin@test.local",
    password_hash: await hashPassword("pass1234"),
    role: "admin",
  });
  mockGetDb.mockReturnValue(db);
});

afterEach(() => {
  db.close();
  jest.clearAllMocks();
});

function login(url: string, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest(url, {
      method: "POST",
      headers: new Headers({ "content-type": "application/json", ...headers }),
      body: JSON.stringify({
        email: "admin@test.local",
        password: "pass1234",
      }),
    }),
  );
}

function sessionAttributes(res: Response): string {
  return res.headers.get("set-cookie") ?? "";
}

describe("session cookie flags", () => {
  it("is HttpOnly, lax and rooted at the site", async () => {
    const res = await login("http://nas.local:7000/api/auth/login");
    const cookie = sessionAttributes(res);

    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/");
  });

  it("is not Secure on a plain-HTTP LAN deployment", async () => {
    const res = await login("http://nas.local:7000/api/auth/login");
    expect(sessionAttributes(res)).not.toContain("Secure");
  });

  it("is Secure when the request itself was HTTPS", async () => {
    const res = await login("https://home.example.com/api/auth/login");
    expect(sessionAttributes(res)).toContain("Secure");
  });

  it("is Secure when a reverse proxy terminated TLS", async () => {
    const res = await login("http://internal:7000/api/auth/login", {
      "x-forwarded-proto": "https",
    });
    expect(sessionAttributes(res)).toContain("Secure");
  });

  it("reads only the first hop of a forwarded proto chain", async () => {
    const res = await login("http://internal:7000/api/auth/login", {
      "x-forwarded-proto": "https, http",
    });
    expect(sessionAttributes(res)).toContain("Secure");
  });
});
