import type Database from "better-sqlite3";
import { createSessionToken } from "@/lib/auth";
import { DECOY_PASSWORD_HASH, verifyHashedPassword } from "@/lib/password";
import { getUserByEmail } from "@/lib/repositories/users";
import { isFilledString } from "@/lib/validation";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  error?: string;
}

export async function handleLogin(
  body: LoginRequest,
  db: Database.Database,
  jwtSecret: string,
): Promise<LoginResult> {
  if (!isFilledString(body.email) || !isFilledString(body.password)) {
    return { success: false, error: "Email and password are required" };
  }

  const user = getUserByEmail(db, body.email);
  // Verified against the decoy when the email is unknown: skipping the hash
  // made the two cases separable by response time, enumerating every account.
  const valid = await verifyHashedPassword(
    body.password,
    user?.password_hash ?? DECOY_PASSWORD_HASH,
  );
  if (!user || !valid) {
    return { success: false, error: "Invalid email or password" };
  }

  const token = await createSessionToken(
    { userId: user.id, role: user.role },
    jwtSecret,
  );
  return { success: true, token };
}
