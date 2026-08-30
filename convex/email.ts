"use node";

import { Resend } from "@convex-dev/resend";
import { createElement } from "react";
import { render } from "@react-email/components";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { Digest } from "./emails/Digest";
import { MagicLink } from "./emails/MagicLink";
import { RuleMatch } from "./emails/RuleMatch";

// Test mode only delivers to resend.dev addresses, so real sending needs the key.
export const resend: Resend = new Resend(components.resend, {
  testMode: process.env.RESEND_API_KEY === undefined,
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

export const sendEmail = internalAction({
  args: { to: v.string(), subject: v.string(), react: vReact },
  returns: v.string(),
  handler: async (ctx, { to, subject, react }) => {
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
