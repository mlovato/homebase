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

/**
 * Content types the favicon proxy will re-serve.
 *
 * The bytes come from a third-party host but leave from this app's own origin,
 * so a response the browser would treat as a document — HTML, or script — must
 * not get through: opening the proxy URL would then run it with the viewer's
 * session. SVG is on the list because most modern sites have no other favicon,
 * and the proxy serves every response under `default-src 'none'; sandbox`,
 * which both denies it scripting and gives it an opaque origin. Uploads stay
 * stricter still: there, nothing forces us to accept SVG at all.
 */
/**
 * Headers that stop a browser treating bytes we did not author as a document of
 * our own: no sniffing, no scripting, and an opaque origin for anything that
 * does render. Both routes that serve foreign bytes from this origin — the
 * favicon proxy and the icon store — send these.
 */
export const FOREIGN_CONTENT_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

export const PROXYABLE_IMAGE_CONTENT_TYPES = new Set([
  ...Object.values(UPLOAD_CONTENT_TYPES),
  "image/vnd.microsoft.icon",
  "image/svg+xml",
]);
