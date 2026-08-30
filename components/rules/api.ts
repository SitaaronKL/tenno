"use client";

import { makeFunctionReference } from "convex/server";
import { useAction, useMutation, useQuery } from "convex/react";
import type { RuleInput } from "@/lib/contracts/rule";

// convex/_generated does not exist yet, so we address the contract functions by name.
// Seam agent: swap these for `api.rules.*` and `api.profiles.*` once codegen has run.

export type Rule = RuleInput & {
  _id: string;
  enabled: boolean;
  source: "manual" | "ai";
  createdAt: number;
};

export type Profile = {
  email: string;
  phone?: string;
  phoneVerifiedAt?: number;
  timezone: string;
  digestHour: number;
};

const listRef = makeFunctionReference<"query", Record<string, never>, Rule[]>("rules:list");
const createRef = makeFunctionReference<"mutation", RuleInput, string>("rules:create");
const updateRef = makeFunctionReference<
  "mutation",
  { id: string; enabled?: boolean } & Partial<RuleInput>,
  null
>("rules:update");
const removeRef = makeFunctionReference<"mutation", { id: string }, null>("rules:remove");
const draftRef = makeFunctionReference<"action", { text: string }, RuleInput>(
  "agent/ruleBuilder:draft",
);
const meRef = makeFunctionReference<"query", Record<string, never>, Profile | null>("profiles:me");
const profileUpdateRef = makeFunctionReference<
  "mutation",
  { timezone?: string; digestHour?: number; phone?: string },
  null
>("profiles:update");

export const useRules = () => useQuery(listRef, {});
export const useCreateRule = () => useMutation(createRef);
export const useUpdateRule = () => useMutation(updateRef);
export const useRemoveRule = () => useMutation(removeRef);
export const useDraftRule = () => useAction(draftRef);
export const useProfile = () => useQuery(meRef, {});
export const useUpdateProfile = () => useMutation(profileUpdateRef);
