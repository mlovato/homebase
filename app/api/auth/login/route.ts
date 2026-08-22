import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/auth";
import { jwtSecret } from "@/lib/env";
import { firstForwardedValue } from "@/lib/forwarded";
import { handleLogin } from "./handler";

/**
 * Whether the visit reached us over TLS.
 *
 * The session cookie is marked Secure only then. Setting it unconditionally
 * would make the browser drop the cookie on the plain-HTTP LAN deployment this
 * app is usually run as, and nobody could log in; leaving it off on an HTTPS
 * deployment lets the session go out in the clear on any stray http:// request.
 */
function isSecureRequest(request: NextRequest): boolean {
  const forwarded = firstForwardedValue(
    request.headers.get("x-forwarded-proto"),
  );
  if (forwarded) return forwarded === "https";
  return request.nextUrl.protocol === "https:";
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await handleLogin(body, getDb(), jwtSecret());

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, result.token!, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: isSecureRequest(request),
  });
  return response;
}
