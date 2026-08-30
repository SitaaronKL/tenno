import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// The email templates the notifier can name, mirrors vReact in convex/email.ts.
type EmailBody =
  | {
      template: "RuleMatch";
      props: { ruleName: string; kind: string; title: string; detail?: string; expiresAt?: string; url: string };
    }
  | {
      template: "Digest";
      props: { items: { ruleName: string; title: string; detail?: string }[]; url: string };
    };

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
  phoneVerified: boolean;
  attempts: number;
  expiresAtText?: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// What actually matched, per kind, so the message says more than "fissure".
function summarize(event: Doc<"worldEvents"> | null): string {
  const p = (event?.payload ?? {}) as Record<string, unknown>;
  const node = text(p.node);
  const at = node ? ` at ${node}` : "";
  switch (event?.kind) {
    case "fissure":
      return `${text(p.tier)} ${text(p.missionType)}${p.steelPath ? " (Steel Path)" : ""}${at}`.trim();
    case "alert":
      return `Alert: ${text(p.missionType)}${at}`;
    case "invasion":
      return `Invasion${at}: ${text(p.description)}`;
    case "sortie":
      return `Sortie: ${text(p.boss)}`;
    case "archonHunt":
      return `Archon Hunt: ${text(p.boss)}`;
    case "baro":
      return `Baro Ki'Teer has arrived at ${text(p.location)}`;
    case "nightwave":
      return `Nightwave season ${String(p.season ?? "")}, new acts are up`;
    case "cycle":
      return `${text(p.world)} is ${text(p.state)}`;
    default:
      return event?.kind ?? "event";
  }
}

// One line per match, used by both the instant message and the digest.
function describe(rule: Doc<"rules"> | null, event: Doc<"worldEvents"> | null): string {
  return `${rule?.name ?? "Rule"}: ${summarize(event)}`;
}

// The user reads times in their own clock, not in UTC.
function expiryText(event: Doc<"worldEvents"> | null, timezone: string): string | undefined {
  if (!event?.expiresAt) return undefined;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    }).format(new Date(event.expiresAt));
  } catch {
    return new Date(event.expiresAt).toISOString();
  }
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
    // A user who never opened settings has no profile row, the account email still works.
    const user = await ctx.db.get(notification.userId);
    return {
      notificationId,
      userId: notification.userId,
      channel: notification.channel,
      ruleName: rule?.name ?? "Rule",
      kind: event?.kind ?? "event",
      line: describe(rule, event),
      expiresAtText: expiryText(event, profile?.timezone ?? "UTC"),
      email: profile?.email || user?.email || "",
      phone: profile?.phone ?? null,
      photonUserId: profile?.photonUserId ?? null,
      phoneVerified: profile?.phoneVerifiedAt !== undefined,
      attempts: notification.attempts ?? 0,
    };
  },
});

// The hour the user is living in, so a digest lands when they asked for it.
export function localHour(timezone: string, at: number): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(
      new Date(at),
    );
    return Number(parts) % 24;
  } catch {
    return new Date(at).getUTCHours();
  }
}

// One key per local hour, so a rerun of the cron cannot send the same digest twice.
export function localHourKey(timezone: string, at: number): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).format(new Date(at));
  } catch {
    return new Date(at).toISOString().slice(0, 13);
  }
}

// One page of profiles, so the digest never depends on a single unbounded read.
export const dueUsers = internalQuery({
  args: { now: v.number(), cursor: v.union(v.string(), v.null()) },
  returns: v.object({
    userIds: v.array(v.id("users")),
    cursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { now, cursor }) => {
    const page = await ctx.db.query("profiles").paginate({ cursor, numItems: 100 });
    const userIds = page.page
      .filter((profile) => localHour(profile.timezone, now) === profile.digestHour)
      .filter(
        (profile) =>
          profile.lastDigestAt === undefined ||
          localHourKey(profile.timezone, profile.lastDigestAt) !== localHourKey(profile.timezone, now),
      )
      .map((profile) => profile.userId);
    return { userIds, cursor: page.continueCursor, isDone: page.isDone };
  },
});

// Digest rows for one user, found through by_user_status so a busy neighbour cannot starve them.
export const pendingDigestFor = internalQuery({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, { userId }): Promise<Delivery[]> => {
    const out: Delivery[] = [];
    let cursor: string | null = null;
    let isDone = false;
    while (!isDone && out.length < 200) {
      const page = await ctx.db
        .query("notifications")
        .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "pending"))
        .paginate({ cursor, numItems: 100 });
      cursor = page.continueCursor;
      isDone = page.isDone;
      for (const notification of page.page) {
        if (notification.mode !== "digest") continue;
        const rule = await ctx.db.get("rules", notification.ruleId);
        const event = await ctx.db.get("worldEvents", notification.eventId);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first();
        const user = await ctx.db.get(userId);
        out.push({
          notificationId: notification._id,
          userId,
          channel: notification.channel,
          ruleName: rule?.name ?? "Rule",
          kind: event?.kind ?? "event",
          line: describe(rule, event),
          expiresAtText: expiryText(event, profile?.timezone ?? "UTC"),
          email: profile?.email || user?.email || "",
          phone: profile?.phone ?? null,
          photonUserId: profile?.photonUserId ?? null,
          phoneVerified: profile?.phoneVerifiedAt !== undefined,
          attempts: notification.attempts ?? 0,
        });
      }
    }
    return out;
  },
});

export const recordDigest = internalMutation({
  args: { userId: v.id("users"), at: v.number() },
  returns: v.null(),
  handler: async (ctx, { userId, at }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (profile) await ctx.db.patch(profile._id, { lastDigestAt: at });
    return null;
  },
});

const MAX_ATTEMPTS = 3;

// A provider blip should not lose a match, so the send is queued again with a backoff.
export const retryLater = internalMutation({
  args: { notificationId: v.id("notifications"), attempts: v.number(), error: v.string() },
  returns: v.null(),
  handler: async (ctx, { notificationId, attempts, error }) => {
    const delay = 60_000 * 2 ** (attempts - 1);
    await ctx.db.patch("notifications", notificationId, {
      attempts,
      nextAttemptAt: Date.now() + delay,
      error,
    });
    await ctx.scheduler.runAfter(delay, internal.notify.send, { notificationId });
    return null;
  },
});

export const mark = internalMutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("skipped")),
    error: v.optional(v.string()),
    attempts: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { notificationIds, status, error, attempts }) => {
    for (const id of notificationIds) {
      await ctx.db.patch("notifications", id, {
        status,
        error,
        attempts,
        nextAttemptAt: undefined,
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

// Why a notification cannot go out, null when it can. Never leave one pending.
function undeliverable(delivery: Delivery): string | null {
  if (delivery.channel === "email") return delivery.email ? null : "no email on file";
  if (!delivery.phone && !delivery.photonUserId) return "no phone on file";
  // Photon shares a line, an unverified number has never texted us and cannot be cold messaged.
  if (!delivery.phoneVerified) return "phone not verified";
  return null;
}

async function dispatch(
  ctx: ActionCtx,
  delivery: Delivery,
  subject: string,
  body: string,
  react: EmailBody,
): Promise<void> {
  if (delivery.channel === "email") {
    // A React element cannot cross a Convex function boundary, so the caller names the template.
    await ctx.runAction(internal.email.sendEmail, { to: delivery.email, subject, react });
    return;
  }
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
    const reason = undeliverable(delivery);
    if (reason) {
      await ctx.runMutation(internal.notify.mark, {
        notificationIds: [notificationId],
        status: "skipped",
        error: reason,
      });
      return null;
    }
    try {
      const ends = delivery.expiresAtText ? `Ends ${delivery.expiresAtText}` : undefined;
      const body = ends ? `${delivery.line}\n${ends}` : delivery.line;
      await dispatch(ctx, delivery, `Voidwatch: ${delivery.ruleName}`, body, {
        template: "RuleMatch",
        props: {
          ruleName: delivery.ruleName,
          kind: delivery.kind,
          title: delivery.line,
          detail: ends,
          expiresAt: delivery.expiresAtText,
          url: siteUrl(),
        },
      });
      await ctx.runMutation(internal.notify.mark, {
        notificationIds: [notificationId],
        status: "sent",
        attempts: delivery.attempts + 1,
      });
    } catch (e) {
      const attempts = delivery.attempts + 1;
      const error = e instanceof Error ? e.message : String(e);
      if (attempts < MAX_ATTEMPTS) {
        await ctx.runMutation(internal.notify.retryLater, { notificationId, attempts, error });
      } else {
        await ctx.runMutation(internal.notify.mark, {
          notificationIds: [notificationId],
          status: "failed",
          error,
          attempts,
        });
      }
    }
    return null;
  },
});

export const digest = internalAction({
  // now is injectable so the hour the digest picks is testable.
  args: { now: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    let cursor: string | null = null;
    let isDone = false;

    while (!isDone) {
      const page: { userIds: Id<"users">[]; cursor: string | null; isDone: boolean } = await ctx.runQuery(
        internal.notify.dueUsers,
        { now, cursor },
      );
      cursor = page.cursor;
      isDone = page.isDone;

      for (const userId of page.userIds) {
        const pending = (await ctx.runQuery(internal.notify.pendingDigestFor, { userId })) as Delivery[];
        if (pending.length === 0) continue;

        const groups = new Map<string, Delivery[]>();
        for (const delivery of pending) {
          const group = groups.get(delivery.channel) ?? [];
          group.push(delivery);
          groups.set(delivery.channel, group);
        }

        for (const group of groups.values()) {
          const ids = group.map((d) => d.notificationId);
          const reason = undeliverable(group[0]);
          if (reason) {
            await ctx.runMutation(internal.notify.mark, { notificationIds: ids, status: "skipped", error: reason });
            continue;
          }
          const body = group
            .map((d) => (d.expiresAtText ? `${d.line} (ends ${d.expiresAtText})` : d.line))
            .join("\n");
          try {
            await dispatch(ctx, group[0], `Voidwatch digest: ${group.length} matches`, body, {
              template: "Digest",
              props: {
                items: group.map((d) => ({
                  ruleName: d.ruleName,
                  title: d.line,
                  detail: d.expiresAtText ? `Ends ${d.expiresAtText}` : undefined,
                })),
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
        await ctx.runMutation(internal.notify.recordDigest, { userId, at: now });
      }
    }
    return null;
  },
});
