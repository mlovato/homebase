import type Database from 'better-sqlite3'
import { getHealthCheckInterval, setSetting } from '@/lib/repositories/settings'
import { HEALTH_CHECK_INTERVALS } from '@/lib/types'

export function handleGetSettings(db: Database.Database) {
  return { health_check_interval: getHealthCheckInterval(db) }
}

export function handleUpdateSettings(
  db: Database.Database,
  body: Partial<{ health_check_interval: string }>,
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

  return { data: handleGetSettings(db), status: 200 }
}
