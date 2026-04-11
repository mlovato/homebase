import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/types";

const TOKEN_EXPIRY = "24h";
const COOKIE_NAME = "homebase_session";

export function verifyPassword(submitted: string, expected: string): boolean {
  return submitted.length > 0 && submitted === expected;
}

export interface TokenClaims {
  userId: number;
  role: UserRole;
}

export async function createSessionToken(
  claims: TokenClaims,
  secret: string,
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ userId: claims.userId, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(key);
}

export type VerifyResult =
  | { valid: true; userId: number; role: UserRole }
  | { valid: false; userId?: undefined; role?: undefined };

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<VerifyResult> {
  if (!token) return { valid: false };
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    if (typeof payload.userId !== "number" || !payload.role) {
      return { valid: false };
    }
    return {
      valid: true,
      userId: payload.userId,
      role: payload.role as UserRole,
    };
  } catch {
    return { valid: false };
  }
}

export { COOKIE_NAME };
