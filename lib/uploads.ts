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

/** Stored uploads are always `<uuid><ext>`; anything else is not ours to serve. */
export function isStoredUploadName(filename: string): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i.test(
      filename,
    ) && uploadContentType(filename) !== null
  );
}
