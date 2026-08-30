"use client";

import { useEffect, useState, type ReactNode } from "react";

// Convex hooks need a browser client, so anything reading them renders after mount.
export function ClientOnly({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? children : fallback}</>;
}
