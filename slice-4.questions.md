# Slice 4 questions and assumptions

Rules engine and notify. Every open question, with the assumption I continued on.

## Files I created that another slice owns

`convex/` held only a README, so nothing compiled. I wrote the smallest possible stubs and marked
each one with a STUB comment at the top. The seam agent must take the real version from the owning
slice and delete mine.

- `convex/schema.ts` (slice 1): only profiles, worldEvents, rules, notifications, with the contract indexes.
  No authTables, no worldState table. `filter` is `v.any()` since the RuleFilter validator lives in slice 1.
- `convex/convex.config.ts` (slice 1): registers rateLimiter only.
- `convex/lib/auth.ts` (slice 1): `requireUser(ctx)` returns `identity.subject`.
- `convex/email.ts`, `convex/photon.ts` (slice 9): no op internal actions with the contract arg shapes,
  so `internal.email.sendEmail` and `internal.photon.sendText` resolve.
- `convex/_generated/*`: I cannot log in to Convex, so real codegen fails. I generated the fallback with
  `CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210 CONVEX_SELF_HOSTED_ADMIN_KEY=dummy npx convex codegen`.
  `api`/`internal` come out as `AnyApi` and `components` as `AnyComponents`. Assumption: the seam agent
  regenerates against a real deployment. One consequence is in the code: `rules.ts` casts
  `components.rateLimiter` for the RateLimiter constructor, and that cast can go once codegen is real.

## crons

Contract gives slice 4 the digest line in `convex/crons.ts`, but slice 3 owns the file and it does not
exist yet. I did not create it. The seam agent adds:

```ts
crons.hourly("digest", { minuteUTC: 0 }, internal.notify.digest, {});
```

## sendEmail react argument

`internal.email.sendEmail({to, subject, react})` cannot really take a React element: Convex function args
are serialized values, and a JSX element is not one. Assumption: I pass a descriptor
`{ template: "RuleMatch", props: { title, lines } }` under the same `react` arg name, and slice 9 renders
the matching React Email template from it. If slice 9 picks a different shape, only `dispatch` in
`convex/notify.ts` changes.

## Rate limit semantics

"30 per user per hour" is read as fixed window, one token per rule match (not per channel), keyed by userId.
Over the limit I skip the match silently rather than writing a `skipped` notification, so a later evaluate
of the same event can still notify once the window rolls over.

## Matcher details

- Item names (invasion and alert rewards, Baro inventory) use case insensitive contains, per the slice brief.
- Enum like fields (fissure tier and mission type, sortie boss and mission type, cycle state) use case
  insensitive equality, since those come from a fixed upstream vocabulary and contains would over match.
- A null or empty array in a filter means "any", so `{ kind: "baro", items: null }` fires on every arrival.
- `steelPath` and `storm` only constrain when the filter sets them to true or false.
- `nightwave` has no fields, so it matches every nightwave event. Slice 3 decides what counts as one event
  there; I assume one worldEvents row per new weekly act.
- Payloads are read defensively as unknown records, because slice 3 owns normalize and shapes may shift.

## Notifications and digest

- `evaluate` writes one notification row per channel on the rule, all with status pending.
- `notify.digest` scans pending notifications by the `by_status` index, keeps the ones whose rule is in
  digest mode, groups by user and channel, and sends one message per group. It takes at most 1000 pending
  rows per run. Assumption: hourly volume stays well under that.
- Send failures mark the row failed with the error message. Nothing retries yet.
- A missing profile means we cannot address the user, so the notification stays pending rather than failing.

## Packages

Added devDependencies `vitest`, `convex-test`, `@edge-runtime/vm`, plus `vitest.config.ts` and a
`"test": "vitest run"` script. No runtime dependencies added.
