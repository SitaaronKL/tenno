"use node";

import { Resend } from "@convex-dev/resend";
import { createElement } from "react";
import { render } from "@react-email/components";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { Digest } from "./emails/Digest";
import { MagicLink } from "./emails/MagicLink";
import { RuleMatch } from "./emails/RuleMatch";

// An empty string is not a key either, and === undefined would call it configured.
export function emailConfigured(): boolean {
  return (process.env.RESEND_API_KEY ?? "").trim() !== "";
}

// Test mode only delivers to resend.dev addresses, so real sending needs the key.
export const resend: Resend = new Resend(components.resend, {
  testMode: !emailConfigured(),
  // Resend tells us what actually happened to the mail, notify moves the row off "queued".
  onEmailEvent: internal.notify.onEmailEvent,
});

export const FROM = `Voidwatch <alerts@${process.env.EMAIL_DOMAIN ?? "resend.dev"}>`;

const ruleMatchProps = v.object({
  ruleName: v.string(),
  kind: v.string(),
  title: v.string(),
  detail: v.optional(v.string()),
  expiresAt: v.optional(v.string()),
  url: v.string(),
});

const digestProps = v.object({
  items: v.array(
    v.object({
      ruleName: v.string(),
      title: v.string(),
      detail: v.optional(v.string()),
    }),
  ),
  url: v.string(),
});

const magicLinkProps = v.object({ url: v.string() });

// React elements do not cross the Convex wire, so callers name the template.
export const vReact = v.union(
  v.object({ template: v.literal("RuleMatch"), props: ruleMatchProps }),
  v.object({ template: v.literal("Digest"), props: digestProps }),
  v.object({ template: v.literal("MagicLink"), props: magicLinkProps }),
);

export class EmailNotConfigured extends Error {
  constructor() {
    super("email not configured");
  }
}

export const sendEmail = internalAction({
  args: { to: v.string(), subject: v.string(), react: vReact },
  returns: v.string(),
  handler: async (ctx, { to, subject, react }) => {
    // Without a key the component runs in test mode and rejects every real address after three
    // retries. Say so once, immediately, instead of burning the schedule.
    if (!emailConfigured()) throw new EmailNotConfigured();
    // createElement keeps this file .ts as the contract names it.
    const element =
      react.template === "RuleMatch"
        ? createElement(RuleMatch, react.props)
        : react.template === "Digest"
          ? createElement(Digest, react.props)
          : createElement(MagicLink, react.props);
    const html = await render(element);
    const text = await render(element, { plainText: true });
    return await resend.sendEmail(ctx, { from: FROM, to, subject, html, text });
  },
});
