"use client";

import { useState, useEffect } from "react";

export interface IconResult {
  slug: string;
  name: string;
  url: string;
}

interface SearchState {
  /** The query these results belong to, so a late response can be discarded. */
  query: string;
  results: IconResult[];
  failed: boolean;
}

export function useIconSearch(query: string): {
  suggestions: IconResult[];
  failed: boolean;
} {
  const [state, setState] = useState<SearchState>({
    query: "",
    results: [],
    failed: false,
  });
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/icons?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setState({ query: trimmed, results: [], failed: true });
          return;
        }
        const data = await res.json();
        setState({
          query: trimmed,
          results: data.results ?? [],
          failed: false,
        });
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        // A failure must not leave the previous query's matches on screen.
        setState({ query: trimmed, results: [], failed: true });
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // Serve results only for the query being asked about. Without this a slow
  // response for "son" could land after "sonarr" and be auto-selected — aborting
  // on cleanup is not enough, since an already-resolved fetch still calls back.
  const isCurrent = state.query === trimmed;

  return {
    suggestions: isCurrent ? state.results : [],
    failed: isCurrent && state.failed,
  };
}
