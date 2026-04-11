import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getDb } from "@/lib/db";
import { getUserById } from "@/lib/repositories/users";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = getUserById(getDb(), auth.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  });
}
