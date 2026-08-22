/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminPage from "./page";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: jest.fn() }),
}));

const emptyData = { categories: [], uncategorized: [] };

function mockFetch(handler: (url: string, init?: RequestInit) => unknown) {
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const response = handler(String(url), init);
    return response ?? { ok: true, status: 200, json: async () => emptyData };
  }) as unknown as typeof fetch;
}

async function openNewCategoryForm() {
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /add category/i })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: /add category/i }));
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: "Media" },
  });
  fireEvent.click(screen.getByRole("button", { name: /create/i }));
}

afterEach(() => jest.clearAllMocks());

describe("AdminPage when the session is no longer accepted", () => {
  // The panel used to show a bare "Unauthorized" toast and stay open, so every
  // further click failed the same way with no hint to sign in again.
  it("sends the user to the login page when a save is refused", async () => {
    mockFetch((url, init) => {
      if (url === "/api/categories" && init?.method === "POST") {
        return { ok: false, status: 401, json: async () => ({}) };
      }
      return undefined;
    });

    render(<AdminPage />);
    await openNewCategoryForm();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/login"));
    expect(screen.queryByText(/unauthorized/i)).not.toBeInTheDocument();
  });

  it("still reports other failures in place", async () => {
    mockFetch((url, init) => {
      if (url === "/api/categories" && init?.method === "POST") {
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: "A category with the same name exists" }),
        };
      }
      return undefined;
    });

    render(<AdminPage />);
    await openNewCategoryForm();

    await waitFor(() =>
      expect(
        screen.getByText("A category with the same name exists"),
      ).toBeInTheDocument(),
    );
    expect(push).not.toHaveBeenCalled();
  });
});
