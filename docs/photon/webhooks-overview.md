# Webhooks overview and quickstart

Source: /docs/webhooks/overview, /docs/webhooks/quickstart, /docs/spectrum-ts/webhooks

Register a URL once and Spectrum POSTs every inbound message across every enabled platform to it as signed JSON. No long lived process, no platform credentials in your runtime, no reconnect logic.

```http
POST https://your-app.com/spectrum-webhook
X-Spectrum-Event: messages
X-Spectrum-Signature: v0=<hmac>
X-Spectrum-Timestamp: 1747242392

{"event":"messages","space":{...},"message":{...}}
```

## What a delivery carries, and omits

Carries: routing context (`space.id`, `message.id`, `sender`, platform identifiers), content metadata (`content.type` plus every JSON safe field: text, filenames, MIME types, sizes, URLs), and provenance (signed `X-Spectrum-Signature` and `X-Spectrum-Timestamp`, plus `X-Spectrum-Webhook-Id` for dedupe).

Deliberately omitted: raw bytes for attachments, voice memos, contact photos (metadata only, no download URL, fetch out of band via the SDK); resolved rich link previews (`richlink` ships `url` only); recursive message trees (a reaction carries a slim target ref, not the full message). The webhook is the doorbell, not the package.

## Mental model

| Concept | Meaning |
| --- | --- |
| Per project, per URL | A project can have many URLs, each independent |
| Per URL signing secret | 64 character secret returned exactly once at registration |
| Every URL gets every event | No per webhook event subscription today; branch on `event` |
| At least once, in order per project | Retries can duplicate; dedupe on `webhookId + message.id`. No ordering across URLs |

Currently one event: `messages`. Reactions arrive inside it as a `content.type` arm, not as a separate event. New event types are additive.

## Flow

1. Worker receives the message from the platform, serializes the event to JSON.
2. For every registered URL, it computes an HMAC-SHA256 signature and POSTs the body.
3. Your server verifies the signature, returns 2xx, processes.
4. Failures retry with exponential backoff and jitter, up to 6 attempts, then drop. No persistent retry queue, no dead letter destination.

The URL must be public HTTPS, no redirects, no private or internal addresses (see webhooks-delivery.md).

## Quickstart in brief

1. Stand up an HTTPS endpoint (ngrok for local dev).
2. Register it: `curl -X POST "https://spectrum.photon.codes/projects/$PROJECT_ID/webhooks/" -u "$PROJECT_ID:$PROJECT_SECRET" -H "Content-Type: application/json" -d '{"webhookUrl":"https://.../spectrum-webhook"}'`.
3. Save `signingSecret` from the response immediately: it is shown exactly once. Lose it and you must delete and re-register.
4. Verify each delivery: recompute `v0=` + HMAC-SHA256 of `v0:<timestamp>:<rawBody>` with the secret, compare constant time, reject timestamps older than about 5 minutes.
5. Send a real message from an enabled platform and watch it arrive.

There is no public HTTP send message endpoint yet. To reply, run a `spectrum-ts` instance (in another process or alongside), rebuild the DM from `message.sender.id` (`im.space(await im.user(senderId))`), and `space.send(...)`. Acknowledge the webhook with 2xx first and enqueue the reply.

## SDK side: app.webhook()

`app.webhook(request, handler)` handles two formats through one method, detected by payload shape: native Spectrum webhooks (HMAC signed JSON, needs `webhookSecret` on `Spectrum()`, env `SPECTRUM_WEBHOOK_SECRET`; missing secret answers 500) and Fusor webhooks (protobuf envelope of the raw provider request, verified by the provider's own `verify()`). The handler receives the same `(space, message)` pair either way, is invoked fire and forget after the HTTP response, and does not feed `app.messages`. Attachment bytes rehydrate lazily via `read()` and `stream()`. Verification: HMAC-SHA256 over `v0:<timestamp>:<rawBody>`, 5 minute replay window, 401 on bad signature, 400 on missing headers. Always pass raw body bytes.

First party adapters mount the endpoint with correct raw body handling: `@spectrum-ts/hono`, `@spectrum-ts/express` (mount before any global `express.json()`), `@spectrum-ts/elysia`, each taking `{ app, onMessage }`.

## Management surfaces

Dashboard Webhook tab at https://app.photon.codes/dashboard, the REST API (see webhooks-management.md), or curl. A first class `photon webhooks` CLI is on the roadmap.
