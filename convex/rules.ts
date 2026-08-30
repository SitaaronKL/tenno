import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { mutation, query, internalMutation } from "./_generated/server";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { matches } from "./matcher";
import { RuleInput, type RuleFilter } from "../lib/contracts/rule";
import { vRuleFilter } from "./lib/validators";

// Cap the noise a single rule storm can cause per user.
// Cast because codegen without a deployment types components loosely.
const rateLimiterComponent = components.rateLimiter as unknown as ConstructorParameters<typeof RateLimiter>[0];
const rateLimiter = new RateLimiter(rateLimiterComponent, {
  notifications: { kind: "fixed window", rate: 30, period: HOUR },
});

const ruleInputArgs = {
  name: v.string(),
  filter: vRuleFilter,
  mode: v.union(v.literal("instant"), v.literal("digest")),
  channels: v.array(v.union(v.literal("email"), v.literal("imessage"))),
};

export const list = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    return await ctx.db
      .query("rules")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: ruleInputArgs,
  returns: v.id("rules"),
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const input = RuleInput.parse(args);
    return await ctx.db.insert("rules", {
      userId,
      name: input.name,
      filter: input.filter,
      mode: input.mode,
      channels: input.channels,
      enabled: true,
      source: "manual",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("rules"),
    name: v.optional(v.string()),
    filter: v.optional(vRuleFilter),
    mode: v.optional(v.union(v.literal("instant"), v.literal("digest"))),
    channels: v.optional(v.array(v.union(v.literal("email"), v.literal("imessage")))),
    enabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...patch }) => {
    const { userId } = await requireUser(ctx);
    const rule = await ctx.db.get("rules", id);
    if (!rule || rule.userId !== userId) throw new Error("Rule not found");
    // Validate the merged rule so a partial edit can never store an invalid filter.
    const merged = RuleInput.parse({
      name: patch.name ?? rule.name,
      filter: patch.filter ?? rule.filter,
      mode: patch.mode ?? rule.mode,
      channels: patch.channels ?? rule.channels,
    });
    await ctx.db.patch("rules", id, {
      ...merged,
      enabled: patch.enabled ?? rule.enabled,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("rules") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const { userId } = await requireUser(ctx);
    const rule = await ctx.db.get("rules", id);
    if (!rule || rule.userId !== userId) throw new Error("Rule not found");
    await ctx.db.delete("rules", id);
    return null;
  },
});

export const evaluate = internalMutation({
  args: { eventIds: v.array(v.id("worldEvents")) },
  returns: v.null(),
  handler: async (ctx, { eventIds }) => {
    for (const eventId of eventIds) {
      const event = await ctx.db.get("worldEvents", eventId);
      if (!event) continue;
      const rules = await ctx.db
        .query("rules")
        .withIndex("by_kind", (q) => q.eq("filter.kind", event.kind as RuleFilter["kind"]).eq("enabled", true))
        .collect();

      for (const rule of rules as Doc<"rules">[]) {
        if (!matches(rule.filter as RuleFilter, { kind: event.kind, payload: event.payload })) continue;

        const already = await ctx.db
          .query("notifications")
          .withIndex("by_rule_event", (q) => q.eq("ruleId", rule._id).eq("eventId", eventId))
          .first();
        if (already) continue;

        const { ok } = await rateLimiter.limit(ctx, "notifications", { key: rule.userId });
        if (!ok) continue;

        for (const channel of rule.channels) {
          const notificationId: Id<"notifications"> = await ctx.db.insert("notifications", {
            userId: rule.userId,
            ruleId: rule._id,
            eventId,
            channel,
            status: "pending",
            createdAt: Date.now(),
          });
          if (rule.mode === "instant") {
            await ctx.scheduler.runAfter(0, internal.notify.send, { notificationId });
          }
        }
      }
    }
    return null;
  },
});
