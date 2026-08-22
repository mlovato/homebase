import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { FOREIGN_CONTENT_HEADERS } from "@/lib/constants";
import {
  UPLOADS_DIR,
  isStoredUploadName,
  uploadContentType,
} from "@/lib/uploads";

interface Params {
  params: Promise<{ filename: string }>;
}

/**
 * Serves an uploaded icon.
 *
 * In production Next enumerates `public/` once at startup and serves only what
 * it found then, so an icon uploaded while the server is running 404s until the
 * next restart. Files that existed at startup are still served statically and
 * never reach this handler.
 */
export async function GET(_request: Request, { params }: Params) {
  const { filename } = await params;
  const contentType = uploadContentType(filename);
  if (!isStoredUploadName(filename) || !contentType) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const body = await readFile(path.join(UPLOADS_DIR, filename));
    return new NextResponse(
      new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
      {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          ...FOREIGN_CONTENT_HEADERS,
        },
      },
    );
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
