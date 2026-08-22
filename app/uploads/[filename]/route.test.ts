/**
 * @jest-environment node
 */
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { UPLOADS_DIR } from "@/lib/uploads";
import { GET } from "./route";

const NAME = "3f2504e0-4f89-11d3-9a0c-0305e82c3301.png";
const BYTES = new Uint8Array([137, 80, 78, 71]);

function context(filename: string) {
  return { params: Promise.resolve({ filename }) };
}

beforeAll(async () => {
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, NAME), BYTES);
});

afterAll(async () => {
  await rm(path.join(UPLOADS_DIR, NAME), { force: true });
});

describe("GET /uploads/[filename]", () => {
  it("serves an icon written after server start", async () => {
    const res = await GET(new Request("http://localhost"), context(NAME));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
  });

  it("marks the response non-sniffable and script-free", async () => {
    const res = await GET(new Request("http://localhost"), context(NAME));

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Content-Security-Policy")).toContain(
      "default-src 'none'",
    );
  });

  it("404s a name that is not a stored upload", async () => {
    const res = await GET(
      new Request("http://localhost"),
      context("not-a-uuid.png"),
    );
    expect(res.status).toBe(404);
  });

  it("refuses to serve svg even if one is on disk", async () => {
    const svg = "3f2504e0-4f89-11d3-9a0c-0305e82c3302.svg";
    await writeFile(path.join(UPLOADS_DIR, svg), "<svg/>");
    try {
      const res = await GET(new Request("http://localhost"), context(svg));
      expect(res.status).toBe(404);
    } finally {
      await rm(path.join(UPLOADS_DIR, svg), { force: true });
    }
  });

  it("rejects a traversal attempt in the filename", async () => {
    const res = await GET(
      new Request("http://localhost"),
      context("../../../etc/passwd"),
    );
    expect(res.status).toBe(404);
  });

  it("404s a well-formed name with no file behind it", async () => {
    const res = await GET(
      new Request("http://localhost"),
      context("3f2504e0-4f89-11d3-9a0c-0305e82c3399.png"),
    );
    expect(res.status).toBe(404);
  });
});
