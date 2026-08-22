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

/**
 * A pre-multi-user database: categories, links and settings lack the user_id
 * column, links lack url_alt, and users lack the avatar column.
 */
function createLegacySingleUserDb(): Database.Database {
  const legacy = new Database(":memory:");
  legacy.pragma("journal_mode = WAL");
  legacy.pragma("foreign_keys = OFF");
  legacy.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon_type TEXT NOT NULL CHECK(icon_type IN ('builtin','upload','url')),
      icon_value TEXT,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE settings (
      key TEXT NOT NULL PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return legacy;
}

function columnNames(db: Database.Database, table: string): string[] {
  return (db.pragma(`table_info(${table})`) as { name: string }[]).map(
    (c) => c.name,
  );
}

function insertUser(
  db: Database.Database,
  email: string,
  role: "admin" | "user",
): number {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)")
    .run(email, "hash", role);
  return Number(lastInsertRowid);
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
    insertUser(db, "existing@test.com", "user");

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

  it("adds user_id to categories and links and backfills the admin id", async () => {
    const legacy = createLegacySingleUserDb();
    const adminId = insertUser(legacy, "admin@test.com", "admin");
    legacy.prepare("INSERT INTO categories (name) VALUES (?)").run("Work");
    legacy
      .prepare(
        "INSERT INTO links (name, url, icon_type) VALUES (?,?,'builtin')",
      )
      .run("Mail", "http://mail");

    await runMigrations(legacy);

    expect(columnNames(legacy, "categories")).toContain("user_id");
    expect(columnNames(legacy, "links")).toContain("user_id");
    const category = legacy.prepare("SELECT user_id FROM categories").get() as {
      user_id: number;
    };
    const link = legacy.prepare("SELECT user_id FROM links").get() as {
      user_id: number;
    };
    expect(category.user_id).toBe(adminId);
    expect(link.user_id).toBe(adminId);
    legacy.close();
  });

  it("throws when categories need migrating but no admin user exists", async () => {
    const legacy = createLegacySingleUserDb();
    insertUser(legacy, "plain@test.com", "user");

    await expect(runMigrations(legacy)).rejects.toThrow(
      /Cannot migrate categories:[\s\S]*ADMIN_EMAIL and ADMIN_PASSWORD/,
    );
    legacy.close();
  });

  it("rebuilds the settings table with user_id and preserves existing rows", async () => {
    const legacy = createLegacySingleUserDb();
    const adminId = insertUser(legacy, "admin@test.com", "admin");
    legacy
      .prepare("INSERT INTO settings (key, value) VALUES (?,?)")
      .run("theme", "dark");

    await runMigrations(legacy);

    expect(columnNames(legacy, "settings")).toContain("user_id");
    const setting = legacy.prepare("SELECT * FROM settings").get() as {
      user_id: number;
      key: string;
      value: string;
    };
    expect(setting).toEqual({
      user_id: adminId,
      key: "theme",
      value: "dark",
    });
    legacy.close();
  });

  it("throws when settings need migrating but no admin user exists", async () => {
    // categories/links already have user_id so only the settings migration runs.
    const legacy = createDbWithoutUrlAlt();
    legacy.exec("DROP TABLE settings");
    legacy.exec(
      "CREATE TABLE settings (key TEXT NOT NULL PRIMARY KEY, value TEXT NOT NULL)",
    );
    insertUser(legacy, "plain@test.com", "user");

    await expect(runMigrations(legacy)).rejects.toThrow(
      /Cannot migrate settings:[\s\S]*ADMIN_EMAIL and ADMIN_PASSWORD/,
    );
    legacy.close();
  });

  it("adds the avatar column to users when missing", async () => {
    const legacy = createLegacySingleUserDb();
    insertUser(legacy, "admin@test.com", "admin");
    expect(columnNames(legacy, "users")).not.toContain("avatar");

    await runMigrations(legacy);

    expect(columnNames(legacy, "users")).toContain("avatar");
    legacy.close();
  });
});

describe("getDb", () => {
  const originalPath = process.env.DATABASE_PATH;

  afterEach(() => {
    process.env.DATABASE_PATH = originalPath;
    jest.resetModules();
  });

  it("returns a singleton database with the schema applied", async () => {
    jest.resetModules();
    process.env.DATABASE_PATH = ":memory:";
    const { getDb } = await import("@/lib/db");

    const first = getDb();
    const second = getDb();

    expect(first).toBe(second);
    expect(columnNames(first, "users")).toContain("email");
    expect(columnNames(first, "links")).toContain("url");
    first.close();
  });
});
