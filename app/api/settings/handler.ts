import type Database from 'better-sqlite3'
import { getHealthCheckInterval, getSearchShortcut, setSetting } from '@/lib/repositories/settings'
import { HEALTH_CHECK_INTERVALS, isValidShortcut } from '@/lib/types'

export function handleGetSettings(db: Database.Database) {
  return {
    health_check_interval: getHealthCheckInterval(db),
    search_shortcut: getSearchShortcut(db),
  }
}

export function handleUpdateSettings(
  db: Database.Database,
  body: Partial<{ health_check_interval: string; search_shortcut: string }>,
  isAdmin: boolean
) {
  if (!isAdmin) return { error: 'Unauthorized', status: 401 }

  if (body.health_check_interval !== undefined) {
    if (!HEALTH_CHECK_INTERVALS.includes(body.health_check_interval as never)) {
      return {
        error: `health_check_interval must be one of: ${HEALTH_CHECK_INTERVALS.join(', ')}`,
        status: 400,
      }
    }
    setSetting(db, 'health_check_interval', body.health_check_interval)
  }

  if (body.search_shortcut !== undefined) {
    if (!isValidShortcut(body.search_shortcut)) {
      return { error: 'Invalid search_shortcut format', status: 400 }
    }
    setSetting(db, 'search_shortcut', body.search_shortcut)
  }

  return { data: handleGetSettings(db), status: 200 }
}
