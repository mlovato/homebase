import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'homebase.db')

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon_type TEXT NOT NULL CHECK(icon_type IN ('builtin','upload','url')),
    icon_value TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.exec(SCHEMA)
  }
  return _db
}

interface MigrationEnv {
  adminEmail: string
  adminPassword: string
}

export async function runMigrations(
  db: Database.Database,
  env?: MigrationEnv
): Promise<void> {
  const adminEmail = env?.adminEmail ?? process.env.ADMIN_EMAIL ?? ''
  const adminPassword = env?.adminPassword ?? process.env.ADMIN_PASSWORD ?? ''

  if (!adminEmail || !adminPassword) return

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
  if (count.c > 0) return

  const { hashPassword } = await import('@/lib/password')
  const { createUser } = await import('@/lib/repositories/users')

  const passwordHash = await hashPassword(adminPassword)
  createUser(db, { email: adminEmail, password_hash: passwordHash, role: 'admin' })
}

/** Creates an isolated in-memory DB for tests */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.exec(SCHEMA)
  return db
}
