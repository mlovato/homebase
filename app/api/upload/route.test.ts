/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { rm } from "fs/promises";
import path from "path";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { UPLOADS_DIR } from "@/lib/uploads";
import { POST } from "./route";

jest.mock("@/lib/apiAuth", () => ({ getAuthenticatedUser: jest.fn() }));

const mockAuth = getAuthenticatedUser as jest.MockedFunction<
  typeof getAuthenticatedUser
>;

const written: string[] = [];

beforeEach(() => mockAuth.mockResolvedValue({ userId: 1, role: "user" }));

afterEach(async () => {
  mockAuth.mockReset();
  await Promise.all(
    written
      .splice(0)
      .map((f) => rm(path.join(UPLOADS_DIR, f), { force: true })),
  );
});

function upload(filename: string, type: string) {
  const form = new FormData();
  form.set("file", new File([new Uint8Array([1, 2, 3])], filename, { type }));
  return new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/upload", () => {
  it("rejects an SVG, which would run script from the app's own origin", async () => {
    const res = await POST(upload("evil.svg", "image/svg+xml"));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/unsupported file type/i);
  });

  it("accepts a PNG", async () => {
    const res = await POST(upload("icon.png", "image/png"));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.path).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    written.push(body.path.replace("/uploads/", ""));
  });

  it("refuses an unauthenticated upload", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(upload("icon.png", "image/png"));
    expect(res.status).toBe(401);
  });
});
