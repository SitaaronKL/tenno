"use client";

import { useEffect, useState } from "react";

// One interval per component tree keeps every countdown on the same tick.
let subscribers = new Set<(t: number) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(fn: (t: number) => void) {
  subscribers.add(fn);
  if (!timer) {
    timer = setInterval(() => {
      const t = Date.now();
      subscribers.forEach((s) => s(t));
    }, 1000);
  }
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => subscribe(setNow), []);
  return now;
}
