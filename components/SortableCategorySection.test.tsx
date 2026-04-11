/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortableCategorySection } from "./SortableCategorySection";
import type { CategoryWithLinks, Link } from "@/lib/types";

jest.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  rectSortingStrategy: jest.fn(),
}));
jest.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));
jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: jest.fn(),
}));
jest.mock("@/components/SortableLinkCard", () => ({
  SortableLinkCard: ({ link }: { link: Link }) => (
    <div data-testid="sortable-card">{link.name}</div>
  ),
}));

const category: CategoryWithLinks = {
  id: 1,
  name: "Media",
  sort_order: 0,
  links: [
    {
      id: 1,
      category_id: 1,
      name: "Plex",
      url: "http://plex",
      icon_type: "builtin",
      icon_value: "plex",
      sort_order: 0,
    },
    {
      id: 2,
      category_id: 1,
      name: "Sonarr",
      url: "http://sonarr",
      icon_type: "builtin",
      icon_value: "sonarr",
      sort_order: 1,
    },
  ],
};

const emptyCategory: CategoryWithLinks = {
  id: 2,
  name: "Empty",
  sort_order: 1,
  links: [],
};

describe("SortableCategorySection", () => {
  it("renders the category name", () => {
    render(
      <SortableCategorySection
        category={category}
        sensors={[]}
        onAddLink={jest.fn()}
        onEditCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onEditLink={jest.fn()}
        onDeleteLink={jest.fn()}
        onLinkDragEnd={jest.fn()}
        intervalMs={null}
      />,
    );
    expect(screen.getByText("Media")).toBeInTheDocument();
  });

  it("renders links within the category", () => {
    render(
      <SortableCategorySection
        category={category}
        sensors={[]}
        onAddLink={jest.fn()}
        onEditCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onEditLink={jest.fn()}
        onDeleteLink={jest.fn()}
        onLinkDragEnd={jest.fn()}
        intervalMs={null}
      />,
    );
    expect(screen.getByText("Plex")).toBeInTheDocument();
    expect(screen.getByText("Sonarr")).toBeInTheDocument();
  });

  it("shows empty message when category has no links", () => {
    render(
      <SortableCategorySection
        category={emptyCategory}
        sensors={[]}
        onAddLink={jest.fn()}
        onEditCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onEditLink={jest.fn()}
        onDeleteLink={jest.fn()}
        onLinkDragEnd={jest.fn()}
        intervalMs={null}
      />,
    );
    expect(screen.getByText(/no links in this category/i)).toBeInTheDocument();
  });

  it("has a drag handle", () => {
    render(
      <SortableCategorySection
        category={category}
        sensors={[]}
        onAddLink={jest.fn()}
        onEditCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onEditLink={jest.fn()}
        onDeleteLink={jest.fn()}
        onLinkDragEnd={jest.fn()}
        intervalMs={null}
      />,
    );
    expect(screen.getByTitle("Drag to reorder")).toBeInTheDocument();
  });

  it("calls onDeleteCategory when Delete is clicked", () => {
    const onDelete = jest.fn();
    render(
      <SortableCategorySection
        category={category}
        sensors={[]}
        onAddLink={jest.fn()}
        onEditCategory={jest.fn()}
        onDeleteCategory={onDelete}
        onEditLink={jest.fn()}
        onDeleteLink={jest.fn()}
        onLinkDragEnd={jest.fn()}
        intervalMs={null}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
