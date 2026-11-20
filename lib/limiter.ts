/** Runs at most `limit` tasks at once, starting queued ones in arrival order. */
export function createLimiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  return {
    get idle(): boolean {
      return active === 0;
    },

    async run<T>(task: () => Promise<T>): Promise<T> {
      if (active < limit) active++;
      else await new Promise<void>((resolve) => queue.push(resolve));
      try {
        return await task();
      } finally {
        const next = queue.shift();
        // The slot passes straight to the next task, so the count is unchanged.
        if (next) next();
        else active--;
      }
    },
  };
}

/**
 * Caps how many tasks run at once per key.
 *
 * Keys are independent, so a key whose tasks stall (a host that never answers)
 * cannot hold back the tasks of any other key.
 */
export function createKeyedLimiter(limit: number) {
  const limiters = new Map<string, ReturnType<typeof createLimiter>>();

  return async function run<T>(key: string, task: () => Promise<T>) {
    let limiter = limiters.get(key);
    if (!limiter) {
      limiter = createLimiter(limit);
      limiters.set(key, limiter);
    }
    try {
      return await limiter.run(task);
    } finally {
      if (limiter.idle) limiters.delete(key);
    }
  };
}
