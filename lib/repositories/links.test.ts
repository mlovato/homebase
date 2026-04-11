/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { createUser } from "./users";
import { createCategory } from "./categories";
import {
  createLink,
  getLinksByCategoryId,
  getLinkById,
  getAllLinks,
  updateLink,
  deleteLink,
} from "./links";
import type Database from "better-sqlite3";

let db: Database.Database;
let userId: number;
let categoryId: number;

beforeEach(() => {
  db = createTestDb();
  userId = createUser(db, { email: "test@test.com", password_hash: "hash" }).id;
  categoryId = createCategory(db, userId, { name: "Media" }).id;
});

afterEach(() => {
  db.close();
});

describe("createLink", () => {
  it("creates a link with builtin icon", () => {
    const link = createLink(db, userId, {
      category_id: categoryId,
      name: "Plex",
      url: "http://localhost:32400",
      icon_type: "builtin",
      icon_value: "plex",
    });
    expect(link.id).toBeGreaterThan(0);
    expect(link.name).toBe("Plex");
    expect(link.icon_type).toBe("builtin");
    expect(link.icon_value).toBe("plex");
    expect(link.category_id).toBe(categoryId);
    expect(link.sort_order).toBe(0);
  });

  it("creates a link with no category (null)", () => {
    const link = createLink(db, userId, {
      category_id: null,
      name: "Google",
      url: "https://google.com",
      icon_type: "url",
      icon_value: "https://google.com/favicon.ico",
    });
    expect(link.category_id).toBeNull();
  });

  it("creates a link with an uploaded icon", () => {
    const link = createLink(db, userId, {
      name: "Custom App",
      url: "http://localhost:9000",
      icon_type: "upload",
      icon_value: "/uploads/custom.png",
    });
    expect(link.icon_type).toBe("upload");
    expect(link.icon_value).toBe("/uploads/custom.png");
  });
});

describe("getLinksByCategoryId", () => {
  it("returns links for the given category sorted by sort_order", () => {
    createLink(db, userId, {
      category_id: categoryId,
      name: "Z",
      url: "http://z",
      icon_type: "builtin",
      sort_order: 10,
    });
    createLink(db, userId, {
      category_id: categoryId,
      name: "A",
      url: "http://a",
      icon_type: "builtin",
      sort_order: 0,
    });

    const links = getLinksByCategoryId(db, userId, categoryId);
    expect(links.map((l) => l.name)).toEqual(["A", "Z"]);
  });

  it("returns empty array when category has no links", () => {
    expect(getLinksByCategoryId(db, userId, categoryId)).toEqual([]);
  });
});

describe("getAllLinks", () => {
  it("returns all links across all categories", () => {
    const cat2Id = createCategory(db, userId, { name: "Tools" }).id;
    createLink(db, userId, {
      category_id: categoryId,
      name: "Plex",
      url: "http://plex",
      icon_type: "builtin",
    });
    createLink(db, userId, {
      category_id: cat2Id,
      name: "Grafana",
      url: "http://grafana",
      icon_type: "builtin",
    });

    expect(getAllLinks(db, userId)).toHaveLength(2);
  });
});

describe("getLinkById", () => {
  it("returns the link when found", () => {
    const created = createLink(db, userId, {
      category_id: categoryId,
      name: "Plex",
      url: "http://plex",
      icon_type: "builtin",
    });
    expect(getLinkById(db, userId, created.id)).toEqual(created);
  });

  it("returns undefined when not found", () => {
    expect(getLinkById(db, userId, 999)).toBeUndefined();
  });
});

describe("updateLink", () => {
  it("updates name and url", () => {
    const link = createLink(db, userId, {
      category_id: categoryId,
      name: "Old",
      url: "http://old",
      icon_type: "builtin",
    });
    const updated = updateLink(db, userId, link.id, {
      name: "New",
      url: "http://new",
    });
    expect(updated?.name).toBe("New");
    expect(updated?.url).toBe("http://new");
  });

  it("updates icon_type and icon_value", () => {
    const link = createLink(db, userId, {
      name: "App",
      url: "http://app",
      icon_type: "builtin",
      icon_value: "plex",
    });
    const updated = updateLink(db, userId, link.id, {
      icon_type: "upload",
      icon_value: "/uploads/app.png",
    });
    expect(updated?.icon_type).toBe("upload");
    expect(updated?.icon_value).toBe("/uploads/app.png");
  });

  it("returns undefined when link does not exist", () => {
    expect(updateLink(db, userId, 999, { name: "Ghost" })).toBeUndefined();
  });
});

describe("deleteLink", () => {
  it("removes the link", () => {
    const link = createLink(db, userId, {
      category_id: categoryId,
      name: "Plex",
      url: "http://plex",
      icon_type: "builtin",
    });
    expect(deleteLink(db, userId, link.id)).toBe(true);
    expect(getLinkById(db, userId, link.id)).toBeUndefined();
  });

  it("returns false when link does not exist", () => {
    expect(deleteLink(db, userId, 999)).toBe(false);
  });
});

describe("user isolation", () => {
  it("user A cannot see user B links", () => {
    const userB = createUser(db, {
      email: "b@test.com",
      password_hash: "hash",
    }).id;
    createLink(db, userId, {
      name: "A link",
      url: "http://a",
      icon_type: "builtin",
    });
    createLink(db, userB, {
      name: "B link",
      url: "http://b",
      icon_type: "builtin",
    });

    expect(getAllLinks(db, userId)).toHaveLength(1);
    expect(getAllLinks(db, userId)[0].name).toBe("A link");
    expect(getAllLinks(db, userB)).toHaveLength(1);
    expect(getAllLinks(db, userB)[0].name).toBe("B link");
  });
});
