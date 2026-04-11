import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { handleUpdateUser, handleDeleteUser } from "../handler";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getAuthenticatedUser(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await handleUpdateUser(getDb(), parseInt(id, 10), body);

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, { status: result.status });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getAuthenticatedUser(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = handleDeleteUser(getDb(), parseInt(id, 10));

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data, { status: result.status });
}
