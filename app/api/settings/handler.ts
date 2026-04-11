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
  if (body.health_check_interval !== undefined) {
    if (!HEALTH_CHECK_INTERVALS.includes(body.health_check_interval as never)) {
      return {
        error: `health_check_interval must be one of: ${HEALTH_CHECK_INTERVALS.join(", ")}`,
        status: 400,
      };
    }
    setSetting(db, userId, "health_check_interval", body.health_check_interval);
  }

  if (body.search_shortcut !== undefined) {
    if (!isValidShortcut(body.search_shortcut)) {
      return { error: "Invalid search_shortcut format", status: 400 };
    }
    setSetting(db, userId, "search_shortcut", body.search_shortcut);
  }

  return { data: handleGetSettings(db, userId), status: 200 };
}
