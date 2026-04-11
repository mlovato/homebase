/**
 * @jest-environment node
 */
import { verifyPassword, createSessionToken, verifySessionToken } from "./auth";

const SECRET = "test-secret-that-is-long-enough-for-hmac-256";

describe("verifyPassword", () => {
  it("returns true when password matches", () => {
    expect(verifyPassword("mysecret", "mysecret")).toBe(true);
  });

  it("returns false when password does not match", () => {
    expect(verifyPassword("wrong", "mysecret")).toBe(false);
  });

  it("returns false for empty submitted password", () => {
    expect(verifyPassword("", "mysecret")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(verifyPassword("Secret", "secret")).toBe(false);
  });
});

describe("createSessionToken / verifySessionToken", () => {
  it("creates a token that verifies with userId and role", async () => {
    const token = await createSessionToken(
      { userId: 1, role: "admin" },
      SECRET,
    );
    const result = await verifySessionToken(token, SECRET);
    expect(result.valid).toBe(true);
    expect(result.userId).toBe(1);
    expect(result.role).toBe("admin");
  });

  it("embeds user role in token", async () => {
    const token = await createSessionToken({ userId: 5, role: "user" }, SECRET);
    const result = await verifySessionToken(token, SECRET);
    expect(result.valid).toBe(true);
    expect(result.userId).toBe(5);
    expect(result.role).toBe("user");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken(
      { userId: 1, role: "admin" },
      SECRET,
    );
    const result = await verifySessionToken(
      token,
      "different-secret-also-long-enough!",
    );
    expect(result.valid).toBe(false);
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken(
      { userId: 1, role: "admin" },
      SECRET,
    );
    const parts = token.split(".");
    parts[1] = Buffer.from('{"userId":999}').toString("base64url");
    const tampered = parts.join(".");
    const result = await verifySessionToken(tampered, SECRET);
    expect(result.valid).toBe(false);
  });

  it("rejects an empty token", async () => {
    const result = await verifySessionToken("", SECRET);
    expect(result.valid).toBe(false);
  });

  it("rejects a token missing userId and role claims", async () => {
    const { SignJWT } = await import("jose");
    const key = new TextEncoder().encode(SECRET);
    const legacyToken = await new SignJWT({ admin: true })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(key);
    const result = await verifySessionToken(legacyToken, SECRET);
    expect(result.valid).toBe(false);
  });
});
