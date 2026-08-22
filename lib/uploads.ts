import { existsSync } from "fs";
import path from "path";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  UPLOAD_CONTENT_TYPES,
} from "@/lib/constants";

/**
 * Icon uploads live under `public/` so files present at server start are served
 * statically. Next enumerates that tree only once at startup, so anything
 * written later is served by `app/uploads/[filename]/route.ts` instead.
 */
export const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export { ALLOWED_UPLOAD_EXTENSIONS };

export function uploadContentType(filename: string): string | null {
  return UPLOAD_CONTENT_TYPES[path.extname(filename).toLowerCase()] ?? null;
}

/** Where a stored upload is served from, and what an icon_value looks like. */
export const UPLOADS_URL_PREFIX = "/uploads/";

export function uploadPublicPath(filename: string): string {
  return `${UPLOADS_URL_PREFIX}${filename}`;
}

/**
 * Whether the file behind an `upload` icon_value is still in the store.
 *
 * An export names these files without carrying them, so a backup restored
 * elsewhere refers to icons that were never copied across.
 */
export function storedUploadExists(publicPath: string): boolean {
  if (!publicPath.startsWith(UPLOADS_URL_PREFIX)) return false;
  const filename = publicPath.slice(UPLOADS_URL_PREFIX.length);
  if (!isStoredUploadName(filename)) return false;
  return existsSync(path.join(UPLOADS_DIR, filename));
}

/** Stored uploads are always `<uuid><ext>`; anything else is not ours to serve. */
export function isStoredUploadName(filename: string): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i.test(
      filename,
    ) && uploadContentType(filename) !== null
  );
}
