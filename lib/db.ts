import Database from "better-sqlite3";
import path from "path";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "homebase.db");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
    avatar TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    url_alt TEXT,
    icon_type TEXT NOT NULL CHECK(icon_type IN ('builtin','upload','url')),
    icon_value TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
  );
`;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    _db.exec(SCHEMA);
  }
  return _db;
}

interface MigrationEnv {
  adminEmail: string;
  adminPassword: string;
}

export async function runMigrations(
  db: Database.Database,
  env?: MigrationEnv,
): Promise<void> {
  const adminEmail = env?.adminEmail ?? process.env.ADMIN_EMAIL ?? "";
  const adminPassword = env?.adminPassword ?? process.env.ADMIN_PASSWORD ?? "";

  // Bootstrap admin user if users table is empty
  if (adminEmail && adminPassword) {
    const count = db.prepare("SELECT COUNT(*) as c FROM users").get() as {
      c: number;
    };
    if (count.c === 0) {
      const { hashPassword } = await import("@/lib/password");
      const { createUser } = await import("@/lib/repositories/users");
      const passwordHash = await hashPassword(adminPassword);
      createUser(db, {
        email: adminEmail,
        password_hash: passwordHash,
        role: "admin",
      });
    }
  }

  // Migrate: add user_id to categories if missing
  migrateAddUserId(db, "categories");
  migrateAddUserId(db, "links");
  migrateSettings(db);

  // Migrate: add avatar column to users if missing
  if (!hasColumn(db, "users", "avatar")) {
    db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
  }

  migrateAddUrlAlt(db);
}

function hasColumn(
  db: Database.Database,
  table: string,
  column: string,
): boolean {
  const cols = db.pragma(`table_info(${table})`) as { name: string }[];
  return cols.some((c) => c.name === column);
}

function migrateAddUserId(db: Database.Database, table: string): void {
  if (hasColumn(db, table, "user_id")) return;

  const adminUser = db
    .prepare("SELECT id FROM users WHERE role = ? LIMIT 1")
    .get("admin") as { id: number } | undefined;
  if (!adminUser)
    throw new Error(`Cannot migrate ${table}: no admin user found`);

  db.exec(
    `ALTER TABLE ${table} ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`,
  );
  db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`).run(
    adminUser.id,
  );
}

function migrateAddUrlAlt(db: Database.Database): void {
  if (hasColumn(db, "links", "url_alt")) return;
  db.exec("ALTER TABLE links ADD COLUMN url_alt TEXT");
}

function migrateSettings(db: Database.Database): void {
  if (hasColumn(db, "settings", "user_id")) return;

  const adminUser = db
    .prepare("SELECT id FROM users WHERE role = ? LIMIT 1")
    .get("admin") as { id: number } | undefined;
  if (!adminUser)
    throw new Error("Cannot migrate settings: no admin user found");

  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  db.exec("DROP TABLE settings");
  db.exec(`
    CREATE TABLE settings (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (user_id, key)
    )
  `);
  const insert = db.prepare(
    "INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?)",
  );
  for (const row of rows) {
    insert.run(adminUser.id, row.key, row.value);
  }
}

/** Creates an isolated in-memory DB for tests */
export function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}
