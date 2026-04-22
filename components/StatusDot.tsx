"use client";

import { useHealthStatus } from "./HealthCheckContext";

const COLORS = {
  up: "bg-green-400",
  down: "bg-red-400",
  unknown: "bg-gray-400",
} as const;

const LABELS = {
  up: "online",
  down: "offline",
  unknown: "checking",
} as const;

interface StatusDotProps {
  url: string;
  showAlt?: boolean;
}

export function StatusDot({ url, showAlt = false }: StatusDotProps) {
  const status = useHealthStatus(url);
  const dot = (
    <span
      role="status"
      aria-label={LABELS[status]}
      title={LABELS[status]}
      className={`w-2.5 h-2.5 rounded-full ${COLORS[status]} ring-2 ring-white dark:ring-gray-800 retro:ring-retro-surface`}
    />
  );

  if (!showAlt) {
    return <span className="absolute top-2 right-2">{dot}</span>;
  }

  return (
    <span className="absolute top-2 right-2 flex items-center gap-1">
      <span
        aria-label="using alternative URL"
        className="text-[7px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 retro:text-retro-dim leading-none"
      >
        alt
      </span>
      {dot}
    </span>
  );
}
