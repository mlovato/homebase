/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { handleChangePassword } from "./handler";
import { hashPassword, verifyHashedPassword } from "@/lib/password";
import { createUser, getUserByEmail } from "@/lib/repositories/users";
import type Database from "better-sqlite3";

let db: Database.Database;
let userId: number;

beforeEach(async () => {
  db = createTestDb();
  const hash = await hashPassword("oldpass");
  const user = createUser(db, { email: "alice@test.com", password_hash: hash });
  userId = user.id;
});

afterEach(() => db.close());

describe("handleChangePassword", () => {
  it("changes password when current is correct", async () => {
    const result = await handleChangePassword(db, userId, {
      currentPassword: "oldpass",
      newPassword: "newpass123",
    });

    expect(result.success).toBe(true);
    const user = getUserByEmail(db, "alice@test.com");
    expect(await verifyHashedPassword("newpass123", user!.password_hash)).toBe(
      true,
    );
  });

  it("rejects when current password is wrong", async () => {
    const result = await handleChangePassword(db, userId, {
      currentPassword: "wrong",
      newPassword: "newpass",
    });

    expect(result).toEqual({
      success: false,
      error: "Current password is incorrect",
    });
  });

  it("rejects when new password is empty", async () => {
    const result = await handleChangePassword(db, userId, {
      currentPassword: "oldpass",
      newPassword: "",
    });

    expect(result).toEqual({
      success: false,
      error: "New password is required",
    });
  });

  it("rejects when new password is too short", async () => {
    const result = await handleChangePassword(db, userId, {
      currentPassword: "oldpass",
      newPassword: "ab",
    });

    expect(result).toEqual({
      success: false,
      error: "New password must be at least 4 characters",
    });
  });

  it("rejects when user does not exist", async () => {
    const result = await handleChangePassword(db, 999, {
      currentPassword: "oldpass",
      newPassword: "newpass",
    });

    expect(result).toEqual({ success: false, error: "User not found" });
  });
});

// The route has no catch of its own, so a throw here reached the user as an
// empty 500 and the settings form could only say "Failed to change password".
describe("malformed request body", () => {
  it.each([
    ["a missing current password", { newPassword: "newpass" }],
    [
      "a non-string current password",
      { currentPassword: 1, newPassword: "np" },
    ],
    [
      "a non-string new password",
      { currentPassword: "old", newPassword: 1234 },
    ],
  ])("reports %s as a validation error", async (_label, body) => {
    const result = await handleChangePassword(
      db,
      userId,
      body as unknown as Parameters<typeof handleChangePassword>[2],
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
