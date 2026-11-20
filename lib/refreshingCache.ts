interface RefreshingCacheOptions<T> {
  /** Fetches a fresh value; null (or a rejection) means nothing was found. */
  load: (key: string) => Promise<T | null>;
  /** How old an entry may get before a read also refreshes it. */
  refreshAfterMs: number;
  maxEntries: number;
}

/**
 * A stale-while-revalidate cache that never trades a good value for a failure.
 *
 * A known key is answered at once from memory. Once its entry is older than
 * `refreshAfterMs`, the read also starts a background reload, so a changed
 * value shows up on a later read. A reload that fails leaves the old value in
 * place and waits another `refreshAfterMs` before trying again. Concurrent
 * loads of the same key share one in-flight call.
 */
export function createRefreshingCache<T>({
  load,
  refreshAfterMs,
  maxEntries,
}: RefreshingCacheOptions<T>) {
  const entries = new Map<string, { value: T; storedAt: number }>();
  const inFlight = new Map<string, Promise<T | null>>();

  function store(key: string, value: T): void {
    // Re-inserting moves the key to the end, so the first key is the oldest.
    entries.delete(key);
    entries.set(key, { value, storedAt: Date.now() });
    if (entries.size > maxEntries) {
      entries.delete(entries.keys().next().value!);
    }
  }

  function reload(key: string): Promise<T | null> {
    const pending = inFlight.get(key);
    if (pending) return pending;

    const loading = load(key)
      .catch(() => null)
      .then((value) => {
        const previous = entries.get(key);
        if (value !== null) store(key, value);
        else if (previous) previous.storedAt = Date.now();
        return value;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, loading);
    return loading;
  }

  return {
    async get(key: string): Promise<T | null> {
      const entry = entries.get(key);
      if (!entry) return reload(key);
      if (Date.now() - entry.storedAt > refreshAfterMs) void reload(key);
      return entry.value;
    },
  };
}
