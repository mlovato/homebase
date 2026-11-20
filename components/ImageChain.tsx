"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

interface ImageChainProps {
  /** Tried in order; the first one that loads is shown. */
  sources: string[];
  alt: string;
  className: string;
  /** Rendered once every source has failed to load. */
  fallback: ReactNode;
}

const subscribeToNothing = () => () => {};

/**
 * False on the server and while hydrating, true from then on. A server-
 * rendered <img> starts loading before React hydrates, so a fast 404 fired its
 * error event before anything listened for it: the chain never moved on, and
 * the tile stayed blank.
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export function ImageChain({
  sources,
  alt,
  className,
  fallback,
}: ImageChainProps) {
  const hydrated = useIsHydrated();
  const key = sources.join("|");
  const [failures, setFailures] = useState({ key, count: 0 });
  // Changed sources start again from the top rather than inheriting the
  // exhausted chain of the ones they replaced.
  const index = failures.key === key ? failures.count : 0;

  if (index >= sources.length) return <>{fallback}</>;

  // Holds the image's place until React is listening for its events.
  if (!hydrated) return <span className={className} aria-hidden="true" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[index]}
      alt={alt}
      className={className}
      onError={() => setFailures({ key, count: index + 1 })}
    />
  );
}
