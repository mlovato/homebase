/**
 * @jest-environment node
 */
import { assertUsableJwtSecret, EXAMPLE_JWT_SECRET } from "./env";

describe("assertUsableJwtSecret", () => {
  it("accepts a strong secret", () => {
    expect(() =>
      assertUsableJwtSecret("Xk9pQ2mZ7vL4nR8sT1wY3bC6dF0gH5jK"),
    ).not.toThrow();
  });

  it("rejects a missing secret, naming the consequence", () => {
    expect(() => assertUsableJwtSecret(undefined)).toThrow(/not set/i);
    expect(() => assertUsableJwtSecret("")).toThrow(/log in/i);
  });

  // It is a working HMAC key, so an unedited deployment would accept a session
  // cookie forged by anyone who has read the repo.
  it("rejects the example secret shipped in docker-compose.yml", () => {
    expect(() => assertUsableJwtSecret(EXAMPLE_JWT_SECRET)).toThrow(
      /example value/i,
    );
  });

  it("rejects a secret that is too short", () => {
    expect(() => assertUsableJwtSecret("short")).toThrow(/characters/i);
  });

  it("reads process.env.JWT_SECRET when no argument is given", () => {
    const previous = process.env.JWT_SECRET;
    try {
      process.env.JWT_SECRET = EXAMPLE_JWT_SECRET;
      expect(() => assertUsableJwtSecret()).toThrow(/example value/i);
      process.env.JWT_SECRET = "Xk9pQ2mZ7vL4nR8sT1wY3bC6dF0gH5jK";
      expect(() => assertUsableJwtSecret()).not.toThrow();
    } finally {
      process.env.JWT_SECRET = previous;
    }
  });
});
