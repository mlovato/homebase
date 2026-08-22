import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategorySection } from "./CategorySection";
import type { CategoryWithLinks } from "@/lib/types";

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
      url_alt: null,
      icon_type: "builtin",
      icon_value: "plex",
      sort_order: 0,
    },
    {
      id: 2,
      category_id: 1,
      name: "Jellyfin",
      url: "http://jellyfin",
      url_alt: null,
      icon_type: "builtin",
      icon_value: "jellyfin",
      sort_order: 1,
    },
  ],
};

describe("CategorySection", () => {
  beforeEach(() => localStorage.clear());

  it("renders the category name as a heading", () => {
    render(
      <CategorySection category={category} intervalMs={10000} userId={7} />,
    );
    expect(screen.getByRole("heading", { name: /media/i })).toBeInTheDocument();
  });

  it("renders all link cards", () => {
    render(
      <CategorySection category={category} intervalMs={10000} userId={7} />,
    );
    expect(screen.getByText("Plex")).toBeInTheDocument();
    expect(screen.getByText("Jellyfin")).toBeInTheDocument();
  });

  it("renders nothing when there are no links", () => {
    const empty: CategoryWithLinks = { ...category, links: [] };
    render(<CategorySection category={empty} intervalMs={null} userId={7} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("collapses cards when the header button is clicked", async () => {
    render(
      <CategorySection category={category} intervalMs={10000} userId={7} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /media/i }));
    expect(screen.queryByText("Plex")).not.toBeInTheDocument();
    expect(screen.queryByText("Jellyfin")).not.toBeInTheDocument();
  });

  it("expands cards when a collapsed header is clicked again", async () => {
    render(
      <CategorySection category={category} intervalMs={10000} userId={7} />,
    );
    const btn = screen.getByRole("button", { name: /media/i });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(screen.getByText("Plex")).toBeInTheDocument();
    expect(screen.getByText("Jellyfin")).toBeInTheDocument();
  });

  it("sets aria-expanded on the toggle button", async () => {
    render(
      <CategorySection category={category} intervalMs={10000} userId={7} />,
    );
    const btn = screen.getByRole("button", { name: /media/i });
    expect(btn).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  // Two accounts sharing one browser both have a category id 1, so an unscoped
  // key let one user collapse a different category for the other.
  it("keeps collapsed state separate per user", async () => {
    const { unmount } = render(
      <CategorySection category={category} intervalMs={10000} userId={7} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /media/i }));
    expect(screen.getByRole("button", { name: /media/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    unmount();

    render(
      <CategorySection category={category} intervalMs={10000} userId={8} />,
    );
    expect(screen.getByRole("button", { name: /media/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("persists collapsed state to localStorage", async () => {
    render(
      <CategorySection category={category} intervalMs={10000} userId={7} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /media/i }));
    expect(localStorage.getItem("homebase:collapsed:7:1")).toBe("true");
  });

  it("clears localStorage when expanded again", async () => {
    localStorage.setItem("homebase:collapsed:7:1", "true");
    render(
      <CategorySection category={category} intervalMs={10000} userId={7} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /media/i }));
    expect(localStorage.getItem("homebase:collapsed:7:1")).toBeNull();
  });

  it("starts collapsed when localStorage has saved state", () => {
    localStorage.setItem("homebase:collapsed:7:1", "true");
    render(
      <CategorySection category={category} intervalMs={10000} userId={7} />,
    );
    expect(screen.queryByText("Plex")).not.toBeInTheDocument();
  });
});

describe("collapsed state and hydration", () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const { renderToString } = require("react-dom/server");

  const category = {
    id: 4,
    name: "Media",
    sort_order: 0,
    links: [
      {
        id: 1,
        category_id: 4,
        name: "Plex",
        url: "http://plex.local",
        url_alt: null,
        icon_type: "builtin" as const,
        icon_value: null,
        sort_order: 0,
      },
    ],
  };

  afterEach(() => localStorage.clear());

  // The render pass must not read localStorage: the server cannot see it, so a
  // render-time read makes the client's first tree disagree with the server HTML
  // and React answers that by discarding the whole server-rendered document.
  // renderToString runs the render function without effects, which is exactly
  // the pass that has to match.
  it("renders expanded during render even when stored collapsed", () => {
    localStorage.setItem("homebase:collapsed:7:4", "true");

    const html = renderToString(
      <CategorySection category={category} intervalMs={null} userId={7} />,
    );

    expect(html).toContain("Plex");
    expect(html).toContain('aria-expanded="true"');
  });

  it("restores the collapsed preference after mount", () => {
    localStorage.setItem("homebase:collapsed:7:4", "true");
    render(
      <CategorySection category={category} intervalMs={null} userId={7} />,
    );
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("stays expanded when nothing is stored", () => {
    render(
      <CategorySection category={category} intervalMs={null} userId={7} />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("renders when localStorage access throws", () => {
    const getItem = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new DOMException("blocked");
      });
    try {
      render(
        <CategorySection category={category} intervalMs={null} userId={7} />,
      );
      expect(screen.getByText("Media")).toBeInTheDocument();
    } finally {
      getItem.mockRestore();
    }
  });
});
