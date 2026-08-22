interface ReorderCallbacks {
  onError: (message: string) => void;
  /** Re-read the server's order, because the optimistic one is now wrong. */
  resync: () => Promise<void>;
}

/**
 * Awaits a batch of reorder writes and reports any failure.
 *
 * Drag-and-drop updates the list optimistically and then saves one request per
 * moved item. Without inspecting the responses a failed save leaves the new
 * order on screen and the old order in the database, so the next page load
 * silently snaps everything back.
 */
export async function persistReorder(
  requests: Promise<Response>[],
  { onError, resync }: ReorderCallbacks,
): Promise<boolean> {
  let message: string | null = null;
  try {
    const responses = await Promise.all(requests);
    const failed = responses.find((res) => !res.ok);
    if (failed) {
      const body = await failed.json().catch(() => ({}));
      message = body.error ?? `Reorder failed (${failed.status})`;
    }
  } catch {
    message = "Network error — please check your connection.";
  }

  if (message === null) return true;
  onError(message);
  await resync();
  return false;
}
