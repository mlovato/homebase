/**
 * Input rules shared by the API handlers.
 *
 * The admin forms already enforce these, but the forms are not the only caller:
 * the REST API and the import file reach the same repositories, so a rule that
 * lives only in a form is not a rule at all.
 */

/**
 * Text that is actually present.
 *
 * A JSON body can type any field as anything, and handing a non-string to a
 * query parameter or to scrypt throws — which reached the caller as an empty
 * 500 rather than the documented validation error.
 */
export function isFilledString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * A URL the dashboard can actually open.
 *
 * React refuses to render a `javascript:` href, so a link stored with one shows
 * a card that silently does nothing when clicked, and its health dot never
 * leaves "checking". Anything that is not http(s) is rejected at the boundary
 * instead.
 */
export function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value.trim());
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * The same rule for a field where blank means "not set" — the alternative URL
 * is stored as NULL when empty, so only a filled one has to be openable.
 */
export function isOptionalHttpUrl(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return isHttpUrl(value);
}

/**
 * A number SQLite stores as an integer, in a column that expects one.
 *
 * Both fields typed that way need it, for different reasons. SQLite keeps a
 * non-numeric `sort_order` in its INTEGER column as text, and text sorts after
 * every number — so one bad write pins that row to the end of its list forever,
 * and `MAX(sort_order) + 1` then hands the same position to the next row
 * created. A row id cannot even be bound unless it is one: better-sqlite3
 * refuses a boolean, an object or an array outright, and that throw reached the
 * caller as an empty 500 instead of the documented validation error.
 */
function isWholeNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isSafeInteger(value);
}

/** A sort position, where absent means "append at the end". */
export function isOptionalSortOrder(value: unknown): boolean {
  return value === undefined || isWholeNumber(value);
}

export const SORT_ORDER_ERROR = "sort_order must be a whole number";

/**
 * A row id the database can look up, or absent/null for "none".
 *
 * A numeric-looking string is refused too: SQLite converts it for the
 * comparison, so `"1a"` answered 404 for a request that was simply malformed.
 */
export function isOptionalRowId(value: unknown): boolean {
  return value == null || isWholeNumber(value);
}

/**
 * Text for a column that also accepts NULL — an icon value, for instance.
 *
 * Same binding rule as a row id: anything else threw at the write rather than
 * being refused at the boundary.
 */
export function isOptionalText(value: unknown): boolean {
  return value == null || typeof value === "string";
}

/**
 * A path segment that is exactly a whole number.
 *
 * `parseInt` reads a leading number and ignores whatever follows, so
 * `/api/links/1abc` used to address link 1 — a mangled URL quietly edited or
 * deleted the wrong row. NaN is returned so the handlers' existing check
 * answers 400.
 */
export function parseRouteId(raw: string): number {
  return /^\d+$/.test(raw) ? Number(raw) : NaN;
}
