import { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import type { TokenClaims } from "@/lib/auth";

export async function getAuthenticatedUser(
  request: NextRequest,
): Promise<TokenClaims | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value ?? "";
  const result = await verifySessionToken(token, process.env.JWT_SECRET ?? "");
  if (!result.valid) return null;
  return { userId: result.userId, role: result.role };
}

export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const user = await getAuthenticatedUser(request);
  return user?.role === "admin";
}
