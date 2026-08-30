"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { DropSource } from "@/convex/lib/resources";

export type Goal = {
  _id: Id<"goals">;
  itemName: string;
  wantedCount: number;
  haveCount: number;
  fromBuildId?: string;
  createdAt: number;
  sources: DropSource[];
};

export type ItemName = { name: string; uniqueName: string; buildable: boolean };

export const useGoals = () => {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.list, isAuthenticated ? {} : "skip") as Goal[] | undefined;
};

// The whole name list once, so the search box filters in the browser and not per keystroke.
export const useItemNames = () => {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.goals.itemNames, isAuthenticated ? {} : "skip") as ItemName[] | undefined;
};

export const useAddGoal = () => useMutation(api.goals.add);
export const useSetHave = () => useMutation(api.goals.setHave);
export const useRemoveGoal = () => useMutation(api.goals.remove);
export const useAddFromItem = () => useMutation(api.goals.addFromItem);
