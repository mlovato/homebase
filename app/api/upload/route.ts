import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser } from "@/lib/apiAuth";

const ALLOWED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 2 MB)" },
      { status: 400 },
    );
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      {
        error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const filename = `${uuidv4()}${ext}`;
  const uploadPath = path.join(process.cwd(), "public", "uploads", filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(uploadPath, buffer);

  return NextResponse.json({ path: `/uploads/${filename}` }, { status: 201 });
}
