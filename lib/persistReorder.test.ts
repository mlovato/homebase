/**
 * @jest-environment node
 */
import { persistReorder } from "./persistReorder";

function ok() {
  return Promise.resolve({ ok: true } as Response);
}

function failing(status: number, body?: unknown) {
  return Promise.resolve({
    ok: false,
    status,
    json: async () => body ?? {},
  } as Response);
}

describe("persistReorder", () => {
  let onError: jest.Mock;
  let resync: jest.Mock;

  beforeEach(() => {
    onError = jest.fn();
    resync = jest.fn(async () => {});
  });

  it("reports success without resyncing when every write lands", async () => {
    expect(await persistReorder([ok(), ok()], { onError, resync })).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    expect(resync).not.toHaveBeenCalled();
  });

  it("surfaces the server's message and resyncs when one write fails", async () => {
    const result = await persistReorder(
      [ok(), failing(404, { error: "Not found" })],
      { onError, resync },
    );

    expect(result).toBe(false);
    expect(onError).toHaveBeenCalledWith("Not found");
    expect(resync).toHaveBeenCalledTimes(1);
  });

  it("falls back to the status code when the body carries no message", async () => {
    await persistReorder([failing(500)], { onError, resync });

    expect(onError).toHaveBeenCalledWith("Reorder failed (500)");
  });

  it("reports a rejected request as a network error and resyncs", async () => {
    const result = await persistReorder(
      [Promise.reject(new Error("offline"))],
      { onError, resync },
    );

    expect(result).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      "Network error — please check your connection.",
    );
    expect(resync).toHaveBeenCalledTimes(1);
  });

  it("treats an empty batch as success", async () => {
    expect(await persistReorder([], { onError, resync })).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });
});
