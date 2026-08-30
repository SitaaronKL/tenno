"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const noop = () => () => {};

// Convex hooks need a browser client, so anything reading them renders after mount.
export function ClientOnly({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return <>{mounted ? children : fallback}</>;
}
