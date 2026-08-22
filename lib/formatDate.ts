/**
 * Formats a timestamp written by SQLite's `datetime('now')`.
 *
 * That value is UTC with no zone marker ("2026-08-22 23:30:00"). Handed to
 * `new Date(...)` as-is it is interpreted as *local* time, so a row written late
 * in the UTC day renders as the previous date for anyone east of UTC.
 */
export function formatStoredDate(storedUtc: string): string {
  const parsed = new Date(`${storedUtc.replace(" ", "T")}Z`);
  if (Number.isNaN(parsed.getTime())) return storedUtc;
  return parsed.toLocaleDateString();
}
