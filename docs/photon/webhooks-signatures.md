# Verifying webhook signatures

Source: /docs/webhooks/verifying-signatures

## The recipe

For every incoming request:

1. Capture the raw body bytes before any JSON parser touches them.
2. Reject the timestamp if it is more than 5 minutes from your clock.
3. Recompute locally: `HMAC-SHA256(signingSecret, "v0:" + timestamp + ":" + rawBody)`.
4. Compare in constant time against `X-Spectrum-Signature`.

```text
sig = 'v0=' + hmacSha256Hex(signingSecret, 'v0:' + timestamp + ':' + rawBody)
```

Any failure: return 401 and stop.

## Reference verifier (Node or Bun)

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';
const SECRET = process.env.SPECTRUM_SIGNING_SECRET!;
const TOLERANCE_SEC = 5 * 60;

// rawBody: string from c.req.text() / express.raw / req.text()
const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
if (!Number.isFinite(age) || age > TOLERANCE_SEC) reject(400, 'stale timestamp');

const expected = 'v0=' + createHmac('sha256', SECRET)
  .update(`v0:${timestamp}:${rawBody}`).digest('hex');
const a = Buffer.from(expected), b = Buffer.from(signature);
if (a.length !== b.length || !timingSafeEqual(a, b)) reject(401, 'bad signature');
```

Python: `hmac.new(SECRET, f"v0:{ts}:{raw}".encode(), hashlib.sha256).hexdigest()` compared with `hmac.compare_digest`. Go: `hmac.New(sha256.New, secret)` over `"v0:" + ts + ":" + body`, compared with `hmac.Equal`.

## The four details that must be exact

1. Raw body bytes, not parsed JSON. Re-stringifying changes key order, whitespace, and unicode escaping. Express: `express.raw({ type: 'application/json' })`. Hono: `await c.req.text()` before `c.req.json()`. FastAPI: `await request.body()`, no Pydantic typed param. Workers and Bun.serve: `await request.text()`. Calling `json()` first consumes the stream and leaves `text()` empty.
2. Constant time comparison: `timingSafeEqual` (compare lengths first, it throws on mismatch), `hmac.compare_digest`, `hmac.Equal`, `hash_equals`.
3. Reject stale timestamps, about 5 minutes tolerance, to bound replay.
4. Lowercase hex, `v0=` header prefix, and `v0:` prefix inside the signed input. All three break verification when wrong. The v0 versions both prefix and input together; a future scheme bumps both to v1.

## Security model

The secret is the only piece not on the wire, returned once at registration. The HMAC proves authenticity, integrity of body and timestamp, and with the staleness check, freshness. Same scheme family as Stripe (`v1=`), Slack (`v0=`, identical), GitHub (`sha256=`).

Standard Webhooks alternative: newer registrations also return `standardSigningSecret` (`whsec_...`); use any Standard Webhooks consumer library with signed content `webhook-id.webhook-timestamp.rawBody` and the `webhook-signature` header.

## Common failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| Every request bad signature | Body parsed and re-serialized | Capture raw bytes first |
| Sporadic failures | Server clock skew | Run NTP, confirm with `date -u` |
| Only in production | Wrong env secret | Log `SECRET.length === 64` at startup |
| `timingSafeEqual` throws | Length mismatch | Compare lengths first, return false |
| Missing headers on real requests | Proxy strips `X-Spectrum-*` | Add to the proxy allow list |
