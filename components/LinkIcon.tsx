"use client";

import type { IconType } from "@/lib/types";
import { dashboardIconSources } from "@/lib/dashboardIcons";
import { ImageChain } from "./ImageChain";

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
  urlAlt?: string | null;
}

function faviconUrls(url: string): string[] {
  try {
    const { origin } = new URL(url);
    // A bare trailing slash becomes an encoded "%2F" in the proxy query, which
    // breaks the request in some serving setups. A root URL has no path to lose,
    // so drop it. Deeper URLs keep their exact path: the proxy resolves relative
    // <link rel=icon> hrefs against the URL it is given.
    const normalized = url === `${origin}/` ? origin : url;
    return [
      `/api/favicon?url=${encodeURIComponent(normalized)}`,
      `${origin}/favicon.ico`,
    ];
  } catch {
    return [];
  }
}

function FaviconFallback({
  url,
  urlAlt,
  name,
  size,
}: {
  url?: string;
  urlAlt?: string | null;
  name: string;
  size: "sm" | "lg";
}) {
  const sources = [url, urlAlt]
    .filter((u): u is string => !!u)
    .flatMap(faviconUrls);

  return (
    <ImageChain
      sources={sources}
      alt={name}
      className={`${SIZE[size].img} object-contain shrink-0`}
      fallback={<Avatar name={name} size={size} />}
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
  urlAlt,
}: LinkIconProps) {
  const favicon = (
    <FaviconFallback url={url} urlAlt={urlAlt} name={name} size={size} />
  );
  if (!iconValue) return favicon;

  return (
    <ImageChain
      sources={
        iconType === "builtin" ? dashboardIconSources(iconValue) : [iconValue]
      }
      alt={name}
      className={`${SIZE[size].img} object-contain shrink-0`}
      fallback={favicon}
    />
  );
}
