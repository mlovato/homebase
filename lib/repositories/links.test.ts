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

  it("appends new links at the end of the category when sort_order is not provided", () => {
    createLink(db, userId, {
      category_id: categoryId,
      name: "First",
      url: "http://first",
      icon_type: "builtin",
      sort_order: 5,
    });
    createLink(db, userId, {
      category_id: categoryId,
      name: "Second",
      url: "http://second",
      icon_type: "builtin",
      sort_order: 12,
    });

    const appended = createLink(db, userId, {
      category_id: categoryId,
      name: "Third",
      url: "http://third",
      icon_type: "builtin",
    });

    expect(appended.sort_order).toBe(13);
  });

  it("scopes the next sort_order to the link's category", () => {
    const otherCategoryId = createCategory(db, userId, { name: "Tools" }).id;
    createLink(db, userId, {
      category_id: otherCategoryId,
      name: "Other",
      url: "http://other",
      icon_type: "builtin",
      sort_order: 99,
    });

    const created = createLink(db, userId, {
      category_id: categoryId,
      name: "First in Media",
      url: "http://media",
      icon_type: "builtin",
    });

    expect(created.sort_order).toBe(0);
  });

  it("computes the next sort_order for uncategorised links separately", () => {
    createLink(db, userId, {
      category_id: categoryId,
      name: "InCategory",
      url: "http://in",
      icon_type: "builtin",
      sort_order: 42,
    });
    createLink(db, userId, {
      category_id: null,
      name: "Orphan A",
      url: "http://orphan-a",
      icon_type: "builtin",
      sort_order: 3,
    });

    const orphanB = createLink(db, userId, {
      category_id: null,
      name: "Orphan B",
      url: "http://orphan-b",
      icon_type: "builtin",
    });

    expect(orphanB.sort_order).toBe(4);
  });

  it("respects an explicit sort_order when provided", () => {
    createLink(db, userId, {
      category_id: categoryId,
      name: "Anchor",
      url: "http://anchor",
      icon_type: "builtin",
      sort_order: 50,
    });

    const explicit = createLink(db, userId, {
      category_id: categoryId,
      name: "Explicit",
      url: "http://explicit",
      icon_type: "builtin",
      sort_order: 7,
    });

    expect(explicit.sort_order).toBe(7);
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

describe("url_alt", () => {
  const base = {
    category_id: null as number | null,
    name: "Plex",
    url: "http://plex.local",
    icon_type: "builtin" as const,
  };

  it("defaults to null when not provided", () => {
    const link = createLink(db, userId, base);
    expect(link.url_alt).toBeNull();
  });

  it("persists and retrieves url_alt", () => {
    const link = createLink(db, userId, {
      ...base,
      url_alt: "http://plex.remote",
    });
    expect(link.url_alt).toBe("http://plex.remote");
    expect(getLinkById(db, userId, link.id)?.url_alt).toBe(
      "http://plex.remote",
    );
  });

  it("getAllLinks includes url_alt", () => {
    createLink(db, userId, { ...base, url_alt: "http://plex.remote" });
    const [link] = getAllLinks(db, userId);
    expect(link.url_alt).toBe("http://plex.remote");
  });

  it("getLinksByCategoryId includes url_alt", () => {
    createLink(db, userId, {
      ...base,
      category_id: categoryId,
      url_alt: "http://plex.remote",
    });
    const [link] = getLinksByCategoryId(db, userId, categoryId);
    expect(link.url_alt).toBe("http://plex.remote");
  });

  it("updateLink can set url_alt", () => {
    const link = createLink(db, userId, base);
    const updated = updateLink(db, userId, link.id, {
      url_alt: "http://plex.remote",
    });
    expect(updated?.url_alt).toBe("http://plex.remote");
  });

  it("updateLink can clear url_alt to null", () => {
    const link = createLink(db, userId, {
      ...base,
      url_alt: "http://plex.remote",
    });
    const updated = updateLink(db, userId, link.id, { url_alt: null });
    expect(updated?.url_alt).toBeNull();
  });
});

describe("url_alt normalization", () => {
  it("stores an empty alternative URL as null on create", () => {
    const link = createLink(db, userId, {
      category_id: categoryId,
      name: "Plex",
      url: "http://plex.local",
      url_alt: "",
      icon_type: "builtin",
    });
    expect(link.url_alt).toBeNull();
  });

  it("stores a whitespace-only alternative URL as null on create", () => {
    const link = createLink(db, userId, {
      category_id: categoryId,
      name: "Plex",
      url: "http://plex.local",
      url_alt: "   ",
      icon_type: "builtin",
    });
    expect(link.url_alt).toBeNull();
  });

  it("clears the alternative URL when updated to empty", () => {
    const link = createLink(db, userId, {
      category_id: categoryId,
      name: "Plex",
      url: "http://plex.local",
      url_alt: "http://alt.local",
      icon_type: "builtin",
    });
    expect(
      updateLink(db, userId, link.id, { url_alt: "" })?.url_alt,
    ).toBeNull();
  });
});

describe("updateLink repositioning", () => {
  function make(name: string, category: number | null) {
    return createLink(db, userId, {
      category_id: category,
      name,
      url: `http://${name}.local`,
      icon_type: "builtin",
    });
  }

  it("appends to the end of the target category when no position is given", () => {
    const tools = createCategory(db, userId, { name: "Tools" }).id;
    make("a", categoryId);
    make("b", categoryId);
    const moved = make("x", tools);

    const result = updateLink(db, userId, moved.id, {
      category_id: categoryId,
    });

    expect(result?.sort_order).toBe(2);
    expect(
      getLinksByCategoryId(db, userId, categoryId).map((l) => l.name),
    ).toEqual(["a", "b", "x"]);
  });

  it("appends to the end of uncategorized when the category is cleared", () => {
    make("u1", null);
    make("u2", null);
    const moved = make("x", categoryId);

    expect(
      updateLink(db, userId, moved.id, { category_id: null })?.sort_order,
    ).toBe(2);
  });

  it("honours an explicit position, as a drag reorder sends", () => {
    const tools = createCategory(db, userId, { name: "Tools" }).id;
    make("a", categoryId);
    const moved = make("x", tools);

    expect(
      updateLink(db, userId, moved.id, {
        category_id: categoryId,
        sort_order: 0,
      })?.sort_order,
    ).toBe(0);
  });

  it("leaves the position alone when the category is unchanged", () => {
    make("a", categoryId);
    const second = make("b", categoryId);

    expect(
      updateLink(db, userId, second.id, { name: "renamed" })?.sort_order,
    ).toBe(1);
  });
});
