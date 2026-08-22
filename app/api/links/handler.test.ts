/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { createUser } from "@/lib/repositories/users";
import { createCategory } from "@/lib/repositories/categories";
import { createLink, getLinkById } from "@/lib/repositories/links";
import {
  handleGetLinks,
  handleCreateLink,
  handleUpdateLink,
  handleDeleteLink,
} from "./handler";
import type Database from "better-sqlite3";
import type { IconType } from "@/lib/types";

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

function makeLink() {
  return createLink(db, userId, {
    category_id: null,
    name: "Plex",
    url: "http://plex.local",
    icon_type: "builtin",
  });
}

describe("handleGetLinks", () => {
  it("returns empty array when no links", () => {
    expect(handleGetLinks(db, userId)).toEqual([]);
  });

  it("returns all links", () => {
    createLink(db, userId, {
      category_id: categoryId,
      name: "Plex",
      url: "http://plex",
      icon_type: "builtin",
    });
    expect(handleGetLinks(db, userId)).toHaveLength(1);
  });
});

describe("handleCreateLink", () => {
  const validBody = {
    name: "Plex",
    url: "http://localhost:32400",
    icon_type: "builtin" as const,
    icon_value: "plex",
  };

  it("creates a link", () => {
    const result = handleCreateLink(db, userId, {
      ...validBody,
      category_id: categoryId,
    });
    expect(result.status).toBe(201);
    expect(result.data).toMatchObject({ name: "Plex" });
  });

  it("returns 400 when name is missing", () => {
    const result = handleCreateLink(db, userId, { ...validBody, name: "" });
    expect(result.status).toBe(400);
  });

  it("returns 400 when url is missing", () => {
    const result = handleCreateLink(db, userId, { ...validBody, url: "" });
    expect(result.status).toBe(400);
  });

  it("returns 400 when icon_type is invalid", () => {
    const result = handleCreateLink(db, userId, {
      ...validBody,
      icon_type: "invalid" as unknown as IconType,
    });
    expect(result.status).toBe(400);
  });
});

describe("handleUpdateLink", () => {
  it("updates a link", () => {
    const link = createLink(db, userId, {
      category_id: categoryId,
      name: "Old",
      url: "http://old",
      icon_type: "builtin",
    });
    const result = handleUpdateLink(db, userId, link.id, { name: "New" });
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({ name: "New" });
  });

  it("returns 400 when id is NaN", () => {
    const result = handleUpdateLink(db, userId, NaN, { name: "Ghost" });
    expect(result.status).toBe(400);
  });

  it("returns 400 when icon_type is invalid", () => {
    const link = createLink(db, userId, {
      name: "App",
      url: "http://app",
      icon_type: "builtin",
    });
    const result = handleUpdateLink(db, userId, link.id, {
      icon_type: "invalid" as unknown as IconType,
    });
    expect(result.status).toBe(400);
  });

  it("returns 404 when link not found", () => {
    const result = handleUpdateLink(db, userId, 999, { name: "Ghost" });
    expect(result.status).toBe(404);
  });
});

describe("handleDeleteLink", () => {
  it("deletes a link", () => {
    const link = createLink(db, userId, {
      category_id: categoryId,
      name: "Plex",
      url: "http://plex",
      icon_type: "builtin",
    });
    const result = handleDeleteLink(db, userId, link.id);
    expect(result.status).toBe(200);
  });

  it("returns 400 when id is NaN", () => {
    const result = handleDeleteLink(db, userId, NaN);
    expect(result.status).toBe(400);
  });

  it("returns 404 when link not found", () => {
    const result = handleDeleteLink(db, userId, 999);
    expect(result.status).toBe(404);
  });
});

describe("url_alt", () => {
  const validBody = {
    name: "Plex",
    url: "http://plex.local",
    icon_type: "builtin" as const,
  };

  it("handleCreateLink includes url_alt in response when provided", () => {
    const result = handleCreateLink(db, userId, {
      ...validBody,
      url_alt: "http://plex.remote",
    });
    expect(result.status).toBe(201);
    expect((result as { data: { url_alt: string } }).data.url_alt).toBe(
      "http://plex.remote",
    );
  });

  it("handleCreateLink sets url_alt to null when not provided", () => {
    const result = handleCreateLink(db, userId, validBody);
    expect(result.status).toBe(201);
    expect((result as { data: { url_alt: null } }).data.url_alt).toBeNull();
  });

  it("handleUpdateLink can set url_alt", () => {
    const link = createLink(db, userId, { ...validBody, icon_type: "builtin" });
    const result = handleUpdateLink(db, userId, link.id, {
      url_alt: "http://plex.remote",
    });
    expect(result.status).toBe(200);
    expect((result as { data: { url_alt: string } }).data.url_alt).toBe(
      "http://plex.remote",
    );
  });

  it("handleUpdateLink can clear url_alt to null", () => {
    const link = createLink(db, userId, {
      ...validBody,
      icon_type: "builtin",
      url_alt: "http://plex.remote",
    });
    const result = handleUpdateLink(db, userId, link.id, { url_alt: null });
    expect((result as { data: { url_alt: null } }).data.url_alt).toBeNull();
  });

  it("handleGetLinks includes url_alt in each link", () => {
    createLink(db, userId, {
      ...validBody,
      icon_type: "builtin",
      url_alt: "http://plex.remote",
    });
    const links = handleGetLinks(db, userId) as { url_alt: string }[];
    expect(links[0].url_alt).toBe("http://plex.remote");
  });
});

describe("category ownership", () => {
  it("refuses to create a link in another user's category", () => {
    const other = createUser(db, {
      email: "other@test.com",
      password_hash: "h",
    }).id;
    const theirs = createCategory(db, other, { name: "Theirs" }).id;

    const result = handleCreateLink(db, userId, {
      category_id: theirs,
      name: "Plex",
      url: "http://plex.local",
      icon_type: "builtin",
    });

    expect(result).toMatchObject({ error: "Category not found", status: 404 });
  });

  it("refuses to move a link into another user's category", () => {
    const other = createUser(db, {
      email: "other2@test.com",
      password_hash: "h",
    }).id;
    const theirs = createCategory(db, other, { name: "Theirs" }).id;
    const link = createLink(db, userId, {
      category_id: null,
      name: "Plex",
      url: "http://plex.local",
      icon_type: "builtin",
    });

    const result = handleUpdateLink(db, userId, link.id, {
      category_id: theirs,
    });

    expect(result).toMatchObject({ error: "Category not found", status: 404 });
    expect(getLinkById(db, userId, link.id)?.category_id).toBeNull();
  });

  it("refuses a category id that does not exist instead of failing the foreign key", () => {
    const link = createLink(db, userId, {
      category_id: null,
      name: "Plex",
      url: "http://plex.local",
      icon_type: "builtin",
    });

    expect(
      handleUpdateLink(db, userId, link.id, { category_id: 99999 }),
    ).toMatchObject({ error: "Category not found", status: 404 });
  });

  it("still allows clearing the category", () => {
    const link = createLink(db, userId, {
      category_id: categoryId,
      name: "Plex",
      url: "http://plex.local",
      icon_type: "builtin",
    });

    expect(
      handleUpdateLink(db, userId, link.id, { category_id: null }).status,
    ).toBe(200);
  });
});

describe("icon_type validation on update", () => {
  // These are falsy, so they used to skip the guard and hit the schema's CHECK /
  // NOT NULL constraint as an opaque 500.
  it.each([
    ["an empty string", ""],
    ["null", null],
  ])(
    "rejects %s with a 400 rather than a constraint error",
    (_label, value) => {
      const link = makeLink();
      const result = handleUpdateLink(db, userId, link.id, {
        icon_type: value as never,
      });
      expect(result).toMatchObject({ status: 400 });
      expect(result.error).toMatch(/icon_type/);
    },
  );

  it("still accepts a valid icon_type", () => {
    const link = makeLink();
    expect(
      handleUpdateLink(db, userId, link.id, { icon_type: "url" }).status,
    ).toBe(200);
  });

  it("still allows an update that omits icon_type", () => {
    const link = makeLink();
    expect(handleUpdateLink(db, userId, link.id, { name: "New" }).status).toBe(
      200,
    );
  });
});

describe("handleUpdateLink required fields", () => {
  // handleCreateLink rejects both, so accepting them on update leaves a link
  // with no visible label, or an href of "" that navigates to the dashboard.
  it.each([
    ["name", "", /name/i],
    ["name", "   ", /name/i],
    ["url", "", /url/i],
    ["url", "   ", /url/i],
  ])("rejects a blank %s with a 400", (field, value, matcher) => {
    const link = makeLink();
    const result = handleUpdateLink(db, userId, link.id, { [field]: value });
    expect(result).toMatchObject({ status: 400 });
    expect(result.error).toMatch(matcher);
    expect(getLinkById(db, userId, link.id)).toMatchObject({
      name: "Plex",
      url: "http://plex.local",
    });
  });

  it("trims a name and url it does accept", () => {
    const link = makeLink();
    const result = handleUpdateLink(db, userId, link.id, {
      name: "  Jellyfin  ",
      url: "  http://jellyfin.local  ",
    });
    expect(result.data).toMatchObject({
      name: "Jellyfin",
      url: "http://jellyfin.local",
    });
  });
});

describe("link inputs the dashboard could not use", () => {
  const validBody = {
    name: "Plex",
    url: "http://localhost:32400",
    icon_type: "builtin" as const,
  };

  it.each([
    "javascript:alert(document.domain)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://files.local",
  ])("refuses to create a link pointing at %s", (url) => {
    const result = handleCreateLink(db, userId, { ...validBody, url });

    expect(result.status).toBe(400);
    expect(result.error).toMatch(/http/i);
  });

  // `body.name?.trim()` only guarded null and undefined, so a numeric name threw
  // and the admin panel could only report "Request failed (500)".
  it.each([
    ["name", { name: 42 }],
    ["url", { url: 42 }],
  ])("refuses a non-string %s without throwing", (_field, override) => {
    const result = handleCreateLink(db, userId, {
      ...validBody,
      ...override,
    } as unknown as Parameters<typeof handleCreateLink>[2]);

    expect(result.status).toBe(400);
  });

  it("refuses a non-string name on update", () => {
    const link = createLink(db, userId, { ...validBody, name: "P" });

    const result = handleUpdateLink(db, userId, link.id, {
      name: 42,
    } as unknown as Parameters<typeof handleUpdateLink>[3]);

    expect(result.status).toBe(400);
    expect(getLinkById(db, userId, link.id)?.name).toBe("P");
  });

  it("refuses the same scheme in the alternative url", () => {
    const result = handleCreateLink(db, userId, {
      ...validBody,
      url_alt: "javascript:alert(1)",
    });
    expect(result.status).toBe(400);
  });

  it("still accepts a blank alternative url, which means none", () => {
    const result = handleCreateLink(db, userId, { ...validBody, url_alt: "" });
    expect(result.status).toBe(201);
  });

  it("refuses to update a link to a non-http url", () => {
    const link = createLink(db, userId, { ...validBody, name: "P" });

    const result = handleUpdateLink(db, userId, link.id, {
      url: "javascript:alert(1)",
    });

    expect(result.status).toBe(400);
    expect(getLinkById(db, userId, link.id)?.url).toBe(validBody.url);
  });

  // Text in an INTEGER column sorts after every number, so the row would sit at
  // the end of its list for good and hand its position to the next link created.
  it.each(["zzz", "3", 1.5, null])(
    "refuses the unusable sort_order %p on create",
    (sort_order) => {
      const result = handleCreateLink(db, userId, {
        ...validBody,
        sort_order: sort_order as unknown as number,
      });
      expect(result.status).toBe(400);
    },
  );

  it("refuses an unusable sort_order on update", () => {
    const link = createLink(db, userId, { ...validBody, name: "P" });

    const result = handleUpdateLink(db, userId, link.id, {
      sort_order: "zzz" as unknown as number,
    });

    expect(result.status).toBe(400);
    expect(getLinkById(db, userId, link.id)?.sort_order).toBe(0);
  });
});

// A JSON body can type any field as anything, and better-sqlite3 refuses to bind
// a value that is not a number, string, bigint, buffer or null — which reached
// the caller as an empty 500 rather than the documented validation error.
describe("field types the database cannot store", () => {
  it("refuses a non-string icon_value on create", () => {
    const result = handleCreateLink(db, userId, {
      name: "Grafana",
      url: "http://grafana.local",
      icon_type: "url",
      icon_value: { evil: true } as unknown as string,
    });

    expect(result.status).toBe(400);
  });

  it("refuses a non-numeric category_id on create", () => {
    const result = handleCreateLink(db, userId, {
      name: "Grafana",
      url: "http://grafana.local",
      icon_type: "builtin",
      category_id: true as unknown as number,
    });

    expect(result.status).toBe(400);
  });

  it("refuses a non-string icon_value on update", () => {
    const link = makeLink();

    const result = handleUpdateLink(db, userId, link.id, {
      icon_value: [] as unknown as string,
    });

    expect(result.status).toBe(400);
  });

  it("refuses a non-numeric category_id on update", () => {
    const link = makeLink();

    const result = handleUpdateLink(db, userId, link.id, {
      category_id: "1a" as unknown as number,
    });

    expect(result.status).toBe(400);
  });
});
