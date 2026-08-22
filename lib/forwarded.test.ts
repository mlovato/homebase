import { firstForwardedValue } from "./forwarded";

describe("firstForwardedValue", () => {
  it.each([
    ["home.example.com", "home.example.com"],
    ["home.example.com, edge.internal", "home.example.com"],
    ["  home.example.com , edge.internal ", "home.example.com"],
    ["https,http", "https"],
  ])("reads %p as %p", (raw, expected) => {
    expect(firstForwardedValue(raw)).toBe(expected);
  });

  // Absent and blank must answer the same, so callers can fall back with `??`.
  it.each([null, "", "   ", ", edge.internal"])(
    "treats %p as absent",
    (raw) => {
      expect(firstForwardedValue(raw)).toBeNull();
    },
  );
});
