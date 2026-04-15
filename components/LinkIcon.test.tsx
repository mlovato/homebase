/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { LinkIcon } from "./LinkIcon";

describe("LinkIcon", () => {
  it("renders an img for builtin icon type", () => {
    render(
      <LinkIcon
        name="Grafana"
        iconType="builtin"
        iconValue="grafana"
        size="lg"
      />,
    );
    expect(screen.getByRole("img", { name: "Grafana" })).toBeInTheDocument();
  });

  it("renders an img for url icon type", () => {
    render(
      <LinkIcon
        name="My App"
        iconType="url"
        iconValue="http://example.com/icon.png"
        size="lg"
      />,
    );
    const img = screen.getByRole("img", { name: "My App" });
    expect(img).toHaveAttribute("src", "http://example.com/icon.png");
  });

  it("renders an img for upload icon type", () => {
    render(
      <LinkIcon
        name="My App"
        iconType="upload"
        iconValue="/uploads/icon.png"
        size="lg"
      />,
    );
    const img = screen.getByRole("img", { name: "My App" });
    expect(img).toHaveAttribute("src", "/uploads/icon.png");
  });

  it("renders letter avatar when iconValue is null", () => {
    render(
      <LinkIcon name="Grafana" iconType="builtin" iconValue={null} size="lg" />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("G")).toBeInTheDocument();
  });

  it("falls back to letter avatar after all builtin variants fail", () => {
    render(
      <LinkIcon
        name="Grafana"
        iconType="builtin"
        iconValue="grafana"
        size="lg"
      />,
    );
    const img = screen.getByRole("img");
    fireEvent.error(img); // base slug fails
    fireEvent.error(screen.getByRole("img")); // -light fails
    fireEvent.error(screen.getByRole("img")); // -dark fails
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("G")).toBeInTheDocument();
  });

  it("renders letter avatar when iconType is builtin but iconValue is null", () => {
    render(
      <LinkIcon name="Test" iconType="builtin" iconValue={null} size="sm" />,
    );
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("falls back to letter avatar when upload/url image fails to load", () => {
    render(
      <LinkIcon
        name="My App"
        iconType="url"
        iconValue="http://broken.local/icon.png"
        size="lg"
      />,
    );
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("resets failed state when iconValue changes", () => {
    const { rerender } = render(
      <LinkIcon
        name="My App"
        iconType="upload"
        iconValue="/uploads/old.png"
        size="lg"
      />,
    );
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    rerender(
      <LinkIcon
        name="My App"
        iconType="url"
        iconValue="http://example.com/icon.png"
        size="lg"
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "http://example.com/icon.png",
    );
  });

  it("resets failed state when iconType changes", () => {
    const { rerender } = render(
      <LinkIcon
        name="My App"
        iconType="url"
        iconValue="http://broken.local/icon.png"
        size="lg"
      />,
    );
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    rerender(
      <LinkIcon name="My App" iconType="builtin" iconValue="plex" size="lg" />,
    );
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  describe("favicon fallback", () => {
    it("tries favicon when iconValue is null and url is provided", () => {
      render(
        <LinkIcon
          name="Plex"
          iconType="builtin"
          iconValue={null}
          size="lg"
          url="http://localhost:32400"
        />,
      );
      const img = screen.getByRole("img", { name: "Plex" });
      expect(img).toHaveAttribute(
        "src",
        "/api/favicon?url=http%3A%2F%2Flocalhost%3A32400",
      );
    });

    it("falls back to letter avatar when favicon also fails", () => {
      render(
        <LinkIcon
          name="Plex"
          iconType="builtin"
          iconValue={null}
          size="lg"
          url="http://localhost:32400"
        />,
      );
      fireEvent.error(screen.getByRole("img"));
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("P")).toBeInTheDocument();
    });

    it("tries favicon when upload/url icon fails and url is provided", () => {
      render(
        <LinkIcon
          name="My App"
          iconType="url"
          iconValue="http://broken.local/icon.png"
          size="lg"
          url="http://myapp.local:8080"
        />,
      );
      fireEvent.error(screen.getByRole("img"));
      const img = screen.getByRole("img", { name: "My App" });
      expect(img).toHaveAttribute(
        "src",
        "/api/favicon?url=http%3A%2F%2Fmyapp.local%3A8080",
      );
    });

    it("tries favicon after all builtin variants fail when url is provided", () => {
      render(
        <LinkIcon
          name="Grafana"
          iconType="builtin"
          iconValue="grafana"
          size="lg"
          url="http://grafana.local:3000"
        />,
      );
      fireEvent.error(screen.getByRole("img")); // base slug
      fireEvent.error(screen.getByRole("img")); // -light
      fireEvent.error(screen.getByRole("img")); // -dark
      const img = screen.getByRole("img", { name: "Grafana" });
      expect(img).toHaveAttribute(
        "src",
        "/api/favicon?url=http%3A%2F%2Fgrafana.local%3A3000",
      );
    });

    it("shows letter avatar without favicon when url is not provided", () => {
      render(
        <LinkIcon
          name="Grafana"
          iconType="builtin"
          iconValue={null}
          size="lg"
        />,
      );
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("G")).toBeInTheDocument();
    });

    it("ignores invalid url and shows letter avatar directly", () => {
      render(
        <LinkIcon
          name="Test"
          iconType="builtin"
          iconValue={null}
          size="lg"
          url="not-a-url"
        />,
      );
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("T")).toBeInTheDocument();
    });
  });
});
