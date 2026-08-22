import type Database from "better-sqlite3";
import {
  getHealthCheckInterval,
  getSearchShortcut,
  setSetting,
} from "@/lib/repositories/settings";
import { HEALTH_CHECK_INTERVALS, isValidShortcut } from "@/lib/types";

export function handleGetSettings(db: Database.Database, userId: number) {
  return {
    health_check_interval: getHealthCheckInterval(db, userId),
    search_shortcut: getSearchShortcut(db, userId),
  };
}

export function handleUpdateSettings(
  db: Database.Database,
  userId: number,
  body: Partial<{ health_check_interval: string; search_shortcut: string }>,
) {
  const { health_check_interval: interval, search_shortcut: shortcut } = body;

  if (
    interval !== undefined &&
    !HEALTH_CHECK_INTERVALS.includes(interval as never)
  ) {
    return {
      error: `health_check_interval must be one of: ${HEALTH_CHECK_INTERVALS.join(", ")}`,
      status: 400,
    };
  }
  if (shortcut !== undefined && !isValidShortcut(shortcut)) {
    return { error: "Invalid search_shortcut format", status: 400 };
  }

  if (interval !== undefined) {
    setSetting(db, userId, "health_check_interval", interval);
  }
  if (shortcut !== undefined) {
    setSetting(db, userId, "search_shortcut", shortcut);
  }

  return { data: handleGetSettings(db, userId), status: 200 };
}
