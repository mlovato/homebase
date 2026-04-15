import { NextRequest, NextResponse } from "next/server";
import { resolveFavicon } from "./handler";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const faviconUrl = await resolveFavicon(url);
  if (!faviconUrl) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.redirect(faviconUrl, {
    status: 302,
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
