import { NextRequest, NextResponse } from "next/server";
import { handleBatchHealth } from "./handler";

export async function GET(request: NextRequest) {
  const urls = request.nextUrl.searchParams.getAll("url");
  const result = await handleBatchHealth(urls);
  return NextResponse.json(result);
}
