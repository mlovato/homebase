/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { createUser } from "./users";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "./categories";
import type Database from "better-sqlite3";

let db: Database.Database;
let userId: number;

beforeEach(() => {
  db = createTestDb();
  userId = createUser(db, { email: "test@test.com", password_hash: "hash" }).id;
});

afterEach(() => {
  db.close();
});

describe("createCategory", () => {
  it("creates a category and returns it with an id", () => {
    const cat = createCategory(db, userId, { name: "Media" });
    expect(cat.id).toBeGreaterThan(0);
    expect(cat.name).toBe("Media");
    expect(cat.sort_order).toBe(0);
  });

  it("respects a custom sort_order", () => {
    const cat = createCategory(db, userId, { name: "Tools", sort_order: 5 });
    expect(cat.sort_order).toBe(5);
  });
});

describe("getCategories", () => {
  it("returns empty array when no categories exist", () => {
    expect(getCategories(db, userId)).toEqual([]);
  });

  it("returns all categories sorted by sort_order", () => {
    createCategory(db, userId, { name: "Z Last", sort_order: 10 });
    createCategory(db, userId, { name: "A First", sort_order: 0 });
    createCategory(db, userId, { name: "M Middle", sort_order: 5 });

    const cats = getCategories(db, userId);
    expect(cats.map((c) => c.name)).toEqual(["A First", "M Middle", "Z Last"]);
  });
});

describe("getCategoryById", () => {
  it("returns the category when found", () => {
    const created = createCategory(db, userId, { name: "Test" });
    const found = getCategoryById(db, userId, created.id);
    expect(found).toEqual(created);
  });

  it("returns undefined when not found", () => {
    expect(getCategoryById(db, userId, 999)).toBeUndefined();
  });
});

describe("updateCategory", () => {
  it("updates the name", () => {
    const cat = createCategory(db, userId, { name: "Old Name" });
    const updated = updateCategory(db, userId, cat.id, { name: "New Name" });
    expect(updated?.name).toBe("New Name");
  });

  it("updates sort_order", () => {
    const cat = createCategory(db, userId, { name: "Media", sort_order: 0 });
    const updated = updateCategory(db, userId, cat.id, { sort_order: 3 });
    expect(updated?.sort_order).toBe(3);
  });

  it("returns undefined when category does not exist", () => {
    expect(updateCategory(db, userId, 999, { name: "Ghost" })).toBeUndefined();
  });
});

describe("deleteCategory", () => {
  it("removes the category", () => {
    const cat = createCategory(db, userId, { name: "To Delete" });
    const deleted = deleteCategory(db, userId, cat.id);
    expect(deleted).toBe(true);
    expect(getCategoryById(db, userId, cat.id)).toBeUndefined();
  });

  it("returns false when category does not exist", () => {
    expect(deleteCategory(db, userId, 999)).toBe(false);
  });
});

describe("user isolation", () => {
  it("user A cannot see user B categories", () => {
    const userB = createUser(db, {
      email: "b@test.com",
      password_hash: "hash",
    }).id;
    createCategory(db, userId, { name: "A cat" });
    createCategory(db, userB, { name: "B cat" });

    expect(getCategories(db, userId)).toHaveLength(1);
    expect(getCategories(db, userId)[0].name).toBe("A cat");
    expect(getCategories(db, userB)).toHaveLength(1);
    expect(getCategories(db, userB)[0].name).toBe("B cat");
  });
});
