/**
 * @jest-environment node
 */
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import {
  UPLOADS_DIR,
  UPLOADS_URL_PREFIX,
  storedUploadExists,
  uploadPublicPath,
} from "./uploads";

const NAME = "3f2504e0-4f89-11d3-9a0c-0305e82c3310.png";
const ABSENT = "3f2504e0-4f89-11d3-9a0c-0305e82c3311.png";

beforeAll(async () => {
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, NAME), new Uint8Array([1]));
});

afterAll(async () => {
  await rm(path.join(UPLOADS_DIR, NAME), { force: true });
});

describe("uploadPublicPath", () => {
  it("names the file the way the API reports it", () => {
    expect(uploadPublicPath(NAME)).toBe(`${UPLOADS_URL_PREFIX}${NAME}`);
  });
});

describe("storedUploadExists", () => {
  it("finds a file that is in the store", () => {
    expect(storedUploadExists(uploadPublicPath(NAME))).toBe(true);
  });

  // The case an import hits: the backup names the icon, the file never came.
  it("reports a stored name with no file behind it", () => {
    expect(storedUploadExists(uploadPublicPath(ABSENT))).toBe(false);
  });

  it.each([
    ["a bare filename with no prefix", NAME],
    ["some other route's path", `/icons/${NAME}`],
    ["a traversal dressed as an icon", "/uploads/../../../etc/passwd"],
    ["a name that is not a stored upload", "/uploads/not-a-uuid.png"],
    [
      "an extension we never store",
      "/uploads/3f2504e0-4f89-11d3-9a0c-0305e82c3310.svg",
    ],
    ["an empty value", ""],
    // Nine characters of anything else, followed by a real stored name, would
    // otherwise slice cleanly and report a file the app cannot actually serve:
    // /uploads/[filename] matches case-sensitively.
    ["a prefix of the same length in the wrong case", `/UPLOADS/${NAME}`],
  ])("refuses %s", (_label, value) => {
    expect(storedUploadExists(value)).toBe(false);
  });
});
