import { fuzzyMatches } from "./fuzzy";

describe("fuzzyMatches", () => {
  it.each([
    ["gthb", "github"],
    ["hmasst", "Home Assistant"],
    ["plex", "plex"],
    ["px", "plex"],
    ["GIT", "Gitea"],
    ["", "anything"],
  ])("matches %p against %p", (needle, haystack) => {
    expect(fuzzyMatches(needle, haystack)).toBe(true);
  });

  it.each([
    ["git", "grafana"],
    ["git", "prometheus"],
    ["zzznomatch", "plex"],
    ["xelp", "plex"],
    ["plexx", "plex"],
  ])("does not match %p against %p", (needle, haystack) => {
    expect(fuzzyMatches(needle, haystack)).toBe(false);
  });

  it("requires the characters in order, not merely present", () => {
    expect(fuzzyMatches("bda", "abcd")).toBe(false);
    expect(fuzzyMatches("acd", "abcd")).toBe(true);
  });
});
