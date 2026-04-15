"use client";

import { useState } from "react";
import type { IconType } from "@/lib/types";
import { DASHBOARD_ICONS_CDN } from "@/lib/constants";

const SIZE = {
  sm: { img: "w-7 h-7", avatar: "w-7 h-7 text-xs" },
  lg: { img: "w-12 h-12", avatar: "w-12 h-12 text-xl" },
};

interface LinkIconProps {
  name: string;
  iconType: IconType;
  iconValue: string | null;
  size: "sm" | "lg";
  url?: string;
}

function getFaviconUrl(url: string): string | null {
  try {
    new URL(url);
    return `/api/favicon?url=${encodeURIComponent(url)}`;
  } catch {
    return null;
  }
}

function FaviconFallback({
  url,
  name,
  size,
}: {
  url?: string;
  name: string;
  size: "sm" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const faviconUrl = url ? getFaviconUrl(url) : null;

  if (!faviconUrl || failed) {
    return <Avatar name={name} size={size} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={faviconUrl}
      alt={name}
      className={`${SIZE[size].img} object-contain shrink-0`}
      onError={() => setFailed(true)}
    />
  );
}

function BuiltinIcon({
  slug,
  name,
  size,
  url,
}: {
  slug: string;
  name: string;
  size: "sm" | "lg";
  url?: string;
}) {
  const variants = [`${slug}.svg`, `${slug}-light.svg`, `${slug}-dark.svg`];
  const [attempt, setAttempt] = useState(0);

  if (attempt >= variants.length) {
    return <FaviconFallback url={url} name={name} size={size} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${DASHBOARD_ICONS_CDN}/${variants[attempt]}`}
      alt={name}
      className={`${SIZE[size].img} object-contain shrink-0`}
      onError={() => setAttempt((a) => a + 1)}
    />
  );
}

function Avatar({ name, size }: { name: string; size: "sm" | "lg" }) {
  return (
    <div
      className={`${SIZE[size].avatar} shrink-0 rounded-full retro:rounded-none bg-indigo-500 retro:bg-transparent retro:border retro:border-retro-green flex items-center justify-center font-bold text-white retro:text-retro-green select-none`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function LinkIcon({
  name,
  iconType,
  iconValue,
  size,
  url,
}: LinkIconProps) {
  const iconKey = `${iconType}:${iconValue}`;
  const [failed, setFailed] = useState({ key: iconKey, value: false });

  if (failed.key !== iconKey) {
    setFailed({ key: iconKey, value: false });
  }

  const isFailed = failed.value;

  if (iconType === "builtin" && iconValue) {
    return <BuiltinIcon slug={iconValue} name={name} size={size} url={url} />;
  }

  if ((iconType === "upload" || iconType === "url") && iconValue && !isFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconValue}
        alt={name}
        className={`${SIZE[size].img} object-contain shrink-0`}
        onError={() => setFailed({ key: iconKey, value: true })}
      />
    );
  }

  return <FaviconFallback url={url} name={name} size={size} />;
}
