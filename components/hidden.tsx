"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useProfile, useUpdateProfile } from "@/components/rules/api";

const STORE = "voidwatch.hidden";
const EMPTY = "[]";

// A guest keeps the choice in the browser, so the switches work before there is an account.
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  // A second tab hiding a box should hide it here too.
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

function readLocal(): string {
  try {
    return window.localStorage.getItem(STORE) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeLocal(keys: string[]) {
  try {
    window.localStorage.setItem(STORE, JSON.stringify(keys));
  } catch {
    // A blocked store just means the choice does not survive the tab, never that it breaks.
  }
  for (const fn of listeners) fn();
}

function parse(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

const HiddenContext = createContext<ReadonlySet<string>>(new Set<string>());

// Panels read the set from here, so a test can hand them one without a Convex client.
export function useHidden(): ReadonlySet<string> {
  return useContext(HiddenContext);
}

export function HiddenSet({
  hidden,
  children,
}: {
  hidden: ReadonlySet<string>;
  children: ReactNode;
}) {
  return <HiddenContext.Provider value={hidden}>{children}</HiddenContext.Provider>;
}

// The profile is the truth once there is one, the browser holds the choice until then.
export function useHiddenPrefs(): {
  hidden: ReadonlySet<string>;
  setHidden: (key: string, hide: boolean) => void;
} {
  const profile = useProfile();
  const update = useUpdateProfile();
  const local = useSyncExternalStore(subscribe, readLocal, () => EMPTY);

  // Both sides read as one string, so the set only changes when the choice does.
  const raw = profile ? JSON.stringify(profile.hidden ?? []) : local;
  const hidden = useMemo(() => new Set(parse(raw)), [raw]);

  const setHidden = useCallback(
    (key: string, hide: boolean) => {
      const next = new Set(hidden);
      if (hide) next.add(key);
      else next.delete(key);
      const keys = [...next];
      if (profile) void update({ hidden: keys });
      else writeLocal(keys);
    },
    [hidden, profile, update],
  );

  return { hidden, setHidden };
}

// One provider over the whole world state page, so every box, board and tile reads one set.
export function HiddenProvider({ children }: { children: ReactNode }) {
  const { hidden } = useHiddenPrefs();
  return <HiddenSet hidden={hidden}>{children}</HiddenSet>;
}
