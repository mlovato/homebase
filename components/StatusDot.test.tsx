/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { HealthCheckContext } from "./HealthCheckContext";
import { StatusDot } from "./StatusDot";

function renderWithStatus(url: string, status: string) {
  render(
    <HealthCheckContext.Provider value={{ [url]: status as never }}>
      <StatusDot url={url} />
    </HealthCheckContext.Provider>,
  );
}

describe("StatusDot", () => {
  it("shows checking when url not in context", () => {
    render(
      <HealthCheckContext.Provider value={{}}>
        <StatusDot url="http://plex.local" />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "checking",
    );
  });

  it("shows online when status is up", () => {
    renderWithStatus("http://plex.local", "up");
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "online");
  });

  it("shows offline when status is down", () => {
    renderWithStatus("http://broken.local", "down");
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "offline");
  });

  it("shows checking when status is unknown", () => {
    renderWithStatus("ftp://something.local", "unknown");
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "checking",
    );
  });
});
