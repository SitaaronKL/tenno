# Webhook delivery and retries

Source: /docs/webhooks/delivery

## Contract

- Up to 6 attempts per event (initial plus 5 retries), exponential backoff with plus or minus 50 percent jitter, on 5xx, 408, 429, network errors, and worker side timeouts.
- Any 2xx ends delivery. Other 4xx (400, 401, 403, 404, 422) are fatal, no retry.
- Per attempt timeout 30 seconds. Backoff sleeps sum to about 26 seconds average, about 39 seconds worst case; with every attempt hanging to timeout the whole cycle can run about 3.5 minutes.
- After the final attempt the event is logged and dropped. No persistent queue, no dead letter destination. At least once, bounded retries, not guaranteed delivery. For zero loss needs, pair webhooks with periodic reconciliation via the SDK.
- URL guard runs before every attempt and fails closed (see below).
- Multiple registered URLs receive each event in parallel (`Promise.allSettled`); one slow URL never delays the others.

## Retry schedule

| Attempt | Expected delay before it | Jittered range |
| --- | --- | --- |
| 1 | immediate | |
| 2 | 200ms | 100ms to 300ms |
| 3 | 1s | 500ms to 1500ms |
| 4 | 5s | 2.5s to 7.5s |
| 5 | 10s (clamped by per attempt cap) | 5s to 15s |
| 6 | 10s (clamped) | 5s to 15s |

Knobs (initial delay 200ms, growth 5x, per attempt cap 10s, 6 attempts) are internal worker env vars, operator tunable per environment, not per webhook.

## Status code meanings

| Your response | Worker treats as |
| --- | --- |
| 2xx | Success, stop |
| 3xx | Fatal: sent with `redirect: "manual"`, never followed. Register the final URL |
| 5xx, 408, 429 | Retriable (Retry-After not honored yet) |
| Other 4xx | Fatal, no retry |
| Connection refused or reset | Retriable |
| DNS failure | Fatal, caught by the URL guard before the request |
| Over 30s | Retriable timeout |

Return 4xx deliberately for permanent failures (bad signature) so the retry budget is not wasted.

## Where deliveries are refused (URL guard)

Checked at delivery time, not registration; a violating URL registers fine and then silently drops every event (fatal, no retry, logged on Photon's side only):

- HTTPS only; plain `http://` rejected.
- Public addresses only; loopback, `10.x`, `172.16-31.x`, `192.168.x`, link local and cloud metadata IPs, and the IPv6 equivalents are blocked as SSRF protection.
- No redirects of any kind, including trailing slash and http to https bounces.
- Malformed URLs and failing DNS drop the same way.

## What you should do

- Acknowledge fast: verify signature, enqueue, return 2xx. Anything network bound in the request path (LLM calls, third party APIs) risks the 30s timeout and duplicate processing.
- Be idempotent: dedupe on `${webhookId}:${message.id}` with a 24 to 48 hour TTL.
- Handle bursts: queue durably or process at arrival rate; 503 on overload is acceptable backpressure but eats the retry budget.

## Ordering

No global ordering, no per space ordering (a late retry can land after a later message), parallel delivery across URLs. Sort by `message.timestamp` and rely on dedupe.

## Not delivered

Outbound messages, standalone reaction events (they ride inside `messages` as a content arm), typing indicators, edits, poll votes, read receipts. If compensating for loss becomes hard, run the SDK's `app.messages` loop instead of or alongside webhooks.
