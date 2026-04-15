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

  try {
    const res = await fetch(faviconUrl);
    if (!res.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const contentType = res.headers.get("content-type") ?? "image/x-icon";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
