# `@convex-dev/rate-limiter` (0.3.2)

Application-layer rate limiting stored transactionally in Convex. Type-safe names, token-bucket or fixed-window,
per-key limits, sharding for throughput, reservations for fair queuing. Fails closed.

## Setup
```ts
// convex/convex.config.ts
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
app.use(rateLimiter);

// convex/rateLimits.ts
import { RateLimiter, MINUTE, HOUR, SECOND } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  freeTrialSignUp: { kind: "fixed window", rate: 100, period: HOUR },              // global
  sendMessage:     { kind: "token bucket", rate: 10, period: MINUTE, capacity: 3 }, // per-user burst 3
  failedLogins:    { kind: "token bucket", rate: 10, period: HOUR },
  llmTokens:       { kind: "token bucket", rate: 40_000, period: MINUTE, shards: 10 },
  llmRequests:     { kind: "fixed window", rate: 1000, period: MINUTE, shards: 10, start: 0 },
});
```
Config: `kind`, `rate` (tokens per `period`), `period` (ms), `capacity` (max burst, default = rate), `shards`,
`start` (fixed-window origin; random if omitted), `maxReserved`.

## Use (mutations or actions)
```ts
// consume 1 token; returns { ok, retryAfter? (ms) }
const { ok, retryAfter } = await rateLimiter.limit(ctx, "sendMessage", { key: userId });
if (!ok) throw new ConvexError({ kind: "RateLimited", retryAfter });

await rateLimiter.limit(ctx, "failedLogins", { key: email, throws: true }); // throws ConvexError { kind: "RateLimitError", name, retryAfter }
await rateLimiter.limit(ctx, "llmTokens", { key: userId, count: usage.totalTokens });
await rateLimiter.limit(ctx, "adhoc", { config: { kind: "fixed window", rate: 1, period: SECOND } }); // inline config

await rateLimiter.check(ctx, "sendMessage", { key: userId });   // inspect without consuming
await rateLimiter.reset(ctx, "failedLogins", { key: email });   // e.g. on successful login
const { value, ts, config } = await rateLimiter.getValue(ctx, "sendMessage", { key: userId });
```
Reserve-and-schedule (fair queue, no thundering herd):
```ts
export const callLlm = internalAction({
  args: { prompt: v.string(), skipCheck: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (!args.skipCheck) {
      const s = await rateLimiter.limit(ctx, "llmRequests", { reserve: true });
      if (s.retryAfter) {
        return ctx.scheduler.runAfter(s.retryAfter + Math.random() * 1000, internal.llm.callLlm, { ...args, skipCheck: true });
      }
    }
    // do the call
  },
});
```
Client error check: `import { isRateLimitError } from "@convex-dev/rate-limiter"; if (isRateLimitError(e)) e.data.retryAfter`.

## React hook (show countdown / disable button)
```ts
// convex/rateLimits.ts
export const { getRateLimit, getServerTime } = rateLimiter.hookAPI("sendMessage", {
  key: async (ctx) => (await getAuthUserId(ctx)) ?? "anon",
});
```
```tsx
import { useRateLimit } from "@convex-dev/rate-limiter/react";
const { status: { ok, retryAt }, check } = useRateLimit(api.rateLimits.getRateLimit, { getServerTimeMutation: api.rateLimits.getServerTime, count: 1 });
```

## Gotchas
- Limits are evaluated inside the mutation transaction: if the mutation throws, the token is refunded.
  `limit` in an action is its own transaction (not refunded on later failure).
- Token bucket = smooth refill w/ burst `capacity`; fixed window = all tokens at window start (better for
  mirroring upstream API quotas).
- Sharding: ~`maxQPS / 2` shards, ≥5–10 capacity per shard; slightly reduces effective capacity.
- Names are typed from the config object — inline `config` is the escape hatch for dynamic limits.
