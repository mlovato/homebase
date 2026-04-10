export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getDb, runMigrations } = await import('@/lib/db')
    const db = getDb()
    await runMigrations(db)
  }
}
