"use client";

import { useEffect } from "react";

const defaultRestore = () => window.location.reload();

interface Props {
  onRestore?: () => void;
}

/**
 * Placed in the root layout so it is never unmounted across navigations.
 * When the browser restores a page from bfcache the React tree may be in a
 * stale/unmounted state, so we force a fresh load.
 */
export function BfcacheHandler({ onRestore = defaultRestore }: Props = {}) {
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) onRestore();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [onRestore]);
  return null;
}
