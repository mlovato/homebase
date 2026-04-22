/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { createUser } from "@/lib/repositories/users";
import {
  createCategory,
  getCategoriesWithLinks,
  getUncategorizedLinks,
} from "@/lib/repositories/categories";
import { createLink } from "@/lib/repositories/links";
import { handleImport } from "./handler";
import type Database from "better-sqlite3";

const validPayload = {
  version: 1 as const,
  exported_at: "2024-01-01T00:00:00.000Z",
  categories: [
    {
      name: "Media",
      sort_order: 0,
      links: [
        {
          name: "Plex",
          url: "http://plex",
          icon_type: "builtin" as const,
          icon_value: "plex",
          sort_order: 0,
        },
      ],
    },
  ],
  uncategorized: [
    {
      name: "Misc",
      url: "http://misc",
      icon_type: "builtin" as const,
      icon_value: null,
      sort_order: 0,
    },
  ],
};

let db: Database.Database;
let userId: number;

beforeEach(() => {
  db = createTestDb();
  userId = createUser(db, { email: "test@test.com", password_hash: "hash" }).id;
});

afterEach(() => db.close());

describe("import handler", () => {
  it("returns 400 for missing version", () => {
    const result = handleImport(db, userId, {
      categories: [],
      uncategorized: [],
    });
    expect(result.status).toBe(400);
  });

  it("returns 400 for missing categories array", () => {
    const result = handleImport(db, userId, { version: 1, uncategorized: [] });
    expect(result.status).toBe(400);
  });

  it("returns 400 for link missing name", () => {
    const result = handleImport(db, userId, {
      version: 1,
      categories: [],
      uncategorized: [{ url: "http://x", icon_type: "builtin" }],
    });
    expect(result.status).toBe(400);
  });

  it("returns 400 for link with invalid icon_type", () => {
    const result = handleImport(db, userId, {
      version: 1,
      categories: [],
      uncategorized: [{ name: "X", url: "http://x", icon_type: "bad" }],
    });
    expect(result.status).toBe(400);
  });

  it("imports categories and links", () => {
    const result = handleImport(db, userId, validPayload);
    expect(result.status).toBe(200);
    const categories = getCategoriesWithLinks(db, userId);
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe("Media");
    expect(categories[0].links).toHaveLength(1);
    expect(categories[0].links[0].name).toBe("Plex");
  });

  it("imports uncategorized links with null category_id", () => {
    handleImport(db, userId, validPayload);
    const uncategorized = getUncategorizedLinks(db, userId);
    expect(uncategorized).toHaveLength(1);
    expect(uncategorized[0].name).toBe("Misc");
    expect(uncategorized[0].category_id).toBeNull();
  });

  it("replaces all existing data for this user", () => {
    const cat = createCategory(db, userId, { name: "Old", sort_order: 0 });
    createLink(db, userId, {
      category_id: cat.id,
      name: "OldLink",
      url: "http://old",
      icon_type: "builtin",
      icon_value: null,
      sort_order: 0,
    });

    handleImport(db, userId, validPayload);

    const categories = getCategoriesWithLinks(db, userId);
    expect(categories).toHaveLength(1);
    expect(categories.find((c) => c.name === "Old")).toBeUndefined();
  });

  it("handles import with no categories or links", () => {
    const result = handleImport(db, userId, {
      version: 1,
      exported_at: "",
      categories: [],
      uncategorized: [],
    });
    expect(result.status).toBe(200);
    expect(getCategoriesWithLinks(db, userId)).toHaveLength(0);
    expect(getUncategorizedLinks(db, userId)).toHaveLength(0);
  });

  it("imports url_alt when present in payload", () => {
    const payload = {
      version: 1 as const,
      exported_at: "2024-01-01T00:00:00.000Z",
      categories: [],
      uncategorized: [
        {
          name: "Plex",
          url: "http://plex.local",
          url_alt: "http://plex.remote",
          icon_type: "builtin" as const,
          icon_value: null,
          sort_order: 0,
        },
      ],
    };

    handleImport(db, userId, payload);

    const links = getUncategorizedLinks(db, userId);
    expect(links[0].url_alt).toBe("http://plex.remote");
  });

  it("sets url_alt to null when missing from payload", () => {
    handleImport(db, userId, validPayload);
    const cats = getCategoriesWithLinks(db, userId);
    expect(cats[0].links[0].url_alt).toBeNull();
  });
});
