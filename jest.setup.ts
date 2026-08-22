import "@testing-library/jest-dom";

// jsdom has no layout engine, so it ships no scrollIntoView at all. Components
// that keep a selection visible would throw rather than be testable.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
