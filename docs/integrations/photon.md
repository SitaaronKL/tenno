# Photon (photon.codes) / Spectrum — messaging from a Node backend

**What it is:** Photon is an *iMessage-first* messaging platform for agents/apps. The SDK is **Spectrum** (`spectrum-ts`, v12.8.0 as of 2026-08-29; runtime `@spectrum-ts/core` + providers for iMessage, WhatsApp Business, Telegram, Slack, Terminal, Voice). Photon hosts the Apple relay; you send/receive via a gRPC stream or HTTP webhooks. It is **not a general SMS gateway** — SMS/RCS exists only as automatic fallback for a phone that can't receive iMessage.

## Install & auth
```bash
npm install spectrum-ts            # or lean: npm i @spectrum-ts/core @spectrum-ts/imessage
```
Create a project in the Photon dashboard -> copy **Project ID** and **Project Secret**.
```txt
SPECTRUM_PROJECT_ID=...
SPECTRUM_PROJECT_SECRET=...
SPECTRUM_WEBHOOK_SECRET=...      # only if using webhooks
```
```ts
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

const app = await Spectrum({
  projectId: process.env.SPECTRUM_PROJECT_ID!,        // or omit and rely on env vars
  projectSecret: process.env.SPECTRUM_PROJECT_SECRET!,
  providers: [imessage.config()],                     // config via SPECTRUM_IMESSAGE_* env too
  webhookSecret: process.env.SPECTRUM_WEBHOOK_SECRET,
});
```
REST management API: `https://spectrum.photon.codes`, HTTP Basic auth with `projectId:projectSecret`, JSON envelope `{ succeed, data | message }` (webhooks/platform config; message sending goes through the SDK).

## Sending an OUTBOUND message to a phone number (proactive, not a reply)
A conversation is a **space**. Resolve/create one from a handle (E.164 phone or email), then send:
```ts
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { attachment } from "spectrum-ts";

const app = await Spectrum({ providers: [imessage.config()] });
const im = imessage(app);                             // typed platform instance

export async function sendText(to: string, body: string) {
  const space = await im.space.create(to);            // "+15551234567" (1:1) or ["+1...", "+1..."] (group)
  const sent = await space.send(body);                // returns Message | undefined
  // rich content: await space.send(attachment("./invoice.pdf")); await space.send(reply(text, msg)); ...
  return sent?.id;
}

// Equivalent instance-level form (useful when you already hold a Space):
await app.send(space, "Your code is 123456");
await app.responding(space, async () => { await space.send("...") });   // shows typing indicator
// Re-open a known space later: await im.space.get(spaceId)
```
Recipient objects expose `service: "iMessage" | "SMS" | "RCS" | "unknown"` so you can see which transport was used.

### Cold-outreach limits (important)
- **Free / Pro (shared-line pool):** a shared line **cannot initiate** a conversation with a number that has never texted it. Outbound to brand-new numbers is blocked by Photon policy. Workaround: have the user text the line first (e.g. a "text START to ..." CTA / QR), or move to a dedicated line.
- **Business ($250/line/mo):** dedicated number, cold outreach allowed (~50 new contacts/day/line), group-messaging API.
- Free quotas reported by users: ~5,000 msgs/server/day, 50 new-conversation initiations/line/day (raise via help@photon.codes).
- So for "send an OTP/notification to any arbitrary phone number on first contact" a shared line will not work; you need Business or an SMS provider.

## iMessage vs SMS/RCS fallback
Photon delivers a native blue-bubble iMessage when the handle is registered with Apple; otherwise it **automatically falls back to SMS or RCS** — no code change, no separate provider. You cannot force plain SMS, choose a 10DLC/toll-free number, or buy per-message SMS; the pricing model is per plan/line, not per message. Delivery status/read receipts/reactions/attachments are full-fidelity on iMessage only.

## Receiving: stream vs webhook
```ts
// Long-running process (VPS/container): persistent gRPC stream
for await (const [space, message] of app.messages) {
  if (message.content.type === "text") await space.send(`echo: ${message.content.text}`);
}
```
```ts
// Serverless (Next.js Route Handler / Convex HTTP action): stateless webhook, no stream needed
// app/api/photon/route.ts
export async function POST(req: Request) {
  return app.webhook(req, async (space, message) => {   // verifies HMAC-SHA256 over `v0:<ts>:<rawBody>` (5-min replay window)
    await space.send("got it");                          // 401 on bad signature, 400 on missing headers
  });
}
```
Raw-body requirement: pass the untouched `Request` (don't parse+re-stringify JSON). Delivery is at-least-once: dedupe on `message.id`. Configure the webhook URL via dashboard or `POST /projects/:id/webhooks/`.

## Pricing (photon.codes/pricing, Aug 2026)
| Plan | Price | Users | Notes |
| --- | --- | --- | --- |
| Free | $0 | up to 10 | shared line pool, community support, unlimited daily iMessage volume (subject to quotas above) |
| Pro | $25/mo | up to 100 | fast-track support; still shared lines |
| Business | $250/line/mo | unlimited | dedicated number, cold outreach (50 new contacts/day), group API |
| Enterprise | custom | — | SLAs, custom config |
"Users" = distinct recipients your project talks to.

## Fit for Convex actions / Next.js Route Handlers
- **Sending from a Next.js Route Handler / Server Action / Convex `action`:** works. `Spectrum(...)` + `im.space.create()` + `space.send()` are plain async calls over gRPC-web/HTTP; instantiate once per module (cache at module scope) and call `app.stop()` only if you need to tear down. Keep `projectSecret` server-side only. Cold-start cost: creating the client per invocation adds latency; acceptable for low volume.
- **Receiving:** use `app.webhook()` — it is stateless and explicitly designed for serverless; do NOT rely on `app.messages` (needs a persistent connection, which Vercel functions and Convex actions cannot hold). In Convex, expose an `httpAction` at e.g. `/photon` and forward the raw `Request` to `app.webhook`.
- **Node runtime required** (gRPC/protobuf deps): in Next use Route Handlers on the Node runtime (default), not Edge; in Convex use `"use node"` actions.
- Deal-breaker check: if your users are arbitrary phone numbers you must reach first-contact, you need the Business plan; otherwise budget for an SMS provider.

## Twilio fallback note
For guaranteed first-contact delivery to any phone (OTP, alerts), or Android-heavy audiences where per-message pricing matters, use a real SMS API: **Telnyx** (~$0.004/segment, cheapest solid option) or **Twilio** (~$0.0083/segment, best ecosystem, Verify for OTP). Both require A2P 10DLC (brand + campaign registration) or a verified toll-free number in the US. Pattern: try Photon (`im.space.create` throws/blocked for cold contact) -> fall back to `twilio.messages.create(...)`. See sms.md for code and pricing.
