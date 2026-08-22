import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { checkHealth } from "./handler";

export async function GET(request: NextRequest) {
  // This route fetches an arbitrary caller-supplied URL from inside the
  // network, so an unauthenticated caller could use it to probe internal hosts.
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url") ?? "";
  const status = await checkHealth(url);
  return NextResponse.json({ status });
}
