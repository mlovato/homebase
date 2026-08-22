import type Database from "better-sqlite3";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserByEmail,
  getUserById,
  countAdmins,
} from "@/lib/repositories/users";
import { hashPassword } from "@/lib/password";
import { VALID_ROLES, AVATAR_OPTIONS } from "@/lib/types";
import type { UserRole } from "@/lib/types";

const MIN_PASSWORD_LENGTH = 4;

function isOnlyAdmin(db: Database.Database, id: number): boolean {
  return getUserById(db, id)?.role === "admin" && countAdmins(db) === 1;
}

function emailTakenByOther(
  db: Database.Database,
  email: string,
  exceptId?: number,
): boolean {
  const owner = getUserByEmail(db, email);
  return owner !== undefined && owner.id !== exceptId;
}

export function handleListUsers(db: Database.Database) {
  return getAllUsers(db);
}

export async function handleCreateUser(
  db: Database.Database,
  body: { email?: string; password?: string; role?: string; avatar?: string },
) {
  if (!body.email?.trim()) return { error: "Email is required", status: 400 };
  if (!body.password || body.password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      status: 400,
    };
  }
  if (body.role && !VALID_ROLES.includes(body.role as UserRole)) {
    return { error: "Role must be admin or user", status: 400 };
  }
  if (
    body.avatar &&
    !AVATAR_OPTIONS.includes(body.avatar as (typeof AVATAR_OPTIONS)[number])
  ) {
    return { error: "Invalid avatar", status: 400 };
  }

  if (emailTakenByOther(db, body.email.trim()))
    return { error: "Email already in use", status: 409 };

  const passwordHash = await hashPassword(body.password);
  const user = createUser(db, {
    email: body.email.trim(),
    password_hash: passwordHash,
    role: (body.role as UserRole) ?? "user",
    avatar: body.avatar ?? null,
  });
  return { data: user, status: 201 };
}

export async function handleUpdateUser(
  db: Database.Database,
  id: number,
  body: {
    email?: string;
    password?: string;
    role?: string;
    avatar?: string | null;
  },
) {
  if (isNaN(id)) return { error: "Invalid id", status: 400 };
  if (body.role && !VALID_ROLES.includes(body.role as UserRole)) {
    return { error: "Role must be admin or user", status: 400 };
  }
  if (
    body.avatar &&
    !AVATAR_OPTIONS.includes(body.avatar as (typeof AVATAR_OPTIONS)[number])
  ) {
    return { error: "Invalid avatar", status: 400 };
  }

  // Demoting the only admin leaves nobody who can promote one back, and the
  // Users API is admin-only — the instance would be permanently unmanageable.
  if (body.role === "user" && isOnlyAdmin(db, id)) {
    return { error: "Cannot demote the only admin", status: 400 };
  }

  const updates: {
    email?: string;
    password_hash?: string;
    role?: UserRole;
    avatar?: string | null;
  } = {};
  if (body.email?.trim()) {
    const email = body.email.trim();
    if (emailTakenByOther(db, email, id))
      return { error: "Email already in use", status: 409 };
    updates.email = email;
  }
  if (body.password) {
    if (body.password.length < MIN_PASSWORD_LENGTH) {
      return {
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        status: 400,
      };
    }
    updates.password_hash = await hashPassword(body.password);
  }
  if (body.role) updates.role = body.role as UserRole;
  if (body.avatar !== undefined) updates.avatar = body.avatar ?? null;

  const updated = updateUser(db, id, updates);
  if (!updated) return { error: "Not found", status: 404 };

  return { data: updated, status: 200 };
}

export function handleDeleteUser(
  db: Database.Database,
  id: number,
  currentUserId: number,
) {
  if (isNaN(id)) return { error: "Invalid id", status: 400 };

  // Deleting yourself cascades away all your links, categories and settings and
  // logs you straight out, so it is never what the caller wanted.
  if (id === currentUserId) {
    return { error: "You cannot delete your own account", status: 400 };
  }
  // Belt and braces for the invariant itself, so it survives a future
  // self-service delete route that does not go through the guard above.
  if (isOnlyAdmin(db, id)) {
    return { error: "Cannot delete the only admin", status: 400 };
  }

  const deleted = deleteUser(db, id);
  if (!deleted) return { error: "Not found", status: 404 };

  return { data: { ok: true }, status: 200 };
}
