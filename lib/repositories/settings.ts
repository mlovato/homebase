import type Database from "better-sqlite3";
import type { HealthCheckInterval, SearchShortcut } from "@/lib/types";
import {
  DEFAULT_HEALTH_CHECK_INTERVAL,
  HEALTH_CHECK_INTERVALS,
  DEFAULT_SEARCH_SHORTCUT,
} from "@/lib/types";

export function getSetting(
  db: Database.Database,
  userId: number,
  key: string,
): string | undefined {
  const row = db
    .prepare("SELECT value FROM settings WHERE user_id = ? AND key = ?")
    .get(userId, key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(
  db: Database.Database,
  userId: number,
  key: string,
  value: string,
): void {
  db.prepare(
    "INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value",
  ).run(userId, key, value);
}

export function getHealthCheckInterval(
  db: Database.Database,
  userId: number,
): HealthCheckInterval {
  const stored = getSetting(db, userId, "health_check_interval");
  if (
    stored &&
    HEALTH_CHECK_INTERVALS.includes(stored as HealthCheckInterval)
  ) {
    return stored as HealthCheckInterval;
  }
  return DEFAULT_HEALTH_CHECK_INTERVAL;
}

export function getSearchShortcut(
  db: Database.Database,
  userId: number,
): SearchShortcut {
  return getSetting(db, userId, "search_shortcut") ?? DEFAULT_SEARCH_SHORTCUT;
}
