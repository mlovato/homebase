import {
  isFilledString,
  isHttpUrl,
  isOptionalHttpUrl,
  isOptionalSortOrder,
  isSortOrder,
  parseRouteId,
} from "./validation";

describe("isFilledString", () => {
  it.each(["a", " padded "])("accepts %p", (value) => {
    expect(isFilledString(value)).toBe(true);
  });

  it.each(["", "   ", null, undefined, 0, 42, {}, []])(
    "rejects %p",
    (value) => {
      expect(isFilledString(value)).toBe(false);
    },
  );
});

describe("isHttpUrl", () => {
  it.each([
    "http://nas",
    "https://plex.example.com",
    "http://192.168.1.10:32400",
    "HTTPS://Example.COM",
    "  http://padded  ",
    "http://[::1]:8080/path?q=1",
  ])("accepts %s", (value) => {
    expect(isHttpUrl(value)).toBe(true);
  });

  it.each([
    "javascript:alert(document.domain)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "ftp://files.example.com",
    "//example.com",
    "example.com",
    "",
    "   ",
  ])("rejects %s", (value) => {
    expect(isHttpUrl(value)).toBe(false);
  });

  it.each([null, undefined, 42, {}, []])(
    "rejects the non-string %p",
    (value) => {
      expect(isHttpUrl(value)).toBe(false);
    },
  );
});

describe("isOptionalHttpUrl", () => {
  it.each([null, undefined, "", "   ", "http://nas"])(
    "accepts %p, since blank means not set",
    (value) => {
      expect(isOptionalHttpUrl(value)).toBe(true);
    },
  );

  it.each(["javascript:alert(1)", "example.com", 42])("rejects %p", (value) => {
    expect(isOptionalHttpUrl(value)).toBe(false);
  });
});

describe("isSortOrder", () => {
  it.each([0, 1, 42, -1])("accepts %p", (value) => {
    expect(isSortOrder(value)).toBe(true);
  });

  it.each(["0", "zzz", 1.5, NaN, Infinity, null, {}, []])(
    "rejects %p",
    (value) => {
      expect(isSortOrder(value)).toBe(false);
    },
  );
});

describe("isOptionalSortOrder", () => {
  it.each([undefined, 0, 7])("accepts %p", (value) => {
    expect(isOptionalSortOrder(value)).toBe(true);
  });

  it.each([null, "3", 1.5])("rejects %p", (value) => {
    expect(isOptionalSortOrder(value)).toBe(false);
  });
});

describe("parseRouteId", () => {
  it.each([
    ["1", 1],
    ["42", 42],
    ["0", 0],
  ])("reads %s as %i", (raw, expected) => {
    expect(parseRouteId(raw)).toBe(expected);
  });

  it.each(["1abc", "1.5", "-1", " 1", "", "abc", "1e3"])(
    "refuses %p rather than acting on a nearby row",
    (raw) => {
      expect(parseRouteId(raw)).toBeNaN();
    },
  );
});
