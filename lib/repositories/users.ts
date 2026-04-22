import type Database from "better-sqlite3";
import type {
  User,
  UserWithHash,
  CreateUserInput,
  UpdateUserInput,
} from "@/lib/types";

export function createUser(
  db: Database.Database,
  input: CreateUserInput,
): User {
  const stmt = db.prepare(
    "INSERT INTO users (email, password_hash, role, avatar) VALUES (?, ?, ?, ?) RETURNING id, email, role, avatar, created_at",
  );
  return stmt.get(
    input.email,
    input.password_hash,
    input.role ?? "user",
    input.avatar ?? null,
  ) as User;
}

export function getUserById(
  db: Database.Database,
  id: number,
): User | undefined {
  return db
    .prepare(
      "SELECT id, email, role, avatar, created_at FROM users WHERE id = ?",
    )
    .get(id) as User | undefined;
}

export function getUserByEmail(
  db: Database.Database,
  email: string,
): UserWithHash | undefined {
  return db
    .prepare(
      "SELECT id, email, password_hash, role, avatar, created_at FROM users WHERE email = ?",
    )
    .get(email) as UserWithHash | undefined;
}

export function getUserByIdWithHash(
  db: Database.Database,
  id: number,
): UserWithHash | undefined {
  return db
    .prepare(
      "SELECT id, email, password_hash, role, avatar, created_at FROM users WHERE id = ?",
    )
    .get(id) as UserWithHash | undefined;
}

export function getAllUsers(db: Database.Database): User[] {
  return db
    .prepare(
      "SELECT id, email, role, avatar, created_at FROM users ORDER BY id ASC",
    )
    .all() as User[];
}

export function updateUser(
  db: Database.Database,
  id: number,
  input: UpdateUserInput,
): User | undefined {
  const existing = getUserByIdWithHash(db, id);
  if (!existing) return undefined;

  const updated = { ...existing, ...input };
  db.prepare(
    "UPDATE users SET email = ?, password_hash = ?, role = ?, avatar = ? WHERE id = ?",
  ).run(
    updated.email,
    updated.password_hash,
    updated.role,
    updated.avatar ?? null,
    id,
  );

  return getUserById(db, id);
}

export function deleteUser(db: Database.Database, id: number): boolean {
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getAdminUser(db: Database.Database): User | undefined {
  return db
    .prepare(
      "SELECT id, email, role, avatar, created_at FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1",
    )
    .get() as User | undefined;
}
