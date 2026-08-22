/**
 * The first value of a comma-chained `X-Forwarded-*` header.
 *
 * Every proxy a request passes through appends its own value, so the header
 * arrives as a list and only the first entry describes what the browser saw.
 * Read whole, `x-forwarded-host: home.example.com, edge.internal` matches no
 * Origin at all, and the origin gate then refuses every save. An empty value is
 * treated as absent for the same reason: `??` does not fire on `""`, so a proxy
 * that sends the header blank had the gate comparing every Origin against it.
 */
export function firstForwardedValue(raw: string | null): string | null {
  if (raw === null) return null;
  const first = raw.split(",")[0].trim();
  return first === "" ? null : first;
}
