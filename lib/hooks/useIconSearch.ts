"use client";

import { useState, useEffect } from "react";

export interface IconResult {
  slug: string;
  name: string;
  url: string;
}

export function useIconSearch(query: string): { suggestions: IconResult[] } {
  const [suggestions, setSuggestions] = useState<IconResult[]>([]);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/icons?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.results ?? []);
      } catch {
        // network errors are non-fatal
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [trimmed]);

  return { suggestions: trimmed.length < 2 ? [] : suggestions };
}
