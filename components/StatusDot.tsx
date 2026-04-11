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
}

export function StatusDot({ url }: StatusDotProps) {
  const status = useHealthStatus(url);
  return (
    <span
      role="status"
      aria-label={LABELS[status]}
      title={LABELS[status]}
      className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${COLORS[status]} ring-2 ring-white dark:ring-gray-800 retro:ring-retro-surface`}
    />
  );
}
