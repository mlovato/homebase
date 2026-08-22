/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardHeader } from "./DashboardHeader";
import type { User } from "@/lib/types";

const user: User = {
  id: 1,
  email: "admin@test.local",
  role: "admin",
  avatar: null,
  created_at: "2026-01-01 00:00:00",
};

const links = [
  {
    id: 1,
    name: "Grafana",
    url: "http://grafana.local",
    url_alt: null,
    icon_type: "builtin" as const,
    icon_value: "grafana",
  },
];

function setup(shortcut = "mod+k") {
  render(
    <DashboardHeader user={user} searchLinks={links} shortcut={shortcut} />,
  );
}

describe("DashboardHeader", () => {
  it("shows the signed-in user's email", () => {
    setup();
    expect(screen.getByText("admin@test.local")).toBeInTheDocument();
  });

  it("opens the search modal from the search control", () => {
    setup();

    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // The control used to be hidden from md upwards, so on a desktop there was no
  // way to open search by mouse and nothing naming the shortcut either.
  it("names the current shortcut so it can be discovered without guessing", () => {
    setup("mod+j");

    const hint = screen.getByTestId("search-shortcut-hint");

    expect(hint).toHaveTextContent("J");
    expect(hint.className).not.toMatch(/md:hidden/);
  });

  it("names a changed single-key shortcut too", () => {
    setup("/");
    expect(screen.getByTestId("search-shortcut-hint")).toHaveTextContent("/");
  });
});
