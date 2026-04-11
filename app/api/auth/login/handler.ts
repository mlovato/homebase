import type Database from "better-sqlite3";
import { createSessionToken } from "@/lib/auth";
import { verifyHashedPassword } from "@/lib/password";
import { getUserByEmail } from "@/lib/repositories/users";

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
  if (!body.email || !body.password) {
    return { success: false, error: "Email and password are required" };
  }

  const user = getUserByEmail(db, body.email);
  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }

  const valid = await verifyHashedPassword(body.password, user.password_hash);
  if (!valid) {
    return { success: false, error: "Invalid email or password" };
  }

  const token = await createSessionToken(
    { userId: user.id, role: user.role },
    jwtSecret,
  );
  return { success: true, token };
}
