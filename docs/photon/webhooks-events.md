# Webhook events: exact wire format

Source: /docs/webhooks/events

## Headers

| Header | Value | Notes |
| --- | --- | --- |
| `Content-Type` | `application/json` | UTF-8 JSON body |
| `User-Agent` | `spectrum-webhook/<version>` | The delivery worker |
| `X-Spectrum-Event` | `messages` | Mirrors body `event`, route without parsing |
| `X-Spectrum-Webhook-Id` | UUID of the registered webhook | Which of your URLs this is for; part of the idempotency key |
| `X-Spectrum-Timestamp` | UNIX epoch seconds at signing | Needed for verification, reject if older than about 5 minutes |
| `X-Spectrum-Signature` | `v0=<64 char lowercase hex>` | HMAC-SHA256 of `v0:{timestamp}:{rawBody}` keyed by the signing secret |

Newer registrations also receive Standard Webhooks headers: `webhook-id` (stable event id), `webhook-timestamp`, and `webhook-signature` (space delimited `v1,<base64>` values, signed content `webhook-id.webhook-timestamp.rawBody`, verified with the `whsec_` `standardSigningSecret`). During secret rotation the header carries signatures for both old and new secrets.

## Body

```json
{
  "event": "messages",
  "space": { "id": "any;-;+15550100", "platform": "iMessage", "type": "dm", "phone": "+15551234567" },
  "message": {
    "id": "spc-msg-00000000-0000-4000-8000-000000000001",
    "platform": "iMessage",
    "direction": "inbound",
    "timestamp": "2026-05-14T19:06:32.000Z",
    "sender": { "id": "+15550100", "platform": "iMessage" },
    "space": { "...": "copy of top level space" },
    "content": { "type": "text", "text": "hey, what time is dinner?" }
  }
}
```

`event` is the discriminator; `messages` is the only event today, fired once per inbound message. Outbound messages never echo back. IDs and `platform` values are provider defined; treat them as opaque.

### Space

Guaranteed `id` and `platform`; every other own enumerable field of the platform's Space schema is forwarded (function typed members are stripped). iMessage adds `type` (`"dm" | "group"`) and `phone`: a dedicated line reports its E.164 number, a shared pooled line reports the literal string `shared`. iMessage DM ids look like `any;-;+<E.164>`, groups use a chat GUID. New schema fields forward automatically.

### Message

| Field | Notes |
| --- | --- |
| `id` | Opaque; plain messages are `spc-msg-<uuid>`, derived events composite (reaction: `spc-msg-<uuid>:reaction:<seq>:<idx>`, album child: `p:<n>/spc-msg-<uuid>`). Dedupe on it as is |
| `direction` | Always `"inbound"` |
| `timestamp` | ISO 8601 UTC, the platform send time |
| `sender` | `{ id, platform }`; iMessage id is the E.164 number |
| `content` | Discriminated union on `type`, see below |

Idempotency: one inbound message carries the same `message.id` across every delivery it produces (all URLs, all retries). One consumer: dedupe on `message.id`. Independent consumers per URL: `${webhookId}:${message.id}`. A 24 to 48 hour TTL suffices.

### Content arms delivered inbound today

| `type` | Wire fields |
| --- | --- |
| `text` | `text: string` |
| `attachment` | `id` (provider native, pass to `getAttachment()`), `name`, `mimeType`, `size?` |
| `contact` | `name?: { formatted?, first?, last? }`, `phones?: [{ value, type? }]`, `photo?: { mimeType }`, `raw?` |
| `richlink` | `url` only, no prefetched OG metadata |
| `reaction` | `emoji`, `target` (slim ref, see below) |
| `group` | Album: `items: SerializedInboundMessage[]`, each a full message (typically an `attachment`) with its own id, sender, timestamp; albums do not nest |

`mimeType` prefixes classify attachments: `image/*`, `audio/*` (voice memos arrive this way, no distinct arm), `video/*`, `application/*`. Byte bearing arms ship metadata only, never bytes or download URLs; fetch via the SDK: `const file = await im.getAttachment(content.id, space.phone); await file.read()` or `file.stream()`. Pass `space.phone` so a shared line resolves against the right account; optional on a dedicated line.

Inbound replies arrive as plain `text` (no `reply` arm, thread link not surfaced). Always keep a `default:` case for unknown `content.type` values, and an unknown `event` should log and return 2xx.

### Target refs (on `reaction`)

`{ id, platform, timestamp, sender?, contentPreview? }` where `contentPreview` is the first 80 characters of the target's text when the target was text. On a reaction, `message.sender` is who reacted; `content.target.sender` is who sent the reacted to message.

## Quick reference

- Verify: `X-Spectrum-Timestamp` + `X-Spectrum-Signature` + raw body bytes + signing secret.
- Route: `X-Spectrum-Event` or `body.event`.
- Idempotency: `X-Spectrum-Webhook-Id` + `body.message.id`.
- Always return 2xx fast, process asynchronously.
