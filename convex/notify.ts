import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

type Delivery = {
  notificationId: Id<"notifications">;
  userId: string;
  channel: "email" | "imessage";
  ruleName: string;
  kind: string;
  line: string;
  email: string;
  phone: string | null;
  photonUserId: string | null;
};

// One line per match, used by both the instant message and the digest.
function describe(rule: Doc<"rules"> | null, event: Doc<"worldEvents"> | null): string {
  const payload = (event?.payload ?? {}) as Record<string, unknown>;
  const node = typeof payload.node === "string" ? payload.node : "";
  const where = node ? ` at ${node}` : "";
  return `${rule?.name ?? "Rule"}: ${event?.kind ?? "event"}${where}`;
}

export const loadDelivery = internalQuery({
  args: { notificationId: v.id("notifications") },
  returns: v.any(),
  handler: async (ctx, { notificationId }): Promise<Delivery | null> => {
    const notification = await ctx.db.get("notifications", notificationId);
    if (!notification || notification.status !== "pending") return null;
    const rule = await ctx.db.get("rules", notification.ruleId);
    const event = await ctx.db.get("worldEvents", notification.eventId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", notification.userId))
      .first();
    if (!profile) return null;
    return {
      notificationId,
      userId: notification.userId,
      channel: notification.channel,
      ruleName: rule?.name ?? "Rule",
      kind: event?.kind ?? "event",
      line: describe(rule, event),
      email: profile.email,
      phone: profile.phone ?? null,
      photonUserId: profile.photonUserId ?? null,
    };
  },
});

export const pendingDigest = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<Delivery[]> => {
    const pending = await ctx.db
      .query("notifications")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(1000);
    const out: Delivery[] = [];
    for (const notification of pending) {
      const rule = await ctx.db.get("rules", notification.ruleId);
      if (!rule || rule.mode !== "digest") continue;
      const event = await ctx.db.get("worldEvents", notification.eventId);
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", notification.userId))
        .first();
      if (!profile) continue;
      out.push({
        notificationId: notification._id,
        userId: notification.userId,
        channel: notification.channel,
        ruleName: rule.name,
        kind: event?.kind ?? "event",
        line: describe(rule, event),
        email: profile.email,
        phone: profile.phone ?? null,
        photonUserId: profile.photonUserId ?? null,
      });
    }
    return out;
  },
});

export const mark = internalMutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("skipped")),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { notificationIds, status, error }) => {
    for (const id of notificationIds) {
      await ctx.db.patch("notifications", id, {
        status,
        error,
        sentAt: status === "sent" ? Date.now() : undefined,
      });
    }
    return null;
  },
});

// Where an email links back to, the deployment sets SITE_URL.
function siteUrl(): string {
  return process.env.SITE_URL ?? "https://voidwatch.app";
}

async function dispatch(
  ctx: { runAction: (ref: any, args: any) => Promise<unknown> },
  delivery: Delivery,
  subject: string,
  body: string,
  react: unknown,
): Promise<void> {
  if (delivery.channel === "email") {
    // A React element cannot cross a Convex function boundary, so the caller names the template.
    await ctx.runAction(internal.email.sendEmail, { to: delivery.email, subject, react });
    return;
  }
  if (!delivery.photonUserId && !delivery.phone) throw new Error("No phone on file");
  await ctx.runAction(internal.photon.sendText, {
    photonUserId: delivery.photonUserId ?? undefined,
    phone: delivery.phone ?? undefined,
    text: body,
  });
}

export const send = internalAction({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, { notificationId }) => {
    const delivery = (await ctx.runQuery(internal.notify.loadDelivery, { notificationId })) as Delivery | null;
    if (!delivery) return null;
    try {
      await dispatch(ctx, delivery, `Voidwatch: ${delivery.ruleName}`, delivery.line, {
        template: "RuleMatch",
        props: {
          ruleName: delivery.ruleName,
          kind: delivery.kind,
          title: delivery.line,
          url: siteUrl(),
        },
      });
      await ctx.runMutation(internal.notify.mark, { notificationIds: [notificationId], status: "sent" });
    } catch (e) {
      await ctx.runMutation(internal.notify.mark, {
        notificationIds: [notificationId],
        status: "failed",
        error: e instanceof Error ? e.message : String(e),
      });
    }
    return null;
  },
});

export const digest = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const pending = (await ctx.runQuery(internal.notify.pendingDigest, {})) as Delivery[];
    const groups = new Map<string, Delivery[]>();
    for (const delivery of pending) {
      const key = `${delivery.userId}:${delivery.channel}`;
      const group = groups.get(key) ?? [];
      group.push(delivery);
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      const ids = group.map((d) => d.notificationId);
      const body = group.map((d) => d.line).join("\n");
      try {
        await dispatch(ctx, group[0], `Voidwatch digest: ${group.length} matches`, body, {
          template: "Digest",
          props: {
            items: group.map((d) => ({ ruleName: d.ruleName, title: d.line })),
            url: siteUrl(),
          },
        });
        await ctx.runMutation(internal.notify.mark, { notificationIds: ids, status: "sent" });
      } catch (e) {
        await ctx.runMutation(internal.notify.mark, {
          notificationIds: ids,
          status: "failed",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return null;
  },
});
