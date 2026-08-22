/**
 * @jest-environment node
 */

// Must be set before the first Date/Intl use in this module.
process.env.TZ = "Europe/Rome";

import { formatStoredDate } from "./formatDate";

describe("formatStoredDate", () => {
  it("treats the stored value as UTC, not local time", () => {
    // 23:30 UTC is already the 23rd in Europe/Rome (UTC+2).
    expect(formatStoredDate("2026-08-22 23:30:00")).toBe(
      new Date("2026-08-22T23:30:00Z").toLocaleDateString(),
    );
  });

  it("does not report the previous day for a late-UTC timestamp", () => {
    const naive = new Date("2026-08-22 23:30:00").toLocaleDateString();
    expect(formatStoredDate("2026-08-22 23:30:00")).not.toBe(naive);
  });

  it("formats a midday timestamp the same either way", () => {
    expect(formatStoredDate("2026-08-22 09:00:00")).toBe(
      new Date("2026-08-22T09:00:00Z").toLocaleDateString(),
    );
  });

  it("returns the raw value when it cannot be parsed", () => {
    expect(formatStoredDate("not a date")).toBe("not a date");
  });
});
