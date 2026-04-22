/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { SortableLinkCard } from "./SortableLinkCard";
import type { Link } from "@/lib/types";
import { HealthCheckContext } from "./HealthCheckContext";

jest.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));
jest.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

const link: Link = {
  id: 1,
  category_id: null,
  name: "Plex",
  url: "http://plex.local",
  url_alt: null,
  icon_type: "builtin",
  icon_value: "plex",
  sort_order: 0,
};

describe("SortableLinkCard", () => {
  it("renders the link name", () => {
    render(
      <SortableLinkCard
        link={link}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        intervalMs={10000}
      />,
    );
    expect(screen.getByText("Plex")).toBeInTheDocument();
  });

  it("shows status dot when intervalMs is a number", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://plex.local": "up" }}>
        <SortableLinkCard
          link={link}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          intervalMs={10000}
        />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("hides status dot when intervalMs is null", () => {
    render(
      <SortableLinkCard
        link={link}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        intervalMs={null}
      />,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
