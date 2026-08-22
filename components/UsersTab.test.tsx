/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { UsersTab } from "./UsersTab";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: jest.fn() }),
}));

const users = [
  {
    id: 1,
    email: "admin@test.local",
    role: "admin" as const,
    avatar: null,
    created_at: "2026-01-15 10:30:00",
  },
];

afterEach(() => jest.clearAllMocks());

describe("UsersTab", () => {
  it("lists the users it loaded", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => users,
    }) as unknown as typeof fetch;

    render(<UsersTab showError={jest.fn()} />);

    expect(await screen.findByText("admin@test.local")).toBeInTheDocument();
  });

  // A deleted or demoted account used to sit on "Failed to load users" forever,
  // with nothing telling the user to sign in again.
  it("sends the user to login when the session is refused", async () => {
    const showError = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    }) as unknown as typeof fetch;

    render(<UsersTab showError={showError} />);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/login"));
    expect(showError).not.toHaveBeenCalled();
  });

  it("still reports other load failures in place", async () => {
    const showError = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    render(<UsersTab showError={showError} />);

    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith("Failed to load users"),
    );
    expect(push).not.toHaveBeenCalled();
  });
});
