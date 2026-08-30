"use client";

import { useMemo } from "react";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { MasteryKind, MasteryRow } from "./types";

type Item = {
  uniqueName: string;
  name: string;
  kind: MasteryKind;
  masteryReq: number;
  masteryXp: number;
};

export type MasteryProgress = {
  rows: MasteryRow[];
  total: number;
  mastered: number;
  percent: number;
  playerId: string | null;
  profile: {
    displayName: string;
    masteryRank: number;
    nodesCompleted: number;
    fetchedAt: number;
  } | null;
};

// Two queries, not one: the roster only changes on a game data import, the player's xp changes on
// every sync. Joining them here keeps a sync from re-reading the whole items table.
export function useMasteryProgress(): MasteryProgress | undefined {
  const { isAuthenticated } = useConvexAuth();
  const items = useQuery(api.mastery.items, isAuthenticated ? {} : "skip") as Item[] | undefined;
  const progress = useQuery(api.mastery.progress, isAuthenticated ? {} : "skip");

  return useMemo(() => {
    if (items === undefined || progress === undefined) return undefined;
    const xp = new Map(progress.xpByItem.map((entry) => [entry.uniqueName, entry.xp]));
    const rows: MasteryRow[] = items.map((item) => ({
      ...item,
      // Mastered means ranked to the cap, which is exactly the item's full mastery xp.
      mastered: (xp.get(item.uniqueName) ?? 0) >= item.masteryXp,
    }));
    const mastered = rows.filter((row) => row.mastered).length;
    return {
      rows,
      total: rows.length,
      mastered,
      percent: rows.length === 0 ? 0 : Math.round((mastered / rows.length) * 100),
      playerId: progress.playerId,
      profile: progress.profile,
    };
  }, [items, progress]);
}

export const useFetchProfile = () => useAction(api.profileSync.fetchProfile);
