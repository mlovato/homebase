"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Reports whether a response came back with a live session, and sends the user
 * to the login page when it did not.
 *
 * A session cookie stays signed for 30 days, but the account behind it can be
 * deleted or demoted at any point. Every request after that is refused, so a
 * panel that only shows the error text leaves the user clicking controls that
 * can no longer save anything, with nothing saying to sign in again.
 */
export function useSessionGuard(): (res: Response) => boolean {
  const router = useRouter();
  return useCallback(
    (res: Response) => {
      if (res.status !== 401) return true;
      router.push("/admin/login");
      return false;
    },
    [router],
  );
}
