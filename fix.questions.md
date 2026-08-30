# Fix questions and decisions

Working through the two adversarial reviews of the seam branch. Every decision handed to me was applied. This
file records the assumptions I had to make and the two places I deliberately stopped short.

## Assumptions

- **Phone shape.** A phone is stored as `+` plus its digits (`convex/lib/phone.ts`). Settings normalizes on save
  and the webhook normalizes the inbound sender, otherwise "+1 (555) 000-1234" typed by hand never matches
  "+15550001234" delivered by Photon. The settings field shows the normalized number after a save.
- **Photon user id from the webhook.** The envelope carries `message.sender.id` and `message.space.id`. For
  iMessage the sender id is the phone, so the space id is stored as `photonSpaceId` and the sender id is stored
  as `photonUserId` only when it is not a phone number. The Photon Users API registration still writes the real
  id through `profiles.linkPhoton`.
- **Digest hour needs an injectable clock.** `notify.digest` takes an optional `now`. The cron passes nothing.
  Without it, the hour a digest picks cannot be tested.
- **Digest guard.** `profiles.lastDigestAt` plus a local hour key (`YYYY-MM-DD-HH` in the user's timezone) is
  what keeps one local hour to one digest, so a cron rerun or a retry cannot send twice.
- **Retry policy.** Three attempts, backoff 1 minute then 2 minutes, through the scheduler. After that the row is
  `failed` with the provider's message. There is no dead letter queue.
- **Nightwave.** One event per season rollover, keyed `season:<n>:<expiry>`, payload is the whole nightwave with
  its acts. Upstream lists ten acts at once and one rule should not mean ten messages.
- **Baro.** An event is pushed only while `state.baro.active` is true. The panel still shows the countdown to the
  next arrival, that is display, not a notification.
- **Steel Path tri state.** The form serializes `null` for Any, `true` for Only, `false` for Exclude. Existing
  rules created before this fix still carry `false` and keep meaning "normal fissures only". Nothing migrates
  them, a user who meant "any" edits the rule once.
- **Lint.** `convex/ingest/normalize.ts` no longer uses `any`: raw upstream JSON is `Record<string, unknown>` read
  through small coercers, the same shape `convex/matcher.ts` already used. The only lint ignore added is
  `convex/_generated/**`.

## Deliberately not done

- **Upstream fallback.** `https://api.warframe.com/cdn/worldState.php` is a follow up, as asked. The hook point is
  a TODO comment in `convex/ingest/pull.ts`. A stale snapshot is now visible instead of silently empty: ingest
  keeps every entity, `worldstate.get` expires them at the read, and the dashboard says how old the data is.
- **Missing `NEXT_PUBLIC_CONVEX_URL` still 500s every page.** Both reviews flagged it. The decision list covers it
  only through `.env.example`, which now exists and lists every variable, so that is what was done. Making the
  marketing page render without a Convex client is a change to the provider shape and belongs in its own slice.

## Left for a follow up

- `worldEvents` and `notifications` are still never pruned. A weekly cleanup cron would use the `by_seen` index
  that already exists.
- `convex/agent/chat.sendMessage` and `ruleBuilder.draft` are authenticated but not rate limited, while the
  limiter component is already installed.
- The scaffold commit `8d3c903` still carries AI trailers, from before the rewrite. Not this branch's to rewrite,
  repeated here so it is not lost.
