"use client";

import type { Link } from "@/lib/types";
import { StatusDot } from "./StatusDot";
import { LinkIcon } from "./LinkIcon";

interface LinkCardProps {
  link: Link;
  tooltip?: boolean;
  intervalMs?: number | null;
}

export function LinkCard({ link, tooltip = true, intervalMs }: LinkCardProps) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip ? link.name : undefined}
      className="relative flex flex-col items-center justify-center gap-2 md:gap-3 p-4 md:p-5 rounded-2xl bg-white dark:bg-gray-800 retro:bg-retro-surface retro:rounded-none retro:border retro:border-retro-dim retro:shadow-none retro:hover:border-retro-green shadow hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group h-28 md:h-32 w-full"
    >
      {intervalMs != null && <StatusDot url={link.url} />}
      <LinkIcon
        name={link.name}
        iconType={link.icon_type}
        iconValue={link.icon_value}
        size="lg"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 retro:text-retro-green text-center leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 retro:group-hover:text-retro-green w-full truncate px-1">
        {link.name}
      </span>
    </a>
  );
}
