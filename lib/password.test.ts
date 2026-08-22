/**
 * @jest-environment node
 */
import { hashPassword, verifyHashedPassword } from "./password";

describe("hashPassword / verifyHashedPassword", () => {
  it("hashes a password and verifies it", async () => {
    const hash = await hashPassword("mypassword");
    expect(typeof hash).toBe("string");
    expect(hash).not.toBe("mypassword");
    expect(await verifyHashedPassword("mypassword", hash)).toBe(true);
  });

  it("rejects wrong password against hash", async () => {
    const hash = await hashPassword("mypassword");
    expect(await verifyHashedPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for the same password (unique salt)", async () => {
    const hash1 = await hashPassword("same");
    const hash2 = await hashPassword("same");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyHashedPassword with an unusable stored hash", () => {
  // Each of these used to throw inside the scrypt callback, after the promise
  // executor had already returned — leaving the promise unsettled forever.
  const unusable = [
    ["no separator", "not-a-valid-hash"],
    ["empty string", ""],
    ["salt only", "abc123:"],
    ["key only", ":abc123"],
    ["key of the wrong length", "abc123:00ff"],
    ["non-hex key", "abc123:zzzz"],
  ] as const;

  it.each(unusable)(
    "resolves false for a hash with %s",
    async (_label, hash) => {
      await expect(verifyHashedPassword("hunter2", hash)).resolves.toBe(false);
    },
  );

  it("settles rather than hanging", async () => {
    const outcome = await Promise.race([
      verifyHashedPassword("hunter2", "not-a-valid-hash").then(() => "settled"),
      new Promise((r) => setTimeout(() => r("hung"), 500)),
    ]);
    expect(outcome).toBe("settled");
  });

  it("still verifies a real hash", async () => {
    const hash = await hashPassword("hunter2");
    await expect(verifyHashedPassword("hunter2", hash)).resolves.toBe(true);
    await expect(verifyHashedPassword("wrong", hash)).resolves.toBe(false);
  });
});
