import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { handleExport } from "./handler";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(handleExport(getDb(), user.userId));
}
