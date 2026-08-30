# `@convex-dev/resend` (0.2.7)

Durable, queued, batched email sending through Resend with webhook status tracking. Uses Workpool internally:
retries, idempotency keys (exactly-once), honors Resend rate limits.

## Setup
```sh
npm install @convex-dev/resend
npx convex env set RESEND_API_KEY re_...
npx convex env set RESEND_WEBHOOK_SECRET whsec_...   # optional, for status events
```
```ts
// convex/convex.config.ts
import resend from "@convex-dev/resend/convex.config.js";
app.use(resend);
```
```ts
// convex/sendEmails.ts
import { components, internal } from "./_generated/api";
import { Resend, vOnEmailEventArgs } from "@convex-dev/resend";
import { internalMutation } from "./_generated/server";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,                               // DEFAULT IS true → only delivers to *@resend.dev test addresses
  onEmailEvent: internal.sendEmails.handleEmailEvent, // optional
  // apiKey / webhookSecret override env vars
});

export const sendWelcome = internalMutation({
  args: { to: v.string(), name: v.string() },
  handler: async (ctx, { to, name }) => {
    const emailId = await resend.sendEmail(ctx, {
      from: "My App <noreply@mydomain.com>",
      to,
      subject: `Welcome, ${name}`,
      html: `<p>Hi ${name}</p>`,
      // text, replyTo: string[], headers, or template: { id, variables }
    });
    return emailId; // EmailId (string) — store it to track status
  },
});

export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs, // { id: EmailId, event: EmailEvent }
  handler: async (ctx, { id, event }) => {
    // event.type: "email.sent" | "email.delivered" | "email.bounced" | "email.complained" | "email.opened" | "email.clicked" | "email.delivery_delayed" ...
  },
});
```
`sendEmail` can be called from mutations **or** actions (it just enqueues). Rendering React Email: render to HTML
in an action (`@react-email/render`) then call `sendEmail`.

## Webhook (status tracking)
```ts
// convex/http.ts
import { resend } from "./sendEmails";
http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => resend.handleResendEventWebhook(ctx, req)),
});
```
Configure in Resend dashboard: `https://<deployment>.convex.site/resend-webhook`, subscribe to all `email.*` events.

## Status / cancel
```ts
const s = await resend.status(ctx, emailId);
// { status: "waiting"|"queued"|"cancelled"|"sent"|"delivered"|"delivery_delayed"|"bounced"|"failed",
//   bounced, failed, complained, deliveryDelayed, opened, clicked, errorMessage }
await resend.cancelEmail(ctx, emailId); // only if not yet handed to Resend
```

## Gotchas
- `testMode` defaults to **true**; production sends silently go only to `delivered@resend.dev`-style addresses.
- Verify your sending domain in Resend; `from` must use it.
- Emails are batched via `/emails/batch`; delivery is async — don't expect a Resend ID synchronously.
- Component keeps finished email records; clean up with its built-in retention (configurable via component
  `cleanupOldEmails`/`cleanupAbandonedEmails` functions, run from a cron).
- Convex Auth magic links use `@auth/core/providers/resend` (direct API), not this component.
