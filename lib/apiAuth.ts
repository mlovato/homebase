import { NextRequest } from "next/server";
import type Database from "better-sqlite3";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getUserById } from "@/lib/repositories/users";
import type { TokenClaims } from "@/lib/auth";

/**
 * Resolves the caller from their session cookie.
 *
 * The token only proves who signed in, and it stays valid for 30 days. The
 * account behind it can be promoted, demoted or deleted in the meantime, so the
 * role is read from the database rather than the token claim — otherwise a
 * revoked admin keeps admin powers, and a freshly promoted one is refused by
 * the very routes the UI has already unlocked for them.
 */
export async function getAuthenticatedUser(
  request: NextRequest,
  db?: Database.Database,
): Promise<TokenClaims | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value ?? "";
  const result = await verifySessionToken(token, process.env.JWT_SECRET ?? "");
  if (!result.valid) return null;

  const user = getUserById(db ?? getDb(), result.userId);
  if (!user) return null;

  return { userId: user.id, role: user.role };
}
