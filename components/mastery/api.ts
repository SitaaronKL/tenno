"use client";

import { useAction, useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { MasteryRow } from "./types";

export type MasteryProgress = {
  rows: MasteryRow[];
  total: number;
  mastered: number;
  percent: number;
  profile: {
    displayName: string;
    masteryRank: number;
    nodesCompleted: number;
    fetchedAt: number;
  } | null;
};

export function useMasteryProgress(playerId: string | null): MasteryProgress | undefined {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.mastery.progress, isAuthenticated ? { playerId } : "skip") as
    | MasteryProgress
    | undefined;
}

export const useFetchProfile = () => useAction(api.profileSync.fetchProfile);
