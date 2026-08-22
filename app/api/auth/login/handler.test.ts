/**
 * @jest-environment node
 */
import { handleLogin } from "./handler";
import { createTestDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createUser } from "@/lib/repositories/users";
import { verifySessionToken } from "@/lib/auth";
import type Database from "better-sqlite3";

const JWT_SECRET = "test-secret-long-enough-for-hmac-sha256!!";

let db: Database.Database;

beforeEach(async () => {
  db = createTestDb();
  const hash = await hashPassword("Secret123!");
  createUser(db, {
    email: "admin@test.com",
    password_hash: hash,
    role: "admin",
  });
});

afterEach(() => db.close());

// docs/manual-testing-plan.md asserts an unknown email is indistinguishable
// from a wrong password. Skipping the hash made the two separable by response
// time (~0.02 ms vs tens of ms), so the 5 ms floor sits well clear of both.
describe("email enumeration", () => {
  const MIN_HASH_MS = 5;

  async function timeLogin(email: string) {
    const started = process.hrtime.bigint();
    const result = await handleLogin(
      { email, password: "wrong" },
      db,
      JWT_SECRET,
    );
    return { result, ms: Number(process.hrtime.bigint() - started) / 1e6 };
  }

  it("costs the same whether or not the email exists", async () => {
    const known = await timeLogin("admin@test.com");
    const unknown = await timeLogin("ghost@example.com");

    expect(unknown.result).toEqual(known.result);
    expect(known.ms).toBeGreaterThan(MIN_HASH_MS);
    expect(unknown.ms).toBeGreaterThan(MIN_HASH_MS);
  });
});

describe("handleLogin", () => {
  it("returns success and token with correct credentials", async () => {
    const result = await handleLogin(
      { email: "admin@test.com", password: "Secret123!" },
      db,
      JWT_SECRET,
    );
    expect(result.success).toBe(true);
    expect(typeof result.token).toBe("string");
    expect(result.error).toBeUndefined();
  });

  it("token contains correct userId and role", async () => {
    const result = await handleLogin(
      { email: "admin@test.com", password: "Secret123!" },
      db,
      JWT_SECRET,
    );
    const verified = await verifySessionToken(result.token!, JWT_SECRET);
    expect(verified.valid).toBe(true);
    expect(verified.userId).toBe(1);
    expect(verified.role).toBe("admin");
  });

  it("returns error with wrong password", async () => {
    const result = await handleLogin(
      { email: "admin@test.com", password: "wrong" },
      db,
      JWT_SECRET,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns error with unknown email", async () => {
    const result = await handleLogin(
      { email: "nobody@test.com", password: "Secret123!" },
      db,
      JWT_SECRET,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns error with empty email", async () => {
    const result = await handleLogin(
      { email: "", password: "Secret123!" },
      db,
      JWT_SECRET,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns error with empty password", async () => {
    const result = await handleLogin(
      { email: "admin@test.com", password: "" },
      db,
      JWT_SECRET,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("works with regular user role", async () => {
    const hash = await hashPassword("userpass");
    createUser(db, {
      email: "user@test.com",
      password_hash: hash,
      role: "user",
    });

    const result = await handleLogin(
      { email: "user@test.com", password: "userpass" },
      db,
      JWT_SECRET,
    );
    expect(result.success).toBe(true);

    const verified = await verifySessionToken(result.token!, JWT_SECRET);
    expect(verified.role).toBe("user");
  });
});

// A hand-rolled or buggy client can send any JSON shape. Passing a non-string
// straight to the query or to scrypt threw, and the caller saw an empty 500
// instead of the documented 401/400.
describe("malformed credentials", () => {
  it.each([
    ["an object email", { email: { $ne: null }, password: "Secret123!" }],
    ["a numeric email", { email: 42, password: "Secret123!" }],
    ["an object password", { email: "admin@test.com", password: {} }],
    ["a numeric password", { email: "admin@test.com", password: 1234 }],
  ])("refuses %s without throwing", async (_label, body) => {
    const result = await handleLogin(
      body as unknown as Parameters<typeof handleLogin>[0],
      db,
      JWT_SECRET,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
