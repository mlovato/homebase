"use client";

import { useState } from "react";
import type { SearchShortcut } from "@/lib/types";
import { formatShortcut, isValidShortcut } from "@/lib/types";

const MODIFIER_KEYS = new Set(["Meta", "Control", "Alt", "Shift"]);

interface ShortcutRecorderProps {
  value: SearchShortcut;
  onChange: (value: SearchShortcut) => void;
}

export function ShortcutRecorder({ value, onChange }: ShortcutRecorderProps) {
  // "rejected" exists so an unsupported key says so instead of leaving the
  // button pulsing "Press shortcut…" with no way to tell it from a dead control.
  const [mode, setMode] = useState<"idle" | "recording" | "rejected">("idle");

  function onKeyDown(e: React.KeyboardEvent) {
    e.preventDefault();
    if (e.key === "Escape") {
      setMode("idle");
      return;
    }
    if (MODIFIER_KEYS.has(e.key)) return;

    const key = e.key.toLowerCase();

    // The stored format is `mod+<char>`, with nowhere to put Shift or Alt.
    // Shift+1 already produces "!", which round-trips fine — but Shift+F
    // produces "F", and lowercasing it would silently bind Cmd+F instead,
    // stealing find-in-page from the browser.
    if (e.altKey || (e.shiftKey && /^[a-z0-9]$/.test(key))) {
      setMode("rejected");
      return;
    }

    const mod = e.metaKey || e.ctrlKey;
    const shortcut = mod ? `mod+${key}` : key;
    if (!isValidShortcut(shortcut)) {
      setMode("rejected");
      return;
    }

    onChange(shortcut);
    setMode("idle");
  }

  return (
    <button
      onClick={() => setMode("recording")}
      onKeyDown={mode === "idle" ? undefined : onKeyDown}
      onBlur={() => setMode("idle")}
      className={`px-3 py-1.5 rounded-lg retro:rounded-none border-2 text-xs font-mono transition-colors min-w-[120px] text-center ${
        mode !== "idle"
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 retro:bg-transparent retro:border-retro-green retro:text-retro-green text-indigo-500 dark:text-indigo-400 animate-pulse"
          : "border-gray-200 dark:border-gray-600 retro:border-retro-dim hover:border-indigo-400 dark:hover:border-indigo-500 retro:hover:border-retro-green text-gray-600 dark:text-gray-300 retro:text-retro-green"
      }`}
    >
      {mode === "idle"
        ? formatShortcut(value)
        : mode === "rejected"
          ? "Unsupported key"
          : "Press shortcut…"}
    </button>
  );
}
