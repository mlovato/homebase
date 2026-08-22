export const DASHBOARD_ICONS_CDN =
  "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg";
export const DASHBOARD_ICONS_METADATA_URL =
  "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/metadata.json";

/**
 * Icon uploads are served from the app's own origin, so SVG is deliberately
 * excluded: an SVG carrying a <script> would run with the viewer's session.
 */
export const UPLOAD_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

export const ALLOWED_UPLOAD_EXTENSIONS = Object.keys(UPLOAD_CONTENT_TYPES);
