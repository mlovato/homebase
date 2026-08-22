"use client";

import { useEffect } from "react";

/**
 * Closes an overlay on Escape while it is open.
 *
 * Every modal in the app needs this — `docs/manual-testing-plan.md` asks for it
 * — and hand-rolling the listener per component is how three of them ended up
 * dismissable only by mouse.
 */
export function useEscapeKey(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
}
