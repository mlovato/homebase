/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { createUser } from "@/lib/repositories/users";
import { createCategory } from "@/lib/repositories/categories";
import { createLink } from "@/lib/repositories/links";
import { handleExport } from "./handler";
import type Database from "better-sqlite3";

let db: Database.Database;
let userId: number;

beforeEach(() => {
  db = createTestDb();
  userId = createUser(db, { email: "test@test.com", password_hash: "hash" }).id;
});

afterEach(() => db.close());

describe("export handler", () => {
  it("returns version 1 with empty arrays when no data", () => {
    const result = handleExport(db, userId);
    expect(result.version).toBe(1);
    expect(result.categories).toEqual([]);
    expect(result.uncategorized).toEqual([]);
    expect(typeof result.exported_at).toBe("string");
  });

  it("includes categories with their links, without DB ids", () => {
    const cat = createCategory(db, userId, { name: "Media", sort_order: 0 });
    createLink(db, userId, {
      category_id: cat.id,
      name: "Plex",
      url: "http://plex",
      icon_type: "builtin",
      icon_value: "plex",
      sort_order: 0,
    });

    const result = handleExport(db, userId);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]).toMatchObject({
      name: "Media",
      sort_order: 0,
    });
    expect(result.categories[0]).not.toHaveProperty("id");
    expect(result.categories[0].links).toHaveLength(1);
    expect(result.categories[0].links[0]).toMatchObject({
      name: "Plex",
      url: "http://plex",
      icon_type: "builtin",
      icon_value: "plex",
    });
    expect(result.categories[0].links[0]).not.toHaveProperty("id");
    expect(result.categories[0].links[0]).not.toHaveProperty("category_id");
  });

  it("includes uncategorized links without DB ids", () => {
    createLink(db, userId, {
      category_id: null,
      name: "Misc",
      url: "http://misc",
      icon_type: "url",
      icon_value: "http://icon",
      sort_order: 1,
    });

    const result = handleExport(db, userId);
    expect(result.uncategorized).toHaveLength(1);
    expect(result.uncategorized[0]).toMatchObject({
      name: "Misc",
      url: "http://misc",
      sort_order: 1,
    });
    expect(result.uncategorized[0]).not.toHaveProperty("id");
    expect(result.uncategorized[0]).not.toHaveProperty("category_id");
  });

  it("exported_at is a valid ISO timestamp", () => {
    const result = handleExport(db, userId);
    expect(() => new Date(result.exported_at).toISOString()).not.toThrow();
  });
});
