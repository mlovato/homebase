/**
 * The value shipped in docker-compose.yml. It is a usable HMAC key, so an
 * instance deployed without editing it accepts session cookies signed by
 * anyone who has read the repo — including a forged `role: "admin"` claim.
 */
export const EXAMPLE_JWT_SECRET = "change-this-to-a-long-random-secret";

const MIN_JWT_SECRET_LENGTH = 16;

/** Single reader for the signing secret; safe to import from the edge runtime. */
export function jwtSecret(): string {
  return process.env.JWT_SECRET ?? "";
}

/**
 * Fails startup when the session-signing secret cannot be trusted.
 *
 * The three readers of JWT_SECRET all default it to "", which turns a missing
 * secret into a zero-length key: `jose` then throws on every sign, so login
 * fails forever with a generic "Login failed" and nothing points at the cause.
 * Checking once at boot converts both that and the shipped-default hole into a
 * single actionable startup error.
 */
export function assertUsableJwtSecret(
  secret: string | undefined = process.env.JWT_SECRET,
): void {
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Generate one with `openssl rand -base64 32` and " +
        "set it in the environment; without it no user can log in.",
    );
  }
  if (secret === EXAMPLE_JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is still the example value from docker-compose.yml. It is a " +
        "working signing key, so anyone who can reach this instance could forge " +
        "an admin session. Replace it with `openssl rand -base64 32`.",
    );
  }
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET is only ${secret.length} characters; use at least ` +
        `${MIN_JWT_SECRET_LENGTH} (\`openssl rand -base64 32\`).`,
    );
  }
}
