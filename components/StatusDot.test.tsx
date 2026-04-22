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

describe("dot sizing", () => {
  it("renders dot span as inline-block so width and height apply", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://plex.local": "up" }}>
        <StatusDot url="http://plex.local" />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("status")).toHaveClass("inline-block");
  });
});

describe("showAlt prop", () => {
  it("does not render alt pill by default", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://plex.local": "up" }}>
        <StatusDot url="http://plex.local" />
      </HealthCheckContext.Provider>,
    );
    expect(screen.queryByLabelText(/alternative url/i)).not.toBeInTheDocument();
  });

  it("renders alt pill when showAlt is true", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://alt.local": "up" }}>
        <StatusDot url="http://alt.local" showAlt />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByLabelText(/alternative url/i)).toBeInTheDocument();
  });

  it("shows green dot alongside alt pill when alt url is up", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://alt.local": "up" }}>
        <StatusDot url="http://alt.local" showAlt />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "online");
    expect(screen.getByLabelText(/alternative url/i)).toBeInTheDocument();
  });

  it("shows red dot alongside alt pill when alt url is down", () => {
    render(
      <HealthCheckContext.Provider value={{ "http://alt.local": "down" }}>
        <StatusDot url="http://alt.local" showAlt />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "offline");
    expect(screen.getByLabelText(/alternative url/i)).toBeInTheDocument();
  });
});
