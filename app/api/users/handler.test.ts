/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { createUser, getUserById } from "@/lib/repositories/users";
import {
  handleListUsers,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
} from "./handler";
import type Database from "better-sqlite3";

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => db.close());

describe("handleListUsers", () => {
  it("returns empty array when no users", () => {
    expect(handleListUsers(db)).toEqual([]);
  });

  it("returns all users", () => {
    createUser(db, { email: "a@test.com", password_hash: "h" });
    createUser(db, { email: "b@test.com", password_hash: "h" });
    expect(handleListUsers(db)).toHaveLength(2);
  });
});

describe("handleCreateUser", () => {
  it("creates a user", async () => {
    const result = await handleCreateUser(db, {
      email: "new@test.com",
      password: "pass1234",
    });
    expect(result.status).toBe(201);
    expect(result.data).toMatchObject({ email: "new@test.com", role: "user" });
  });

  it("creates an admin user", async () => {
    const result = await handleCreateUser(db, {
      email: "admin@test.com",
      password: "pass1234",
      role: "admin",
    });
    expect(result.status).toBe(201);
    expect(result.data).toMatchObject({ role: "admin" });
  });

  it("creates a user with avatar", async () => {
    const result = await handleCreateUser(db, {
      email: "a@test.com",
      password: "pass1234",
      avatar: "🚀",
    });
    expect(result.status).toBe(201);
    expect(result.data).toMatchObject({ avatar: "🚀" });
  });

  it("rejects missing email", async () => {
    const result = await handleCreateUser(db, { password: "pass1234" });
    expect(result.status).toBe(400);
  });

  it("rejects short password", async () => {
    const result = await handleCreateUser(db, {
      email: "x@test.com",
      password: "ab",
    });
    expect(result.status).toBe(400);
  });

  it("rejects invalid avatar", async () => {
    const result = await handleCreateUser(db, {
      email: "x@test.com",
      password: "pass1234",
      avatar: "not-an-emoji",
    });
    expect(result.status).toBe(400);
  });

  it("rejects invalid role", async () => {
    const result = await handleCreateUser(db, {
      email: "x@test.com",
      password: "pass1234",
      role: "superadmin",
    });
    expect(result.status).toBe(400);
  });

  it("rejects duplicate email", async () => {
    createUser(db, { email: "dup@test.com", password_hash: "h" });
    const result = await handleCreateUser(db, {
      email: "dup@test.com",
      password: "pass1234",
    });
    expect(result.status).toBe(409);
  });
});

describe("handleUpdateUser", () => {
  it("updates email", async () => {
    const user = createUser(db, { email: "old@test.com", password_hash: "h" });
    const result = await handleUpdateUser(db, user.id, {
      email: "new@test.com",
    });
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({ email: "new@test.com" });
  });

  it("updates role", async () => {
    const user = createUser(db, { email: "a@test.com", password_hash: "h" });
    const result = await handleUpdateUser(db, user.id, { role: "admin" });
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({ role: "admin" });
  });

  it("updates password", async () => {
    const user = createUser(db, { email: "a@test.com", password_hash: "h" });
    const result = await handleUpdateUser(db, user.id, {
      password: "newpass1234",
    });
    expect(result.status).toBe(200);
  });

  it("rejects short password", async () => {
    const user = createUser(db, { email: "a@test.com", password_hash: "h" });
    const result = await handleUpdateUser(db, user.id, { password: "ab" });
    expect(result.status).toBe(400);
  });

  it("returns 404 for unknown user", async () => {
    const result = await handleUpdateUser(db, 999, { email: "x@test.com" });
    expect(result.status).toBe(404);
  });
});

describe("handleDeleteUser", () => {
  // The caller is always someone other than the target; deleting yourself has
  // its own guard, covered in "handleDeleteUser guards".
  const CALLER_ID = 9999;

  it("deletes a user", () => {
    const user = createUser(db, { email: "del@test.com", password_hash: "h" });
    const result = handleDeleteUser(db, user.id, CALLER_ID);
    expect(result.status).toBe(200);
    expect(getUserById(db, user.id)).toBeUndefined();
  });

  it("cascade-deletes user data", () => {
    const user = createUser(db, { email: "del@test.com", password_hash: "h" });
    db.prepare("INSERT INTO categories (user_id, name) VALUES (?, ?)").run(
      user.id,
      "Test",
    );
    db.prepare(
      "INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?)",
    ).run(user.id, "k", "v");

    handleDeleteUser(db, user.id, CALLER_ID);

    const cats = db
      .prepare("SELECT COUNT(*) as c FROM categories WHERE user_id = ?")
      .get(user.id) as { c: number };
    const settings = db
      .prepare("SELECT COUNT(*) as c FROM settings WHERE user_id = ?")
      .get(user.id) as { c: number };
    expect(cats.c).toBe(0);
    expect(settings.c).toBe(0);
  });

  it("returns 404 for unknown user", () => {
    const result = handleDeleteUser(db, 999, CALLER_ID);
    expect(result.status).toBe(404);
  });
});

describe("handleUpdateUser guards", () => {
  it("rejects an email already used by another user", async () => {
    createUser(db, { email: "taken@test.com", password_hash: "h" });
    const other = createUser(db, {
      email: "other@test.com",
      password_hash: "h",
    });

    const result = await handleUpdateUser(db, other.id, {
      email: "taken@test.com",
    });

    expect(result).toMatchObject({
      error: "Email already in use",
      status: 409,
    });
    expect(getUserById(db, other.id)?.email).toBe("other@test.com");
  });

  it("allows a user to keep their own email", async () => {
    const user = createUser(db, { email: "me@test.com", password_hash: "h" });
    const result = await handleUpdateUser(db, user.id, {
      email: "me@test.com",
      avatar: null,
    });
    expect(result.status).toBe(200);
  });

  it("refuses to demote the only admin", async () => {
    const admin = createUser(db, {
      email: "admin@test.com",
      password_hash: "h",
      role: "admin",
    });
    createUser(db, { email: "plain@test.com", password_hash: "h" });

    const result = await handleUpdateUser(db, admin.id, { role: "user" });

    expect(result).toMatchObject({
      error: "Cannot demote the only admin",
      status: 400,
    });
    expect(getUserById(db, admin.id)?.role).toBe("admin");
  });

  it("allows demoting an admin while another admin remains", async () => {
    const first = createUser(db, {
      email: "a@test.com",
      password_hash: "h",
      role: "admin",
    });
    createUser(db, {
      email: "b@test.com",
      password_hash: "h",
      role: "admin",
    });

    const result = await handleUpdateUser(db, first.id, { role: "user" });

    expect(result.status).toBe(200);
    expect(getUserById(db, first.id)?.role).toBe("user");
  });
});

describe("handleDeleteUser guards", () => {
  it("refuses to delete the caller's own account", () => {
    const admin = createUser(db, {
      email: "admin@test.com",
      password_hash: "h",
      role: "admin",
    });

    const result = handleDeleteUser(db, admin.id, admin.id);

    expect(result).toMatchObject({
      error: "You cannot delete your own account",
      status: 400,
    });
    expect(getUserById(db, admin.id)).toBeDefined();
  });

  it("refuses to delete the only admin even when someone else asks", () => {
    const admin = createUser(db, {
      email: "admin@test.com",
      password_hash: "h",
      role: "admin",
    });

    const result = handleDeleteUser(db, admin.id, 12345);

    expect(result).toMatchObject({
      error: "Cannot delete the only admin",
      status: 400,
    });
    expect(getUserById(db, admin.id)).toBeDefined();
  });

  it("deletes an admin while another admin remains", () => {
    const first = createUser(db, {
      email: "a@test.com",
      password_hash: "h",
      role: "admin",
    });
    const second = createUser(db, {
      email: "b@test.com",
      password_hash: "h",
      role: "admin",
    });

    expect(handleDeleteUser(db, first.id, second.id).status).toBe(200);
    expect(getUserById(db, first.id)).toBeUndefined();
  });

  it("still deletes another user", () => {
    const admin = createUser(db, {
      email: "admin@test.com",
      password_hash: "h",
      role: "admin",
    });
    const victim = createUser(db, { email: "v@test.com", password_hash: "h" });

    const result = handleDeleteUser(db, victim.id, admin.id);

    expect(result.status).toBe(200);
    expect(getUserById(db, victim.id)).toBeUndefined();
  });
});
