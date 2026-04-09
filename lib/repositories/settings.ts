import type Database from 'better-sqlite3'
import type { HealthCheckInterval } from '@/lib/types'
import { DEFAULT_HEALTH_CHECK_INTERVAL, HEALTH_CHECK_INTERVALS } from '@/lib/types'

export function getSetting(db: Database.Database, key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value
}

export function setSetting(db: Database.Database, key: string, value: string): void {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

export function getHealthCheckInterval(db: Database.Database): HealthCheckInterval {
  const stored = getSetting(db, 'health_check_interval')
  if (stored && HEALTH_CHECK_INTERVALS.includes(stored as HealthCheckInterval)) {
    return stored as HealthCheckInterval
  }
  return DEFAULT_HEALTH_CHECK_INTERVAL
}
