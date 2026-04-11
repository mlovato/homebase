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
