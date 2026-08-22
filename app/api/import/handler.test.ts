/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { createUser } from "@/lib/repositories/users";
import {
  createCategory,
  getCategories,
  getCategoriesWithLinks,
  getUncategorizedLinks,
} from "@/lib/repositories/categories";
import { createLink, getAllLinks } from "@/lib/repositories/links";
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

describe("handleImport normalization", () => {
  it("stores an empty alternative URL as null, not as an empty string", () => {
    handleImport(db, userId, {
      version: 1,
      categories: [],
      uncategorized: [
        {
          name: "Plex",
          url: "http://plex.local",
          url_alt: "",
          icon_type: "builtin",
          icon_value: null,
          sort_order: 0,
        },
      ],
    });

    expect(getUncategorizedLinks(db, userId)[0].url_alt).toBeNull();
  });

  it("trims category names so they match what the API would store", () => {
    handleImport(db, userId, {
      version: 1,
      categories: [{ name: "  Media  ", sort_order: 0, links: [] }],
      uncategorized: [],
    });

    expect(getCategories(db, userId)[0].name).toBe("Media");
  });

  it("rejects an import containing two categories with the same name", () => {
    const result = handleImport(db, userId, {
      version: 1,
      categories: [
        { name: "Media", sort_order: 0, links: [] },
        { name: " media ", sort_order: 1, links: [] },
      ],
      uncategorized: [],
    });

    expect(result).toMatchObject({
      error: "Duplicate category names in import",
      status: 400,
    });
    expect(getCategories(db, userId)).toHaveLength(0);
  });
});

describe("handleImport trims link fields", () => {
  // Validation trimmed but storage did not, so " http://x" failed checkHealth's
  // scheme test and the card's status dot stayed on "checking" forever.
  it("stores a trimmed name and url", () => {
    handleImport(db, userId, {
      version: 1,
      categories: [],
      uncategorized: [
        {
          name: "  Plex  ",
          url: " http://plex.local:32400 ",
          icon_type: "builtin",
          icon_value: null,
          sort_order: 0,
        },
      ],
    });

    const link = getUncategorizedLinks(db, userId)[0];
    expect(link.name).toBe("Plex");
    expect(link.url).toBe("http://plex.local:32400");
  });

  it("trims links nested in a category too", () => {
    handleImport(db, userId, {
      version: 1,
      categories: [
        {
          name: "Media",
          sort_order: 0,
          links: [
            {
              name: " Sonarr ",
              url: " http://sonarr.local ",
              icon_type: "builtin",
              icon_value: null,
              sort_order: 0,
            },
          ],
        },
      ],
      uncategorized: [],
    });

    const link = getCategoriesWithLinks(db, userId)[0].links[0];
    expect(link.name).toBe("Sonarr");
    expect(link.url).toBe("http://sonarr.local");
  });
});

describe("import rejects data the app could not use", () => {
  function withUncategorized(link: Record<string, unknown>) {
    return { version: 1, categories: [], uncategorized: [link] };
  }

  const validLink = {
    name: "Plex",
    url: "http://plex.local",
    icon_type: "builtin",
    icon_value: "plex",
    sort_order: 0,
  };

  it("rejects a link whose url the dashboard could not open", () => {
    const result = handleImport(
      db,
      userId,
      withUncategorized({ ...validLink, url: "javascript:alert(1)" }),
    );
    expect(result.status).toBe(400);
  });

  it("rejects a link whose alternative url is not http", () => {
    const result = handleImport(
      db,
      userId,
      withUncategorized({ ...validLink, url_alt: "javascript:alert(1)" }),
    );
    expect(result.status).toBe(400);
  });

  // Reported as a schema failure rather than crashing the write with a 500 that
  // reaches the user as a bare "Import failed".
  it("reports a non-numeric sort_order as an invalid format", () => {
    const result = handleImport(
      db,
      userId,
      withUncategorized({ ...validLink, sort_order: "zzz" }),
    );
    expect(result.status).toBe(400);
    expect(result.error).toBe("Invalid import format");
  });

  it("reports a non-numeric category sort_order as an invalid format", () => {
    const result = handleImport(db, userId, {
      version: 1,
      categories: [{ name: "Media", sort_order: {}, links: [] }],
      uncategorized: [],
    });
    expect(result.status).toBe(400);
  });

  it("leaves existing data untouched when the file is rejected", () => {
    createLink(db, userId, {
      name: "Keep",
      url: "http://keep.local",
      icon_type: "builtin",
    });

    handleImport(
      db,
      userId,
      withUncategorized({ ...validLink, sort_order: "zzz" }),
    );

    expect(getAllLinks(db, userId).map((l) => l.name)).toEqual(["Keep"]);
  });
});

describe("import reports uploaded icons it could not find", () => {
  const uploadLink = {
    name: "Plex",
    url: "http://plex.local",
    icon_type: "upload",
    icon_value: "/uploads/3f2504e0-4f89-11d3-9a0c-0305e82c3301.png",
    sort_order: 0,
  };

  function body(links: Record<string, unknown>[]) {
    return { version: 1, categories: [], uncategorized: links };
  }

  it("counts an uploaded icon whose file is absent", () => {
    const result = handleImport(db, userId, body([uploadLink]), () => false);

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ ok: true, missingIcons: 1 });
  });

  it("reports none when every file is present", () => {
    const result = handleImport(db, userId, body([uploadLink]), () => true);

    expect(result.data).toEqual({ ok: true, missingIcons: 0 });
  });

  it("counts icons inside categories as well as uncategorized ones", () => {
    const other = {
      ...uploadLink,
      name: "Sonarr",
      icon_value: "/uploads/3f2504e0-4f89-11d3-9a0c-0305e82c3302.png",
    };

    const result = handleImport(
      db,
      userId,
      {
        version: 1,
        categories: [{ name: "Media", sort_order: 0, links: [uploadLink] }],
        uncategorized: [other],
      },
      () => false,
    );

    expect(result.data).toEqual({ ok: true, missingIcons: 2 });
  });

  // Two links can share one uploaded file, and it is one icon to re-upload.
  it("counts a file shared by several links once", () => {
    const result = handleImport(
      db,
      userId,
      body([uploadLink, { ...uploadLink, name: "Second" }]),
      () => false,
    );

    expect(result.data).toEqual({ ok: true, missingIcons: 1 });
  });

  it("ignores builtin and remote icons, which need no local file", () => {
    const result = handleImport(
      db,
      userId,
      body([
        { ...uploadLink, icon_type: "builtin", icon_value: "plex" },
        { ...uploadLink, icon_type: "url", icon_value: "https://x/i.png" },
      ]),
      () => false,
    );

    expect(result.data).toEqual({ ok: true, missingIcons: 0 });
  });
});
