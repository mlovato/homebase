"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useContext,
} from "react";
import type { SearchLink, SearchShortcut } from "@/lib/types";
import { parseShortcut } from "@/lib/types";
import { LinkIcon } from "./LinkIcon";
import { HealthCheckContext } from "./HealthCheckContext";

interface SearchModalProps {
  links: SearchLink[];
  shortcut: SearchShortcut;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function matchesShortcut(e: KeyboardEvent, shortcut: SearchShortcut): boolean {
  const { mod, key } = parseShortcut(shortcut);
  return (
    (e.metaKey || e.ctrlKey) === mod &&
    e.key.toLowerCase() === key.toLowerCase()
  );
}

export function SearchModal({
  links,
  shortcut,
  open: externalOpen,
  onOpenChange,
}: SearchModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const setOpen = useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        setInternalOpen(value);
      }
    },
    [onOpenChange],
  );
  const statusMap = useContext(HealthCheckContext);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function resolveUrl(link: SearchLink): string {
    return statusMap[link.url] === "down" && link.url_alt != null
      ? link.url_alt
      : link.url;
  }

  const filtered = useMemo(
    () =>
      query.trim() === ""
        ? links
        : links.filter((l) =>
            l.name.toLowerCase().includes(query.toLowerCase()),
          ),
    [query, links],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, [setOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (matchesShortcut(e, shortcut)) {
        e.preventDefault();
        setOpen(!openRef.current);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape") {
        close();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, setOpen, shortcut]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const count = Math.max(filtered.length, 1);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + count) % count);
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      window.open(
        resolveUrl(filtered[selectedIndex]),
        "_blank",
        "noopener,noreferrer",
      );
      close();
    }
  }

  function onQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setSelectedIndex(0);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] md:pt-[15vh] bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search links"
        className="w-full max-w-lg mx-4 md:mx-0 bg-white dark:bg-gray-800 retro:bg-retro-bg retro:border retro:border-retro-green rounded-2xl retro:rounded-none shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 retro:border-retro-dim">
          <svg
            className="w-4 h-4 shrink-0 text-gray-400 retro:text-retro-dim"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={true}
            aria-autocomplete="list"
            aria-controls="search-results"
            type="text"
            placeholder="Search links…"
            value={query}
            onChange={onQueryChange}
            onKeyDown={onInputKeyDown}
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 retro:text-retro-green placeholder-gray-400 retro:placeholder-retro-dim"
          />
          <kbd className="text-xs text-gray-400 retro:text-retro-dim border border-gray-200 dark:border-gray-600 retro:border-retro-dim rounded px-1.5 py-0.5 font-mono">
            esc
          </kbd>
        </div>

        <ul
          id="search-results"
          role="listbox"
          className="max-h-80 overflow-y-auto py-2"
        >
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-sm text-center text-gray-400 retro:text-retro-dim">
              No results
            </li>
          )}
          {filtered.map((link, i) => (
            <li key={link.id} role="none">
              <a
                role="option"
                aria-selected={i === selectedIndex}
                href={resolveUrl(link)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  i === selectedIndex
                    ? "bg-indigo-50 dark:bg-indigo-900/30 retro:bg-transparent retro:text-retro-green text-indigo-600 dark:text-indigo-400"
                    : "text-gray-700 dark:text-gray-300 retro:text-retro-dim hover:bg-gray-50 dark:hover:bg-gray-700 retro:hover:bg-transparent"
                }`}
              >
                <LinkIcon
                  name={link.name}
                  iconType={link.icon_type}
                  iconValue={link.icon_value}
                  size="sm"
                  url={link.url}
                />
                <span className="flex-1 truncate font-medium">{link.name}</span>
                <span className="text-xs text-gray-400 retro:text-retro-dim truncate max-w-[100px] sm:max-w-[160px] hidden sm:inline">
                  {link.url}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
