"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchModal } from "./SearchModal";
import { UserAvatar } from "./UserAvatar";
import type { SearchLink, SearchShortcut, User } from "@/lib/types";

interface DashboardHeaderProps {
  user: User | null;
  searchLinks: SearchLink[];
  shortcut: SearchShortcut;
}

export function DashboardHeader({
  user,
  searchLinks,
  shortcut,
}: DashboardHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="border-b border-gray-200 dark:border-gray-700 retro:border-retro-dim bg-white dark:bg-gray-800 retro:bg-retro-bg px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
        <h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="Homebase"
            className="w-10 h-10 object-contain"
          />
        </h1>
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 -mr-1 rounded-lg text-gray-500 dark:text-gray-400 retro:text-retro-dim hover:bg-gray-100 dark:hover:bg-gray-700 retro:hover:bg-transparent transition-colors"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <svg
              className="w-5 h-5"
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
          </button>
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 retro:text-retro-dim hover:text-indigo-600 dark:hover:text-indigo-400 retro:hover:text-retro-green transition-colors"
          >
            <UserAvatar
              avatar={user?.avatar ?? null}
              email={user?.email ?? "?"}
              size="header"
            />
            {user?.email ?? "Admin"}
          </Link>
        </div>
      </header>
      <SearchModal
        links={searchLinks}
        shortcut={shortcut}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
    </>
  );
}
