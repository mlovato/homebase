import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { handleBatchHealth } from "./handler";

/** Each url in a batch opens its own socket, held until the abort timeout. */
export const MAX_BATCH_URLS = 100;

export async function GET(request: NextRequest) {
  // Same arbitrary-fetch exposure as /api/health, multiplied by the URL count.
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const urls = request.nextUrl.searchParams.getAll("url");
  if (urls.length > MAX_BATCH_URLS) {
    return NextResponse.json(
      { error: `Too many urls (max ${MAX_BATCH_URLS})` },
      { status: 400 },
    );
  }

  const result = await handleBatchHealth(urls);
  return NextResponse.json(result);
}
