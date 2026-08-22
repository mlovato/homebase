import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { searchIcons } from "./handler";

export async function GET(request: NextRequest) {
  // Every miss downloads and caches a megabyte of upstream metadata, so this
  // must not be a way for an anonymous caller to drive outbound requests.
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchIcons(q);
  return NextResponse.json({ results });
}
