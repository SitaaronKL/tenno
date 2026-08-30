# fix2 questions

Fixes for the two round 2 adversarial reviews, `REVIEW2-claude.md` and `REVIEW2-codex.md`.
Every assumption I continued with, in the order I hit it.

## Ingest

- **What counts as an implausible snapshot.** The decision says zero fissures and no sortie.
  I read that as the whole test: `plausible()` in `convex/ingest/pull.ts` is exactly
  `fissures.length > 0 || sortie !== null`. A real world state always has one or the other.
- **Which upstream wins when both answer.** DE first, and only if it is not `stale` (the existing
  ten minute mark). A stale DE falls through to warframestat, and if warframestat is also
  unusable the stale DE snapshot is still preferred over storing nothing.
- **Cycle start times.** The decision asks for the phase start rounded to the minute. I added
  `startsAt` to the `Cycle` contract type rather than deriving the start in `apply` from a
  duration table, so the derivation lives next to the phase maths. It is **optional** on the
  validator and the type, matching how `source` and `bounties` were handled, so snapshots stored
  by an older deploy still read back. `apply` falls back to the expiry when it is missing.
  The rounding is applied to the **key**, not to the stored `expiresAt`, so the Orb Vallis
  countdown keeps its real seconds.
- **Where sorting moved.** `worldstate.get` returns the stored row untouched, so the relic order
  sort moved into `ingest.apply`. `bounties` is no longer defaulted in the query, the panel
  already does `state.bounties ?? []`.
- **`ingest.prune` scheduling.** The decision says the existing ingest cron runs it after apply.
  `pull` calls it directly after `apply` rather than adding a cron line, so a manual pull prunes too.
- **Cold start.** "No previous snapshot" is read as no `worldState` row for the platform. Events
  are still recorded, only the `rules.evaluate` schedule is skipped.

## Photon and profiles

- **What a phone looks like.** The webhook accepts a sender id matching `/^\+\d{8,15}$/` and
  nothing else. The `?? message.space.id` fallback is gone: a space id is not an identity.
  A non phone sender gets the link instructions through `sendText({ photonUserId })`.
- **Which event is inbound.** `event === "message.received"` and `direction` either absent or
  `"inbound"`. The docs in `docs/integrations/photon.md` do not name the event set, so this is
  the one the existing fixture used, treated as the only one worth acting on.
- **A test I changed rather than kept.** `photonHttp.test.ts` used to deliver
  `"+1 (555) 000-1234"` as the sender id. Photon sends E.164, and normalising a sender id is
  exactly the coercion finding 5 objected to, so the test now delivers E.164. Normalisation of a
  loosely typed number belongs to `profiles.update`, and is covered there.

## Mastery

- **Where the player id lives.** Scoping reads to the caller needs the id on the server, so
  `profiles.masteryPlayerId` is new and `profileSync.fetchProfile` writes it. Asking for a
  profile is what claims it. The `localStorage` key `voidwatch.playerId` is gone, which means a
  user who had synced before has to press Sync profile once more.
- **`mastery.progress` no longer takes `playerId`.** It takes no arguments at all. Splitting the
  roster into `mastery.items` was the cheapest way to satisfy both the scoping decision and the
  "read the items table once" decision, since the two queries now have different dependencies.

## Notifications

- **"queued" is a new status.** The decision says name it queued and mark sent from the Resend
  event. `@convex-dev/resend` does expose `onEmailEvent`, so it is wired: `notifications.status`
  gained `"queued"`, rows carry the component's `emailId` under a new `by_email` index, and
  `convex/resendHttp.ts` mounts `/resend/webhook`. **That route needs `RESEND_WEBHOOK_SECRET` set
  on the deployment or the events never arrive and email rows sit at `queued` forever.** It is not
  in `.env.example` because I could not verify the exact name the component reads. Worth checking.
- **iMessage is still `sent`.** Photon has no delivery receipt to wait for.
- **Digest retry releases the claim.** `retryDigestLater` clears `lastDigestAt` and reschedules
  `digest` with the same `now`, otherwise the retry would find nobody due. A run that exhausts
  its three attempts leaves the rows `failed` and the hour unclaimed, so the next scheduled
  digest for that hour would try again. That is deliberate, the alternative loses the hour.

## Auth and configuration

- **The magic link button follows `RESEND_API_KEY`, not `AUTH_RESEND_KEY`.** The errata says the
  magic link goes out through `convex/email.ts`, which reads `RESEND_API_KEY`. `AUTH_RESEND_KEY`
  is no longer read anywhere. Left in `.env.example` untouched, flagging it here instead of
  deleting a variable the contract lists.
- **The password provider is always registered.** It needs no secret, so `auth.providers` always
  reports `password: true`. Only Discord, the magic link and guest are conditional.
- **Deleted flags.** `NEXT_PUBLIC_AUTH_DISCORD`, `NEXT_PUBLIC_AUTH_RESEND`,
  `NEXT_PUBLIC_AUTH_PASSWORD` and `NEXT_PUBLIC_ALLOW_GUEST` are gone from `.env.example` and the
  login page. `AUTH_ALLOW_GUEST` stays, server side only, and is reported by the query.
- **Where the Convex provider sits now.** `app/ConvexProviders.tsx` wraps both halves and is
  mounted by `app/(auth)/layout.tsx` and `app/(app)/layout.tsx`. The root layout has none, so
  `app/(marketing)` never loads a Convex client. Verified against a running `next dev` with
  `.env.local` moved away: `/` and `/login` both answer 200, `/login` reads "Backend not
  configured". `/dashboard` answers 307 because the middleware redirects before rendering.

## Nits and small calls

- **Email templates are neutral.** The reviews noted `#7dd3fc` in all three templates contradicts
  the errata's "one remaining colour" claim. Links and the magic link button are now `#fafafa`,
  and the errata sentence says so.
- **The Photon number has no fallback.** `NEXT_PUBLIC_PHOTON_NUMBER` unset means the opt in card
  is not rendered at all, rather than printing a real looking US number in a QR code.
- **Retention thresholds.** 7 days for `worldEvents` and 30 for `photonInbound`, as specified,
  swept weekly, 200 rows per table per run so one neglected deployment cannot blow the
  transaction limit. A very stale deployment needs several weeks to drain. Worth revisiting.
- **`v.any()` returns.** Replaced with `vRuleDoc` in `convex/rules.ts` and `vDelivery` in
  `convex/notify.ts`. `worldEvents.payload` stays `v.any()`, the errata already explains why.

## Not done, and why

- **Chunking the cold start burst** (claude finding 11's second half). Skipping expired events and
  not notifying on a cold start removes the burst the finding describes, so chunking `eventIds`
  across several `evaluate` calls was not needed to close it. If a real gap in the cron ever
  produces a large batch again, that is where to look.
- **`starNodes` is still read by nothing** (claude nit). Out of scope for a fix pass, it is a
  product decision about whether the mastery page should report nodes from the star chart.
