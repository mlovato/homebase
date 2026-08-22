/**
 * Subsequence matching, shared by the icon search and the quick-launch search.
 *
 * Both were plain substring tests, so an abbreviation or a dropped vowel found
 * nothing at all — `docs/manual-testing-plan.md` asks for "gthb" to find
 * "github", and typing "hmasst" for "Home Assistant" is the same gesture.
 * Matching characters in order keeps the needle honest: it never matches a name
 * that does not contain those letters in that sequence.
 */
export function fuzzyMatches(needle: string, haystack: string): boolean {
  const target = haystack.toLowerCase();
  const query = needle.toLowerCase();
  let position = 0;

  for (const char of query) {
    position = target.indexOf(char, position);
    if (position === -1) return false;
    position += 1;
  }
  return true;
}
