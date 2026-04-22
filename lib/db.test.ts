/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { runMigrations } from "@/lib/db";
import { getUserByEmail } from "@/lib/repositories/users";
import { verifyHashedPassword } from "@/lib/password";
import Database from "better-sqlite3";

function createDbWithoutUrlAlt(): Database.Database {
  const legacy = new Database(":memory:");
  legacy.pragma("journal_mode = WAL");
  legacy.pragma("foreign_keys = OFF");
  legacy.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon_type TEXT NOT NULL CHECK(icon_type IN ('builtin','upload','url')),
      icon_value TEXT,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE settings (
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (user_id, key)
    );
  `);
  legacy.pragma("foreign_keys = ON");
  return legacy;
}

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

  it("adds url_alt column to links when missing", async () => {
    const legacy = createDbWithoutUrlAlt();
    const cols = legacy.pragma("table_info(links)") as { name: string }[];
    expect(cols.map((c) => c.name)).not.toContain("url_alt");

    await runMigrations(legacy);

    const colsAfter = legacy.pragma("table_info(links)") as { name: string }[];
    expect(colsAfter.map((c) => c.name)).toContain("url_alt");
    legacy.close();
  });

  it("migrateAddUrlAlt is idempotent — running twice does not throw", async () => {
    const legacy = createDbWithoutUrlAlt();
    await runMigrations(legacy);
    await expect(runMigrations(legacy)).resolves.not.toThrow();
    legacy.close();
  });
});
