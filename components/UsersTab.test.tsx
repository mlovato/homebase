/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

const twoUsers = [
  ...users,
  {
    id: 2,
    email: "bob@test.local",
    role: "user" as const,
    avatar: null,
    created_at: "2026-01-16 10:30:00",
  },
];

function respondWith(body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  }) as unknown as typeof fetch;
}

afterEach(() => jest.clearAllMocks());

describe("UsersTab", () => {
  it("lists the users it loaded", async () => {
    respondWith(users);

    render(<UsersTab showError={jest.fn()} currentUserId={1} />);

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

    render(<UsersTab showError={showError} currentUserId={1} />);

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

    render(<UsersTab showError={showError} currentUserId={1} />);

    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith("Failed to load users"),
    );
    expect(push).not.toHaveBeenCalled();
  });
});

// The API refuses both of these, so offering them is a control that can only
// ever produce an error toast.
describe("guards the API already enforces", () => {
  it("does not offer to delete the signed-in account", async () => {
    respondWith(twoUsers);

    render(<UsersTab showError={jest.fn()} currentUserId={1} />);
    await screen.findByText("bob@test.local");

    const deletable = screen
      .getAllByTitle("Delete")
      .map((button) => button.closest("tr")?.textContent ?? "");
    expect(deletable).toEqual([expect.stringContaining("bob@test.local")]);
  });

  it("does not offer to demote the only admin", async () => {
    respondWith(twoUsers);

    render(<UsersTab showError={jest.fn()} currentUserId={1} />);
    await screen.findByText("admin@test.local");
    fireEvent.click(screen.getAllByTitle("Edit")[0]);

    const userOption = screen.getByRole("option", {
      name: "User",
    }) as HTMLOptionElement;
    expect(userOption.disabled).toBe(true);
  });

  it("still offers to demote an admin when another one remains", async () => {
    respondWith([
      ...twoUsers,
      { ...twoUsers[1], id: 3, role: "admin" as const },
    ]);

    render(<UsersTab showError={jest.fn()} currentUserId={1} />);
    await screen.findByText("admin@test.local");
    fireEvent.click(screen.getAllByTitle("Edit")[0]);

    const userOption = screen.getByRole("option", {
      name: "User",
    }) as HTMLOptionElement;
    expect(userOption.disabled).toBe(false);
  });
});
