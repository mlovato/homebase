/**
 * @jest-environment node
 */
import { createKeyedLimiter, createLimiter } from "./limiter";

/** A promise the test opens by hand, to hold a task in flight. */
function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("createLimiter", () => {
  it("runs no more than the limit at once", async () => {
    const limiter = createLimiter(2);
    const gates = [gate(), gate(), gate()];
    let running = 0;
    let peak = 0;

    const tasks = gates.map(({ opened }) =>
      limiter.run(async () => {
        running++;
        peak = Math.max(peak, running);
        await opened;
        running--;
      }),
    );
    await flush();
    expect(running).toBe(2);

    gates.forEach(({ open }) => open());
    await Promise.all(tasks);
    expect(peak).toBe(2);
  });

  it("starts a queued task as soon as a slot frees up", async () => {
    const limiter = createLimiter(1);
    const first = gate();
    const started: string[] = [];

    const a = limiter.run(async () => {
      started.push("a");
      await first.opened;
    });
    const b = limiter.run(async () => {
      started.push("b");
    });
    await flush();
    expect(started).toEqual(["a"]);

    first.open();
    await Promise.all([a, b]);
    expect(started).toEqual(["a", "b"]);
  });

  it("returns the task's result", async () => {
    await expect(createLimiter(1).run(async () => 42)).resolves.toBe(42);
  });

  it("frees the slot when a task fails", async () => {
    const limiter = createLimiter(1);

    await expect(
      limiter.run(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    await expect(limiter.run(async () => "next")).resolves.toBe("next");
  });
});

describe("createKeyedLimiter", () => {
  it("limits tasks that share a key", async () => {
    const run = createKeyedLimiter(1);
    const first = gate();
    const started: string[] = [];

    const a = run("nas", async () => {
      started.push("a");
      await first.opened;
    });
    const b = run("nas", async () => {
      started.push("b");
    });
    await flush();
    expect(started).toEqual(["a"]);

    first.open();
    await Promise.all([a, b]);
    expect(started).toEqual(["a", "b"]);
  });

  // A host that is down must not hold back icons served by a healthy one.
  it("does not make one key wait on another", async () => {
    const run = createKeyedLimiter(1);
    const stalled = gate();
    const started: string[] = [];

    run("unreachable", async () => {
      started.push("unreachable");
      await stalled.opened;
    });
    await run("nas", async () => {
      started.push("nas");
    });

    expect(started).toEqual(["unreachable", "nas"]);
    stalled.open();
  });

  it("limits a key again after all of its tasks have finished", async () => {
    const run = createKeyedLimiter(1);
    await run("nas", async () => {});

    const first = gate();
    const started: string[] = [];
    const a = run("nas", async () => {
      started.push("a");
      await first.opened;
    });
    const b = run("nas", async () => {
      started.push("b");
    });
    await flush();
    expect(started).toEqual(["a"]);

    first.open();
    await Promise.all([a, b]);
  });
});
