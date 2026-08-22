/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { createUser } from "./users";
import {
  getSetting,
  setSetting,
  getHealthCheckInterval,
  getSearchShortcut,
} from "./settings";
import { DEFAULT_SEARCH_SHORTCUT } from "@/lib/types";
import type Database from "better-sqlite3";

let db: Database.Database;
let userId: number;

beforeEach(() => {
  db = createTestDb();
  userId = createUser(db, { email: "t@test.com", password_hash: "h" }).id;
});

afterEach(() => db.close());

describe("setSetting / getSetting", () => {
  it("upserts a value per user and key", () => {
    setSetting(db, userId, "search_shortcut", "mod+j");
    setSetting(db, userId, "search_shortcut", "mod+p");
    expect(getSetting(db, userId, "search_shortcut")).toBe("mod+p");
  });

  it("keeps each user's settings separate", () => {
    const other = createUser(db, {
      email: "o@test.com",
      password_hash: "h",
    }).id;
    setSetting(db, userId, "search_shortcut", "mod+j");
    expect(getSetting(db, other, "search_shortcut")).toBeUndefined();
  });
});

describe("getSearchShortcut", () => {
  it("returns the default when unset", () => {
    expect(getSearchShortcut(db, userId)).toBe(DEFAULT_SEARCH_SHORTCUT);
  });

  it("returns a valid stored shortcut", () => {
    setSetting(db, userId, "search_shortcut", "mod+j");
    expect(getSearchShortcut(db, userId)).toBe("mod+j");
  });

  // A value the current validator rejects would otherwise reach the dashboard,
  // where no keypress can match it, while Settings displays the default.
  it.each([
    ["a legacy multi-character value", "mod+space"],
    ["an empty string", ""],
    ["a bare modifier", "mod+"],
    ["a word", "ctrl+k"],
  ])("falls back to the default for %s", (_label, stored) => {
    setSetting(db, userId, "search_shortcut", stored);
    expect(getSearchShortcut(db, userId)).toBe(DEFAULT_SEARCH_SHORTCUT);
  });
});

describe("getHealthCheckInterval", () => {
  it("returns a valid stored interval", () => {
    setSetting(db, userId, "health_check_interval", "10s");
    expect(getHealthCheckInterval(db, userId)).toBe("10s");
  });

  it("falls back to the default for an illegal stored value", () => {
    setSetting(db, userId, "health_check_interval", "5m");
    expect(getHealthCheckInterval(db, userId)).toBe("30s");
  });
});
