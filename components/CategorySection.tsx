"use client";

import { useEffect, useState } from "react";
import type { CategoryWithLinks } from "@/lib/types";
import { LinkCard } from "./LinkCard";

// Scoped to the account: two users sharing a browser both have a category id 1,
// so an unscoped key let one user's collapsed section collapse an unrelated
// category for the other.
const storageKey = (userId: number, categoryId: number) =>
  `homebase:collapsed:${userId}:${categoryId}`;

interface CategorySectionProps {
  category: CategoryWithLinks;
  intervalMs: number | null;
  userId: number;
}

export function CategorySection({
  category,
  intervalMs,
  userId,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Read after mount, not in the initializer. The server always renders
  // expanded, so reading storage during the first client render makes the two
  // trees disagree, and React answers that mismatch by discarding the whole
  // server-rendered document and re-rendering it on the client.
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey(userId, category.id)) === "true") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a persisted preference after mount
        setCollapsed(true);
      }
    } catch {
      // Site data blocked: the section stays expanded.
    }
  }, [userId, category.id]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      if (next) {
        localStorage.setItem(storageKey(userId, category.id), "true");
      } else {
        localStorage.removeItem(storageKey(userId, category.id));
      }
    } catch {
      // Site data blocked: the choice just is not remembered.
    }
  }

  return (
    <section className="mb-6 md:mb-8">
      <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 retro:text-retro-dim uppercase tracking-wider mb-4 px-1">
        <button
          onClick={toggle}
          aria-expanded={!collapsed}
          className="flex items-center gap-2 w-full text-left"
        >
          {category.name}
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </h2>
      {!collapsed && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
          {category.links.map((link) => (
            <LinkCard key={link.id} link={link} intervalMs={intervalMs} />
          ))}
        </div>
      )}
    </section>
  );
}
