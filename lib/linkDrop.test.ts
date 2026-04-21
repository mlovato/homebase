/**
 * @jest-environment node
 */
import {
  computeLinkDrop,
  findLinkById,
  linkContainerId,
  parseLinkContainerId,
  UNCATEGORIZED_LINK_CONTAINER,
} from "./linkDrop";
import type { CategoryWithLinks, Link } from "@/lib/types";

function makeLink(id: number, categoryId: number | null, order: number): Link {
  return {
    id,
    category_id: categoryId,
    name: `L${id}`,
    url: `http://l${id}`,
    icon_type: "builtin",
    icon_value: null,
    sort_order: order,
  };
}

function makeCategory(id: number, links: Link[]): CategoryWithLinks {
  return { id, name: `C${id}`, sort_order: 0, links };
}

describe("linkContainerId / parseLinkContainerId", () => {
  it("round-trips a category id", () => {
    expect(parseLinkContainerId(linkContainerId(7))).toBe(7);
  });

  it("round-trips the uncategorized sentinel", () => {
    expect(parseLinkContainerId(linkContainerId(null))).toBeNull();
    expect(linkContainerId(null)).toBe(UNCATEGORIZED_LINK_CONTAINER);
  });

  it("returns undefined for unknown ids", () => {
    expect(parseLinkContainerId("categories")).toBeUndefined();
    expect(parseLinkContainerId("links-cat-abc")).toBeUndefined();
  });
});

describe("computeLinkDrop", () => {
  const cat1Links = [
    makeLink(10, 1, 0),
    makeLink(11, 1, 1),
    makeLink(12, 1, 2),
  ];
  const cat2Links = [makeLink(20, 2, 0), makeLink(21, 2, 1)];
  const cat3Links: Link[] = [];
  const uncategorized = [makeLink(30, null, 0), makeLink(31, null, 1)];
  const categories = [
    makeCategory(1, cat1Links),
    makeCategory(2, cat2Links),
    makeCategory(3, cat3Links),
  ];

  it("returns null when dropping in the same position", () => {
    const result = computeLinkDrop({
      activeId: 10,
      sourceContainerId: 1,
      targetContainerId: 1,
      targetIndex: 0,
      categories,
      uncategorized,
    });
    expect(result).toBeNull();
  });

  it("reorders within the same category", () => {
    const result = computeLinkDrop({
      activeId: 10,
      sourceContainerId: 1,
      targetContainerId: 1,
      targetIndex: 2,
      categories,
      uncategorized,
    });
    expect(result).not.toBeNull();
    expect(result?.target).toBeUndefined();
    expect(result?.source.categoryId).toBe(1);
    expect(result?.source.links.map((l) => l.id)).toEqual([11, 12, 10]);
  });

  it("moves a link to another non-empty category, inserting before the over-link", () => {
    const result = computeLinkDrop({
      activeId: 10,
      sourceContainerId: 1,
      targetContainerId: 2,
      targetIndex: 1,
      categories,
      uncategorized,
    });
    expect(result?.source.categoryId).toBe(1);
    expect(result?.source.links.map((l) => l.id)).toEqual([11, 12]);
    expect(result?.target?.categoryId).toBe(2);
    expect(result?.target?.links.map((l) => l.id)).toEqual([20, 10, 21]);
    const moved = result?.target?.links.find((l) => l.id === 10);
    expect(moved?.category_id).toBe(2);
  });

  it("moves a link to an empty category (appended)", () => {
    const result = computeLinkDrop({
      activeId: 10,
      sourceContainerId: 1,
      targetContainerId: 3,
      targetIndex: 0,
      categories,
      uncategorized,
    });
    expect(result?.source.links.map((l) => l.id)).toEqual([11, 12]);
    expect(result?.target?.categoryId).toBe(3);
    expect(result?.target?.links.map((l) => l.id)).toEqual([10]);
    expect(result?.target?.links[0].category_id).toBe(3);
  });

  it("moves an uncategorized link into a category", () => {
    const result = computeLinkDrop({
      activeId: 30,
      sourceContainerId: null,
      targetContainerId: 2,
      targetIndex: 2,
      categories,
      uncategorized,
    });
    expect(result?.source.categoryId).toBeNull();
    expect(result?.source.links.map((l) => l.id)).toEqual([31]);
    expect(result?.target?.categoryId).toBe(2);
    expect(result?.target?.links.map((l) => l.id)).toEqual([20, 21, 30]);
    expect(result?.target?.links.at(-1)?.category_id).toBe(2);
  });

  it("moves a categorized link into uncategorized", () => {
    const result = computeLinkDrop({
      activeId: 11,
      sourceContainerId: 1,
      targetContainerId: null,
      targetIndex: 1,
      categories,
      uncategorized,
    });
    expect(result?.target?.categoryId).toBeNull();
    expect(result?.target?.links.map((l) => l.id)).toEqual([30, 11, 31]);
    expect(result?.target?.links[1].category_id).toBeNull();
  });

  it("clamps an out-of-range targetIndex", () => {
    const result = computeLinkDrop({
      activeId: 10,
      sourceContainerId: 1,
      targetContainerId: 2,
      targetIndex: 999,
      categories,
      uncategorized,
    });
    expect(result?.target?.links.map((l) => l.id)).toEqual([20, 21, 10]);
  });

  it("returns null when the active link is not in the source container", () => {
    const result = computeLinkDrop({
      activeId: 9999,
      sourceContainerId: 1,
      targetContainerId: 2,
      targetIndex: 0,
      categories,
      uncategorized,
    });
    expect(result).toBeNull();
  });

  it("returns null when a container is unknown", () => {
    const result = computeLinkDrop({
      activeId: 10,
      sourceContainerId: 1,
      targetContainerId: 99,
      targetIndex: 0,
      categories,
      uncategorized,
    });
    expect(result).toBeNull();
  });
});

describe("findLinkById", () => {
  const catLink = makeLink(1, 10, 0);
  const uncatLink = makeLink(2, null, 0);
  const categories = [makeCategory(10, [catLink])];
  const uncategorized = [uncatLink];

  it("finds a link inside a category", () => {
    expect(findLinkById(1, categories, uncategorized)).toEqual(catLink);
  });

  it("finds an uncategorized link", () => {
    expect(findLinkById(2, categories, uncategorized)).toEqual(uncatLink);
  });

  it("returns null when no match exists", () => {
    expect(findLinkById(999, categories, uncategorized)).toBeNull();
  });
});
