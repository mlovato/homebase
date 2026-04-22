/**
 * @jest-environment node
 */
import { createTestDb } from "@/lib/db";
import { createUser } from "@/lib/repositories/users";
import { createLink } from "@/lib/repositories/links";
import { handleGetServices } from "./handler";
import type Database from "better-sqlite3";

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

describe("handleGetServices", () => {
  it("returns empty array when no admin user exists", () => {
    createUser(db, { email: "user@test.com", password_hash: "hash" });
    expect(handleGetServices(db)).toEqual([]);
  });

  it("returns empty array when admin has no links", () => {
    createUser(db, {
      email: "admin@test.com",
      password_hash: "hash",
      role: "admin",
    });
    expect(handleGetServices(db)).toEqual([]);
  });

  it("returns services with name, url, and url_alt", () => {
    const admin = createUser(db, {
      email: "admin@test.com",
      password_hash: "hash",
      role: "admin",
    });
    createLink(db, admin.id, {
      name: "Plex",
      url: "http://plex.local",
      url_alt: "http://plex.remote",
      icon_type: "builtin",
    });
    const result = handleGetServices(db);
    expect(result).toEqual([
      { name: "Plex", url: "http://plex.local", url_alt: "http://plex.remote" },
    ]);
  });

  it("sets url_alt to null when link has no alt URL", () => {
    const admin = createUser(db, {
      email: "admin@test.com",
      password_hash: "hash",
      role: "admin",
    });
    createLink(db, admin.id, {
      name: "Grafana",
      url: "http://grafana.local",
      icon_type: "builtin",
    });
    const result = handleGetServices(db);
    expect(result).toEqual([
      { name: "Grafana", url: "http://grafana.local", url_alt: null },
    ]);
  });

  it("does not expose links of non-admin users", () => {
    const user = createUser(db, {
      email: "user@test.com",
      password_hash: "hash",
    });
    const admin = createUser(db, {
      email: "admin@test.com",
      password_hash: "hash",
      role: "admin",
    });
    createLink(db, admin.id, {
      name: "Admin Link",
      url: "http://admin.local",
      icon_type: "builtin",
    });
    createLink(db, user.id, {
      name: "User Link",
      url: "http://user.local",
      icon_type: "builtin",
    });
    const result = handleGetServices(db);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Admin Link");
  });

  it("returns services in sort_order then id order", () => {
    const admin = createUser(db, {
      email: "admin@test.com",
      password_hash: "hash",
      role: "admin",
    });
    createLink(db, admin.id, {
      name: "B",
      url: "http://b.local",
      icon_type: "builtin",
      sort_order: 2,
    });
    createLink(db, admin.id, {
      name: "A",
      url: "http://a.local",
      icon_type: "builtin",
      sort_order: 1,
    });
    const result = handleGetServices(db);
    expect(result[0].name).toBe("A");
    expect(result[1].name).toBe("B");
  });
});
