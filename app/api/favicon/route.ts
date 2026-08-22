import { NextRequest, NextResponse } from "next/server";
import { fetchFaviconImage, resolveFavicon } from "./handler";

// Revalidate on every load so a site's updated favicon is picked up immediately,
// while an unchanged favicon costs only a bodiless 304 via its ETag.
const CACHE_CONTROL = "public, max-age=0, must-revalidate";

export async function GET(request: NextRequest) {
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

    const cacheHeaders = { ETag: image.etag, "Cache-Control": CACHE_CONTROL };
    if (request.headers.get("if-none-match") === image.etag) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
    }

    return new NextResponse(image.body, {
      headers: { ...cacheHeaders, "Content-Type": image.contentType },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
