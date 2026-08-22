/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { createTestDb } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { getDb } from "@/lib/db";
import { createUser } from "@/lib/repositories/users";
import { createLink, getLinkById } from "@/lib/repositories/links";
import { PUT, DELETE } from "./route";
import type Database from "better-sqlite3";

jest.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/db", () => {
  const actual = jest.requireActual("@/lib/db");
  return { ...actual, getDb: jest.fn() };
});

const mockAuth = getAuthenticatedUser as jest.MockedFunction<
  typeof getAuthenticatedUser
>;
const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

let db: Database.Database;
let linkId: number;

beforeEach(() => {
  db = createTestDb();
  const userId = createUser(db, {
    email: "t@t.com",
    password_hash: "hash",
  }).id;
  linkId = createLink(db, userId, {
    name: "Plex",
    url: "http://plex.local",
    icon_type: "builtin",
  }).id;
  mockGetDb.mockReturnValue(db);
  mockAuth.mockResolvedValue({ userId, role: "admin" });
});

afterEach(() => {
  db.close();
  jest.clearAllMocks();
});

function put(id: string, body: unknown) {
  return PUT(
    new NextRequest(`http://localhost/api/links/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("PUT /api/links/[id] id parsing", () => {
  it("updates the link named by a plain integer id", async () => {
    const res = await put(String(linkId), { name: "Renamed" });

    expect(res.status).toBe(200);
    expect(getLinkById(db, 1, linkId)?.name).toBe("Renamed");
  });

  // parseInt read the leading digits and ignored the rest, so a mangled URL
  // edited whichever link happened to start with that number.
  it("rejects an id with trailing junk instead of editing link 1", async () => {
    const res = await put(`${linkId}abc`, { name: "Hijacked" });

    expect(res.status).toBe(400);
    expect(getLinkById(db, 1, linkId)?.name).toBe("Plex");
  });

  it("rejects an id with trailing junk on delete", async () => {
    const res = await DELETE(
      new NextRequest(`http://localhost/api/links/${linkId}x`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: `${linkId}x` }) },
    );

    expect(res.status).toBe(400);
    expect(getLinkById(db, 1, linkId)).toBeDefined();
  });
});
