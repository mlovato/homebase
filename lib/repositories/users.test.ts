/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import {
  createUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  updateUser,
  deleteUser,
} from "./users";
import type Database from "better-sqlite3";

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => db.close());

describe("createUser", () => {
  it("creates a user and returns it", () => {
    const user = createUser(db, {
      email: "alice@test.com",
      password_hash: "hash123",
    });
    expect(user.id).toBe(1);
    expect(user.email).toBe("alice@test.com");
    expect(user.role).toBe("user");
    expect(user.created_at).toBeTruthy();
  });

  it("creates an admin user when role is specified", () => {
    const user = createUser(db, {
      email: "admin@test.com",
      password_hash: "hash",
      role: "admin",
    });
    expect(user.role).toBe("admin");
  });

  it("creates a user with avatar", () => {
    const user = createUser(db, {
      email: "a@test.com",
      password_hash: "hash",
      avatar: "🚀",
    });
    expect(user.avatar).toBe("🚀");
  });

  it("defaults avatar to null", () => {
    const user = createUser(db, { email: "a@test.com", password_hash: "hash" });
    expect(user.avatar).toBeNull();
  });

  it("rejects duplicate email", () => {
    createUser(db, { email: "alice@test.com", password_hash: "hash" });
    expect(() =>
      createUser(db, { email: "alice@test.com", password_hash: "hash2" }),
    ).toThrow();
  });
});

describe("getUserById", () => {
  it("returns the user", () => {
    const created = createUser(db, {
      email: "bob@test.com",
      password_hash: "hash",
    });
    const found = getUserById(db, created.id);
    expect(found).toEqual(created);
  });

  it("returns undefined for unknown id", () => {
    expect(getUserById(db, 999)).toBeUndefined();
  });
});

describe("getUserByEmail", () => {
  it("returns the user with password_hash", () => {
    createUser(db, { email: "carol@test.com", password_hash: "secret_hash" });
    const found = getUserByEmail(db, "carol@test.com");
    expect(found).toBeDefined();
    expect(found!.email).toBe("carol@test.com");
    expect(found!.password_hash).toBe("secret_hash");
  });

  it("returns undefined for unknown email", () => {
    expect(getUserByEmail(db, "nobody@test.com")).toBeUndefined();
  });
});

describe("getAllUsers", () => {
  it("returns all users", () => {
    createUser(db, { email: "a@test.com", password_hash: "h1" });
    createUser(db, { email: "b@test.com", password_hash: "h2" });
    const users = getAllUsers(db);
    expect(users).toHaveLength(2);
    expect(users[0].email).toBe("a@test.com");
    expect(users[1].email).toBe("b@test.com");
  });

  it("returns empty array when no users", () => {
    expect(getAllUsers(db)).toEqual([]);
  });
});

describe("updateUser", () => {
  it("updates email", () => {
    const user = createUser(db, {
      email: "old@test.com",
      password_hash: "hash",
    });
    const updated = updateUser(db, user.id, { email: "new@test.com" });
    expect(updated).toBeDefined();
    expect(updated!.email).toBe("new@test.com");
  });

  it("updates role", () => {
    const user = createUser(db, { email: "a@test.com", password_hash: "hash" });
    const updated = updateUser(db, user.id, { role: "admin" });
    expect(updated!.role).toBe("admin");
  });

  it("updates avatar", () => {
    const user = createUser(db, { email: "a@test.com", password_hash: "hash" });
    const updated = updateUser(db, user.id, { avatar: "🎯" });
    expect(updated!.avatar).toBe("🎯");
  });

  it("updates password_hash", () => {
    const user = createUser(db, {
      email: "a@test.com",
      password_hash: "old_hash",
    });
    updateUser(db, user.id, { password_hash: "new_hash" });
    const found = getUserByEmail(db, "a@test.com");
    expect(found!.password_hash).toBe("new_hash");
  });

  it("returns undefined for unknown id", () => {
    expect(updateUser(db, 999, { email: "x@test.com" })).toBeUndefined();
  });
});

describe("deleteUser", () => {
  it("deletes the user", () => {
    const user = createUser(db, {
      email: "del@test.com",
      password_hash: "hash",
    });
    expect(deleteUser(db, user.id)).toBe(true);
    expect(getUserById(db, user.id)).toBeUndefined();
  });

  it("returns false for unknown id", () => {
    expect(deleteUser(db, 999)).toBe(false);
  });
});
