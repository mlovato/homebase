import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { jwtSecret } from "@/lib/env";

/** Pages reachable without a session. API routes never reach this check. */
const PUBLIC_PATHS = ["/admin/login"];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Whether a state-changing API call came from somewhere other than this
 * instance.
 *
 * `SameSite=lax` keeps the session cookie off cross-*site* requests, but a site
 * does not include the port: another service on the same host — the very thing
 * this dashboard exists to link to — is same-site, so its pages post with the
 * user's cookie attached. A `text/plain` body is a CORS "simple request" that
 * needs no preflight, and `request.json()` parses it whatever the header says,
 * so `POST /api/import` could wipe every link and `POST /api/users` could mint
 * an admin account.
 *
 * Only a present-and-foreign Origin is refused. Browsers always send it on
 * these methods; a script or `curl` sends none, and had no cookie to abuse.
 */
function isForeignOriginMutation(request: NextRequest): boolean {
  if (!MUTATING_METHODS.has(request.method)) return false;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  // A reverse proxy may rewrite Host; the browser's Origin names the address
  // the user actually visited. A browser cannot set x-forwarded-host on a
  // simple request — a custom header would force a preflight.
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The API routes authenticate themselves and answer with JSON, so this only
  // adds the origin gate — a redirect here would hand a fetch a login page.
  if (pathname.startsWith("/api/")) {
    if (isForeignOriginMutation(request)) {
      return NextResponse.json(
        { error: "Cross-origin request refused" },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value ?? "";
  const result = await verifySessionToken(token, jwtSecret());

  if (!result.valid) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/api/:path*"],
};
