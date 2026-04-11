/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { runMigrations } from "@/lib/db";
import { getUserByEmail } from "@/lib/repositories/users";
import { verifyHashedPassword } from "@/lib/password";
import type Database from "better-sqlite3";

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => db.close());

describe("runMigrations", () => {
  it("creates admin user when table is empty and env vars are set", async () => {
    await runMigrations(db, {
      adminEmail: "admin@example.com",
      adminPassword: "Secret123!",
    });

    const user = getUserByEmail(db, "admin@example.com");
    expect(user).toBeDefined();
    expect(user!.role).toBe("admin");
    expect(await verifyHashedPassword("Secret123!", user!.password_hash)).toBe(
      true,
    );
  });

  it("does not create admin when users already exist", async () => {
    db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
    ).run("existing@test.com", "hash", "user");

    await runMigrations(db, {
      adminEmail: "admin@example.com",
      adminPassword: "Secret123!",
    });

    const admin = getUserByEmail(db, "admin@example.com");
    expect(admin).toBeUndefined();
  });

  it("does not create admin when ADMIN_EMAIL is missing", async () => {
    await runMigrations(db, {
      adminEmail: "",
      adminPassword: "Secret123!",
    });

    const count = db.prepare("SELECT COUNT(*) as c FROM users").get() as {
      c: number;
    };
    expect(count.c).toBe(0);
  });

  it("does not create admin when ADMIN_PASSWORD is missing", async () => {
    await runMigrations(db, {
      adminEmail: "admin@example.com",
      adminPassword: "",
    });

    const count = db.prepare("SELECT COUNT(*) as c FROM users").get() as {
      c: number;
    };
    expect(count.c).toBe(0);
  });

  it("is idempotent — running twice does not duplicate admin", async () => {
    const env = {
      adminEmail: "admin@example.com",
      adminPassword: "Secret123!",
    };
    await runMigrations(db, env);
    await runMigrations(db, env);

    const count = db.prepare("SELECT COUNT(*) as c FROM users").get() as {
      c: number;
    };
    expect(count.c).toBe(1);
  });
});
