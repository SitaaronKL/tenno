"use client";

import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { RuleInput } from "@/lib/contracts/rule";

export type Rule = RuleInput & {
  _id: Id<"rules">;
  enabled: boolean;
  source: "manual" | "ai";
  createdAt: number;
};

export type Profile = {
  email: string;
  phone: string | null;
  phoneVerified: boolean;
  timezone: string;
  digestHour: number;
  // What this user turned off on the world state page, see lib/contracts/preferences.ts.
  hidden: string[];
};

export const useRules = () => {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.rules.list, isAuthenticated ? {} : "skip") as Rule[] | undefined;
};

export const useCreateRule = () => useMutation(api.rules.create);
export const useUpdateRule = () => useMutation(api.rules.update);
export const useRemoveRule = () => useMutation(api.rules.remove);
export const useDraftRule = () => useAction(api.agent.ruleBuilder.draft);

// me() throws when signed out, so skip the query until auth settles and report null.
export function useProfile(): Profile | null | undefined {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  if (isLoading) return undefined;
  if (!isAuthenticated) return null;
  if (me === undefined) return undefined;
  return {
    email: me.profile.email,
    phone: me.profile.phone,
    phoneVerified: me.profile.phoneVerified,
    timezone: me.profile.timezone,
    digestHour: me.profile.digestHour,
    hidden: me.profile.hidden,
  };
}

export const useUpdateProfile = () => useMutation(api.profiles.update);
