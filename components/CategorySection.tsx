"use client";

import { useState } from "react";
import type { CategoryWithLinks } from "@/lib/types";
import { LinkCard } from "./LinkCard";

const storageKey = (id: number) => `homebase:collapsed:${id}`;

interface CategorySectionProps {
  category: CategoryWithLinks;
  intervalMs: number | null;
}

export function CategorySection({
  category,
  intervalMs,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(storageKey(category.id)) === "true"
      : false,
  );

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    if (next) {
      localStorage.setItem(storageKey(category.id), "true");
    } else {
      localStorage.removeItem(storageKey(category.id));
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
