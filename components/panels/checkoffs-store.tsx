"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Checkoffs } from "./checkoffs";

// The panels take their ticks from context, this is the one place that talks to Convex.
export function CheckoffsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? {} : "skip";
  const keys = useQuery(api.completions.list, args);
  const canSave = useQuery(api.completions.canSave, args);

  // The box flips on the click, the round trip only confirms it.
  const toggle = useMutation(api.completions.toggle).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.completions.list, {});
    if (current === undefined) return;
    store.setQuery(
      api.completions.list,
      {},
      current.includes(args.key)
        ? current.filter((key) => key !== args.key)
        : [...current, args.key],
    );
  });

  const done = useMemo(() => new Set(keys ?? []), [keys]);
  const onToggle = useCallback(
    (key: string, expiresAt: number) => {
      void toggle({ key, expiresAt });
    },
    [toggle],
  );

  return (
    <Checkoffs canSave={canSave === true} done={done} onToggle={onToggle}>
      {children}
    </Checkoffs>
  );
}
