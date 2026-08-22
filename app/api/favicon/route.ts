import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { FOREIGN_CONTENT_HEADERS } from "@/lib/constants";
import { fetchFaviconImage, resolveFavicon } from "./handler";

// Revalidate on every load so a site's updated favicon is picked up immediately,
// while an unchanged favicon costs only a bodiless 304 via its ETag.
const CACHE_CONTROL = "public, max-age=0, must-revalidate";

export async function GET(request: NextRequest) {
  // Fetches an arbitrary caller-supplied URL and returns its bytes, so it must
  // not be reachable without a session.
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const faviconUrl = await resolveFavicon(url);
  if (!faviconUrl) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const image = await fetchFaviconImage(faviconUrl);
    if (!image) {
      return new NextResponse(null, { status: 404 });
    }

    // The handler only hands back allow-listed image types; these headers keep
    // even those from being treated as a document on this origin.
    const headers = {
      ETag: image.etag,
      "Cache-Control": CACHE_CONTROL,
      ...FOREIGN_CONTENT_HEADERS,
    };
    if (request.headers.get("if-none-match") === image.etag) {
      return new NextResponse(null, { status: 304, headers });
    }

    return new NextResponse(image.body, {
      headers: { ...headers, "Content-Type": image.contentType },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
