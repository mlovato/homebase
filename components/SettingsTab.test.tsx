import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsTab } from "./SettingsTab";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: jest.fn() }),
}));

const mockSetTheme = jest.fn();

jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ health_check_interval: "5s" }),
  });
});

afterEach(() => jest.clearAllMocks());

const importPayload = JSON.stringify({
  version: 1,
  categories: [],
  uncategorized: [],
});

/** jsdom's File has no text() of its own, so the component's read needs one. */
function selectImportFile(container: HTMLElement) {
  const input = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const file = new File([importPayload], "backup.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", { value: async () => importPayload });
  fireEvent.change(input, { target: { files: [file] } });
}

function mockImportResponse(response: unknown) {
  global.fetch = jest.fn(async (url: string) => {
    if (String(url) === "/api/import") {
      return { ok: true, status: 200, json: async () => response };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }) as unknown as typeof fetch;
}

describe("SettingsTab", () => {
  it("renders the Settings heading", () => {
    render(<SettingsTab />);
    expect(
      screen.getByRole("heading", { name: /settings/i }),
    ).toBeInTheDocument();
  });

  it("renders all four theme options", () => {
    render(<SettingsTab />);
    expect(screen.getByRole("button", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /system/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retro/i })).toBeInTheDocument();
  });

  it("calls setTheme with the selected value when a button is clicked", () => {
    render(<SettingsTab />);
    fireEvent.click(screen.getByRole("button", { name: /dark/i }));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme with retro when Retro is clicked", () => {
    render(<SettingsTab />);
    fireEvent.click(screen.getByRole("button", { name: /retro/i }));
    expect(mockSetTheme).toHaveBeenCalledWith("retro");
  });

  it("renders the Change Password section", () => {
    render(<SettingsTab />);
    expect(screen.getByText("Change Password")).toBeInTheDocument();
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update password/i }),
    ).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    render(<SettingsTab />);
    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "old" },
    });
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "newpass" },
    });
    fireEvent.change(screen.getByLabelText(/confirm.*password/i), {
      target: { value: "different" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it("calls API and shows success on valid change", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    render(<SettingsTab />);
    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "old" },
    });
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "newpass" },
    });
    fireEvent.change(screen.getByLabelText(/confirm.*password/i), {
      target: { value: "newpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/change-password",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
  });
});

describe("import notifies the parent", () => {
  it("calls onImported after a successful import", async () => {
    const onImported = jest.fn();
    global.fetch = jest.fn(async (url: string | URL | Request) => {
      if (String(url) === "/api/import") {
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const { container } = render(<SettingsTab onImported={onImported} />);
    selectImportFile(container);

    await waitFor(() =>
      expect(screen.getByText("Yes, import")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Yes, import"));

    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1));
  });

  it("does not call onImported when the import fails", async () => {
    const onImported = jest.fn();
    global.fetch = jest.fn(async (url: string | URL | Request) => {
      if (String(url) === "/api/import") {
        return {
          ok: false,
          json: async () => ({ error: "Invalid import format" }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const { container } = render(<SettingsTab onImported={onImported} />);
    selectImportFile(container);

    await waitFor(() =>
      expect(screen.getByText("Yes, import")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Yes, import"));

    await waitFor(() =>
      expect(screen.getByText("Invalid import format")).toBeInTheDocument(),
    );
    expect(onImported).not.toHaveBeenCalled();
  });
});

describe("settings saves report failure", () => {
  function mockSettingsFetch(putResponse: Partial<Response>) {
    global.fetch = jest.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        if (init?.method === "PUT") return putResponse as Response;
        return {
          ok: true,
          json: async () => ({
            health_check_interval: "30s",
            search_shortcut: "mod+k",
          }),
        } as Response;
      },
    ) as unknown as typeof fetch;
  }

  // The write used to be fire-and-forget: the button highlighted, health polling
  // changed, the database did not, and the choice reverted on the next reload.
  it("shows an error and reverts the interval when the save is rejected", async () => {
    mockSettingsFetch({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    });

    render(<SettingsTab />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Never" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Never" }));

    await waitFor(() =>
      expect(screen.getByText("Unauthorized")).toBeInTheDocument(),
    );
  });

  it("reports a network failure", async () => {
    global.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
      if (init?.method === "PUT") throw new TypeError("Failed to fetch");
      return {
        ok: true,
        json: async () => ({
          health_check_interval: "30s",
          search_shortcut: "mod+k",
        }),
      } as Response;
    }) as unknown as typeof fetch;

    render(<SettingsTab />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Never" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Never" }));

    await waitFor(() =>
      expect(screen.getByText(/was not saved/i)).toBeInTheDocument(),
    );
  });

  it("says nothing when the save succeeds", async () => {
    mockSettingsFetch({ ok: true, json: async () => ({}) });

    render(<SettingsTab />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Never" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Never" }));

    // Wait for the PUT to actually settle before asserting the absence.
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    expect(screen.queryByText(/not saved/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/could not save/i)).not.toBeInTheDocument();
  });
});

describe("save errors appear next to the control that failed", () => {
  it("puts a shortcut failure under the shortcut control, not the interval one", async () => {
    global.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return {
          ok: false,
          json: async () => ({ error: "Invalid search_shortcut format" }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          health_check_interval: "30s",
          search_shortcut: "mod+k",
        }),
      } as Response;
    }) as unknown as typeof fetch;

    render(<SettingsTab />);
    await waitFor(() =>
      expect(screen.getByText("Open search")).toBeInTheDocument(),
    );

    // Record a new shortcut, which the server rejects.
    const recorder = screen.getByRole("button", { name: /⌘K/ });
    fireEvent.click(recorder);
    fireEvent.keyDown(recorder, { key: "j", metaKey: true });

    const message = await screen.findByText("Invalid search_shortcut format");
    // The shortcut section, not the interval section further down.
    expect(message.closest("section")?.textContent).toContain("Open search");
  });
});

describe("export reports failure", () => {
  // The click used to return silently on a non-ok response, so a signed-out or
  // erroring server looked exactly like a broken button.
  it("shows a message when the export request fails", async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (String(url) === "/api/export") {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;

    render(<SettingsTab />);
    fireEvent.click(screen.getByRole("button", { name: /export json/i }));

    await waitFor(() =>
      expect(screen.getByText(/export failed/i)).toBeInTheDocument(),
    );
  });

  it("shows a message when the export request cannot be sent", async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (String(url) === "/api/export") throw new Error("offline");
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;

    render(<SettingsTab />);
    fireEvent.click(screen.getByRole("button", { name: /export json/i }));

    await waitFor(() =>
      expect(screen.getByText(/export failed/i)).toBeInTheDocument(),
    );
  });
});

describe("a refused session leaves the panel", () => {
  it("sends the user to login instead of reporting an export failure", async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (String(url) === "/api/export") {
        return { ok: false, status: 401, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;

    render(<SettingsTab />);
    fireEvent.click(screen.getByRole("button", { name: /export json/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/login"));
    expect(screen.queryByText(/export failed/i)).not.toBeInTheDocument();
  });
});

describe("import warns about icons it could not restore", () => {
  it("says how many uploaded icons are missing", async () => {
    const { container } = render(<SettingsTab />);
    mockImportResponse({ ok: true, missingIcons: 2 });
    selectImportFile(container);

    await waitFor(() =>
      expect(screen.getByText("Yes, import")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Yes, import"));

    await waitFor(() =>
      expect(screen.getByText(/2 uploaded icons/i)).toBeInTheDocument(),
    );
  });

  it("stays quiet when every icon was found", async () => {
    const { container } = render(<SettingsTab />);
    mockImportResponse({ ok: true, missingIcons: 0 });
    selectImportFile(container);

    await waitFor(() =>
      expect(screen.getByText("Yes, import")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Yes, import"));

    await waitFor(() =>
      expect(screen.getByText("Imported successfully.")).toBeInTheDocument(),
    );
  });
});
