export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertUsableJwtSecret } = await import("@/lib/env");
    assertUsableJwtSecret();

    const { getDb, runMigrations } = await import("@/lib/db");
    const db = getDb();
    await runMigrations(db);
  }
}
