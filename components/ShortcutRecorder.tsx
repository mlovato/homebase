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
  const [recording, setRecording] = useState(false);

  function onKeyDown(e: React.KeyboardEvent) {
    e.preventDefault();
    if (e.key === "Escape") {
      setRecording(false);
      return;
    }
    if (MODIFIER_KEYS.has(e.key)) return;
    const mod = e.metaKey || e.ctrlKey;
    const shortcut = mod ? `mod+${e.key.toLowerCase()}` : e.key.toLowerCase();
    if (!isValidShortcut(shortcut)) return;
    onChange(shortcut);
    setRecording(false);
  }

  return (
    <button
      onClick={() => setRecording(true)}
      onKeyDown={recording ? onKeyDown : undefined}
      onBlur={() => setRecording(false)}
      className={`px-3 py-1.5 rounded-lg retro:rounded-none border-2 text-xs font-mono transition-colors min-w-[120px] text-center ${
        recording
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 retro:bg-transparent retro:border-retro-green retro:text-retro-green text-indigo-500 dark:text-indigo-400 animate-pulse"
          : "border-gray-200 dark:border-gray-600 retro:border-retro-dim hover:border-indigo-400 dark:hover:border-indigo-500 retro:hover:border-retro-green text-gray-600 dark:text-gray-300 retro:text-retro-green"
      }`}
    >
      {recording ? "Press shortcut…" : formatShortcut(value)}
    </button>
  );
}
