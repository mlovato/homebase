import { render, screen, fireEvent } from "@testing-library/react";
import { LinkCard } from "./LinkCard";
import { HealthCheckContext } from "./HealthCheckContext";
import type { Link } from "@/lib/types";

const baseLink: Link = {
  id: 1,
  category_id: 1,
  name: "Plex",
  url: "http://localhost:32400",
  url_alt: null,
  icon_type: "builtin",
  icon_value: "plex",
  sort_order: 0,
};

describe("LinkCard", () => {
  it("renders the link name", () => {
    render(<LinkCard link={baseLink} />);
    expect(screen.getByText("Plex")).toBeInTheDocument();
  });

  it("renders an anchor with target _blank and noopener", () => {
    render(<LinkCard link={baseLink} />);
    const anchor = screen.getByRole("link");
    expect(anchor).toHaveAttribute("href", "http://localhost:32400");
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("sets title tooltip when tooltip prop is true (default)", () => {
    render(<LinkCard link={baseLink} />);
    expect(screen.getByRole("link")).toHaveAttribute("title", "Plex");
  });

  it("omits title tooltip when tooltip prop is false", () => {
    render(<LinkCard link={baseLink} tooltip={false} />);
    expect(screen.getByRole("link")).not.toHaveAttribute("title");
  });

  it("renders a CDN img for builtin icon type", () => {
    render(<LinkCard link={baseLink} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("plex.svg"));
    expect(img).toHaveAttribute("alt", "Plex");
  });

  it("renders an img for upload icon type", () => {
    const link: Link = {
      ...baseLink,
      icon_type: "upload",
      icon_value: "/uploads/icon.png",
    };
    render(<LinkCard link={link} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("uploads"));
  });

  it("renders an img for url icon type", () => {
    const link: Link = {
      ...baseLink,
      icon_type: "url",
      icon_value: "https://example.com/icon.png",
    };
    render(<LinkCard link={link} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://example.com/icon.png",
    );
  });

  it("tries favicon when icon_value is null", () => {
    const link: Link = { ...baseLink, icon_type: "builtin", icon_value: null };
    render(<LinkCard link={link} />);
    const img = screen.getByRole("img", { name: "Plex" });
    expect(img).toHaveAttribute(
      "src",
      "/api/favicon?url=http%3A%2F%2Flocalhost%3A32400",
    );
  });

  it("falls back to letter avatar when favicon also fails", () => {
    const link: Link = { ...baseLink, icon_type: "builtin", icon_value: null };
    render(<LinkCard link={link} />);
    fireEvent.error(screen.getByRole("img")); // proxy fails → direct
    fireEvent.error(screen.getByRole("img")); // direct fails → avatar
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("tries favicon after all builtin variants fail before showing letter avatar", () => {
    render(<LinkCard link={{ ...baseLink, icon_value: "unknownservice" }} />);

    // First attempt: unknownservice.svg
    fireEvent.error(screen.getByRole("img"));
    // Second attempt: unknownservice-light.svg
    fireEvent.error(screen.getByRole("img"));
    // Third attempt: unknownservice-dark.svg
    fireEvent.error(screen.getByRole("img"));
    // Favicon attempt
    const favicon = screen.getByRole("img", { name: "Plex" });
    expect(favicon).toHaveAttribute(
      "src",
      "/api/favicon?url=http%3A%2F%2Flocalhost%3A32400",
    );
    // Proxy favicon fails → direct favicon.ico
    fireEvent.error(favicon);
    // Direct favicon fails → letter avatar
    fireEvent.error(screen.getByRole("img", { name: "Plex" }));
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows -light variant src on first error", () => {
    render(<LinkCard link={{ ...baseLink, icon_value: "myservice" }} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("myservice-light.svg"),
    );
  });

  it("shows status dot when intervalMs is a number", () => {
    render(
      <HealthCheckContext.Provider value={{ [baseLink.url]: "up" }}>
        <LinkCard link={baseLink} intervalMs={10000} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("hides status dot when intervalMs is null", () => {
    render(<LinkCard link={baseLink} intervalMs={null} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides status dot when intervalMs is not provided", () => {
    render(<LinkCard link={baseLink} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("url_alt resolution", () => {
  const altLink: Link = { ...baseLink, url_alt: "http://plex.remote" };

  it("uses primary url when primary is up", () => {
    render(
      <HealthCheckContext.Provider value={{ [baseLink.url]: "up" }}>
        <LinkCard link={altLink} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", baseLink.url);
  });

  it("uses primary url when status is unknown", () => {
    render(
      <HealthCheckContext.Provider value={{}}>
        <LinkCard link={altLink} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", baseLink.url);
  });

  it("uses alt url when primary is down and url_alt is set", () => {
    render(
      <HealthCheckContext.Provider value={{ [baseLink.url]: "down" }}>
        <LinkCard link={altLink} intervalMs={10000} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "http://plex.remote",
    );
  });

  it("uses primary url when primary is down but url_alt is null", () => {
    render(
      <HealthCheckContext.Provider value={{ [baseLink.url]: "down" }}>
        <LinkCard link={baseLink} intervalMs={10000} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", baseLink.url);
  });

  it("shows alt pill when using alt url", () => {
    render(
      <HealthCheckContext.Provider value={{ [baseLink.url]: "down" }}>
        <LinkCard link={altLink} intervalMs={10000} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.getByLabelText(/alternative url/i)).toBeInTheDocument();
  });

  it("does not show alt pill when using primary url", () => {
    render(
      <HealthCheckContext.Provider value={{ [baseLink.url]: "up" }}>
        <LinkCard link={altLink} intervalMs={10000} />
      </HealthCheckContext.Provider>,
    );
    expect(screen.queryByLabelText(/alternative url/i)).not.toBeInTheDocument();
  });
});
