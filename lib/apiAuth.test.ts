/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { createTestDb } from "@/lib/db";
import { createUser } from "@/lib/repositories/users";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import type Database from "better-sqlite3";

const SECRET = "test-secret";

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
  process.env.JWT_SECRET = SECRET;
});

afterEach(() => db.close());

async function requestFor(userId: number, role: "admin" | "user") {
  const token = await createSessionToken({ userId, role }, SECRET);
  const headers = new Headers({ cookie: `${COOKIE_NAME}=${token}` });
  return new NextRequest("http://localhost/api/users", { headers });
}

describe("getAuthenticatedUser", () => {
  it("returns null without a session cookie", async () => {
    const req = new NextRequest("http://localhost/api/users");
    expect(await getAuthenticatedUser(req, db)).toBeNull();
  });

  it("returns null when the token is signed with another secret", async () => {
    const user = createUser(db, { email: "a@test.com", password_hash: "h" });
    const token = await createSessionToken(
      { userId: user.id, role: "user" },
      "other-secret",
    );
    const headers = new Headers({ cookie: `${COOKIE_NAME}=${token}` });
    const req = new NextRequest("http://localhost/api/users", { headers });
    expect(await getAuthenticatedUser(req, db)).toBeNull();
  });

  it("resolves the caller from the database", async () => {
    const user = createUser(db, {
      email: "a@test.com",
      password_hash: "h",
      role: "admin",
    });
    const req = await requestFor(user.id, "admin");
    expect(await getAuthenticatedUser(req, db)).toEqual({
      userId: user.id,
      role: "admin",
    });
  });

  it("reports the promoted role even though the token still says user", async () => {
    const user = createUser(db, {
      email: "a@test.com",
      password_hash: "h",
      role: "user",
    });
    const req = await requestFor(user.id, "user");
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);

    expect(await getAuthenticatedUser(req, db)).toEqual({
      userId: user.id,
      role: "admin",
    });
  });

  it("drops admin as soon as the account is demoted, not at token expiry", async () => {
    const user = createUser(db, {
      email: "a@test.com",
      password_hash: "h",
      role: "admin",
    });
    const req = await requestFor(user.id, "admin");
    db.prepare("UPDATE users SET role = 'user' WHERE id = ?").run(user.id);

    expect(await getAuthenticatedUser(req, db)).toEqual({
      userId: user.id,
      role: "user",
    });
  });

  it("rejects a session whose account has been deleted", async () => {
    const user = createUser(db, { email: "a@test.com", password_hash: "h" });
    const req = await requestFor(user.id, "user");
    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);

    expect(await getAuthenticatedUser(req, db)).toBeNull();
  });
});
