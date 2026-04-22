import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminLinkForm } from "./AdminLinkForm";
import type { Category } from "@/lib/types";

const categories: Category[] = [
  { id: 1, name: "Media", sort_order: 0 },
  { id: 2, name: "Tools", sort_order: 1 },
];

// Mock fetch for icon search API
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results: [] }),
  } as unknown as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("AdminLinkForm", () => {
  it("renders name, url, and category inputs", () => {
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^url$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it("calls onSubmit with form values on submit", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );

    await userEvent.type(screen.getByLabelText(/name/i), "Plex");
    await userEvent.type(
      screen.getByLabelText(/^url$/i),
      "http://localhost:32400",
    );
    fireEvent.click(screen.getByRole("button", { name: /create|save/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Plex", url: "http://localhost:32400" }),
    );
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = jest.fn();
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={onCancel}
        categories={categories}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows icon search input when builtin tab is selected (default)", () => {
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    expect(screen.getByPlaceholderText(/search icon/i)).toBeInTheDocument();
  });

  it("shows upload input when upload tab is selected", async () => {
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /upload/i }));
    expect(screen.getByLabelText(/icon file/i)).toBeInTheDocument();
  });

  it("pre-fills values in edit mode", () => {
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
        initialValues={{
          name: "Plex",
          url: "http://localhost:32400",
          icon_type: "builtin",
          icon_value: "plex",
          category_id: 1,
        }}
      />,
    );
    expect(screen.getByDisplayValue("Plex")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("http://localhost:32400"),
    ).toBeInTheDocument();
  });

  it("shows suggestion dropdown when icon search returns results", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            slug: "plex",
            name: "Plex",
            url: "https://cdn.example.com/plex.svg",
          },
        ],
      }),
    } as unknown as Response);

    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText(/search icon/i), "pl");

    await waitFor(() => {
      expect(screen.getByText("Plex")).toBeInTheDocument();
    });
  });

  it("focuses the name input on mount", () => {
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toHaveFocus();
  });

  it("prepends https:// when url has no scheme", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    await userEvent.type(screen.getByLabelText(/name/i), "Google");
    await userEvent.type(screen.getByLabelText(/^url$/i), "www.google.com");
    fireEvent.click(screen.getByRole("button", { name: /create|save/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://www.google.com" }),
    );
  });

  it("does not double-prepend scheme on urls that already have one", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    await userEvent.type(screen.getByLabelText(/name/i), "Plex");
    await userEvent.type(
      screen.getByLabelText(/^url$/i),
      "http://localhost:32400",
    );
    fireEvent.click(screen.getByRole("button", { name: /create|save/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://localhost:32400" }),
    );
  });

  it("shows error and does not submit when url is invalid", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    await userEvent.type(screen.getByLabelText(/name/i), "Bad Link");
    await userEvent.type(screen.getByLabelText(/^url$/i), "not a url");
    fireEvent.click(screen.getByRole("button", { name: /create|save/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a valid url/i)).toBeInTheDocument();
  });

  it("rejects a bare word with no dot as invalid", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    await userEvent.type(screen.getByLabelText(/name/i), "Bibbo");
    await userEvent.type(screen.getByLabelText(/^url$/i), "bibbo");
    fireEvent.click(screen.getByRole("button", { name: /create|save/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a valid url/i)).toBeInTheDocument();
  });

  it("allows localhost urls without a dot", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    await userEvent.type(screen.getByLabelText(/name/i), "Local");
    await userEvent.type(
      screen.getByLabelText(/^url$/i),
      "http://localhost:3000",
    );
    fireEvent.click(screen.getByRole("button", { name: /create|save/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://localhost:3000" }),
    );
  });

  it("shows error on blur when url is invalid", async () => {
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    const urlInput = screen.getByLabelText(/^url$/i);
    await userEvent.type(urlInput, "bibbo");
    fireEvent.blur(urlInput);

    expect(screen.getByText(/enter a valid url/i)).toBeInTheDocument();
  });

  it("does not show error on blur when url is valid", async () => {
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    const urlInput = screen.getByLabelText(/^url$/i);
    await userEvent.type(urlInput, "www.google.com");
    fireEvent.blur(urlInput);

    expect(screen.queryByText(/enter a valid url/i)).not.toBeInTheDocument();
  });

  it("does not call onSubmit when name is empty", () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /create|save/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("Alternative URL field", () => {
  it("renders the Alternative URL input", () => {
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    expect(screen.getByLabelText(/alternative url/i)).toBeInTheDocument();
  });

  it("calls onSubmit with url_alt: null when Alternative URL is empty", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Plex");
    await userEvent.type(screen.getByLabelText(/^url$/i), "http://plex.local");
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ url_alt: null }),
    );
  });

  it("calls onSubmit with url_alt when Alternative URL is filled", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Plex");
    await userEvent.type(screen.getByLabelText(/^url$/i), "http://plex.local");
    await userEvent.type(
      screen.getByLabelText(/alternative url/i),
      "plex.remote",
    );
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ url_alt: "https://plex.remote" }),
    );
  });

  it("shows error and does not submit when Alternative URL is invalid", async () => {
    const onSubmit = jest.fn();
    render(
      <AdminLinkForm
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        categories={categories}
      />,
    );
    await userEvent.type(screen.getByLabelText(/^name$/i), "Plex");
    await userEvent.type(screen.getByLabelText(/^url$/i), "http://plex.local");
    await userEvent.type(
      screen.getByLabelText(/alternative url/i),
      "not-a-url!!",
    );
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(
      await screen.findByText(/please enter a valid url/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("pre-fills url_alt in edit mode", () => {
    render(
      <AdminLinkForm
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        categories={categories}
        initialValues={{
          name: "Plex",
          url: "http://plex.local",
          url_alt: "http://plex.remote",
          icon_type: "builtin",
          icon_value: null,
          category_id: null,
        }}
      />,
    );
    expect(screen.getByDisplayValue("http://plex.remote")).toBeInTheDocument();
  });
});
