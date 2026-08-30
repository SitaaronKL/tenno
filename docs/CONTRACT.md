# Build contract

One contract, many parallel slices. Every slice reads this file first. If you must deviate, append to your `<slice>.questions.md`, state your assumption, and continue. Never edit files another slice owns.

Product name: **Voidwatch**. Repo: github.com/SitaaronKL/tenno, package name stays `tenno`. PC platform only in v1.
Merged state: see `contract-errata.md` at the repo root for every place the code differs from this file.

## Stack (installed, do not add frameworks)

Next.js 16.3 App Router, React 19, Tailwind v4, shadcn/ui (preset nova, neutral, `components/ui/*` already added), Convex 1.45, `@convex-dev/auth`, `@convex-dev/resend`, `@convex-dev/agent`, `@convex-dev/rate-limiter`, `@convex-dev/workflow`, `ai` + `@ai-sdk/openai`, `zod` 4, `resend`, `@react-email/components`, `spectrum-ts`.

Docs for every piece live in `docs/`. Read the relevant folder before writing code: `docs/convex/`, `docs/nextjs/`, `docs/openai/`, `docs/integrations/`, `docs/warframe-api.md`.

## Shared types (already written, source of truth)

- `lib/contracts/rule.ts`: zod `RuleFilter`, `RuleInput`, `Channel`, `DeliveryMode`, `EVENT_KINDS`
- `lib/contracts/worldstate.ts`: normalized `WorldState` and every panel type

Convex validators mirror these in `convex/lib/validators.ts` (`vRuleFilter`, `vRuleInput`, `vPlatform`, `vChannel`,
`vDeliveryMode`), re-exported by `convex/schema.ts`. If you change one, change both and log it in `questions.md`.

## Convex schema (`convex/schema.ts`, owned by slice 1)

```
authTables                      from @convex-dev/auth (users, sessions, ...)
profiles      { userId, email, phone?, photonUserId?, phoneVerifiedAt?, timezone, digestHour, platform: "pc" }
                index by_user [userId]
worldState    { platform, fetchedAt, data: WorldState }            index by_platform [platform]
worldEvents   { platform, kind, key, startsAt, expiresAt?, payload: any } index by_platform_kind_key [platform, kind, key], by_seen [seenAt]
              seenAt = first time we saw it. One row per upstream entity, never updated.
rules         { userId, name, filter: RuleFilter, mode, channels, enabled, source: "manual"|"ai", createdAt }
                index by_user [userId], by_kind [filter.kind, enabled]
notifications { userId, ruleId, eventId, channel, status: "pending"|"sent"|"failed"|"skipped", error?, createdAt, sentAt? }
                index by_rule_event [ruleId, eventId], by_user_status [userId, status], by_status [status]
```

Components registered in `convex/convex.config.ts`: `resend`, `agent`, `rateLimiter`, `workflow`.

## Convex function map (names are fixed, signatures are the contract)

```
convex/ingest/pull.ts        internal action   pull({platform})            fetch upstream, call apply
convex/ingest/normalize.ts   pure fn           normalize(raw) => WorldState  no ctx, unit tested
convex/ingest/apply.ts       internal mutation apply({platform, state})     upsert worldState, insert new worldEvents,
                                                                            schedule rules.evaluate({eventIds})
convex/worldstate.ts         query             get({platform})             => WorldState | null
convex/crons.ts              cron              "ingest" every 5 min -> ingest.pull({platform:"pc"})
                                               "digest" hourly at :00  -> notify.digest({})

convex/rules.ts              query    list()                              current user's rules
                             mutation create(RuleInput)                   validates with zod, source "manual"
                             mutation update({id, ...RuleInput partial, enabled?})
                             mutation remove({id})
                             internal mutation evaluate({eventIds})       match every enabled rule, insert notifications
                                                                            (skip if by_rule_event exists), rate limit 30/user/hour,
                                                                            schedule notify.send for mode "instant"
convex/matcher.ts            pure fn  matches(filter, event) => boolean    unit tested, no ctx

convex/notify.ts             internal action send({notificationId})       dispatch by channel, mark sent/failed
                             internal action digest()                     group pending digest notifications per user, one message per channel
convex/email.ts              internal action sendEmail({to, subject, react}) via resend component, "use node"
                             react is a serializable descriptor { template, props }, exported as vReact,
                             templates RuleMatch, Digest, MagicLink
convex/emails/*.tsx          React Email templates: RuleMatch, Digest, MagicLink
convex/photon.ts             internal action registerUser({phone})        Photon Users API, returns photonUserId
                             internal action sendText({photonUserId|phone, text})
                             internal action reply({phone, text})         agent answer, sent back over iMessage
convex/photonHttp.ts         http action     POST /photon/webhook         verifies the signature, schedules photon.reply
                             photon.ts is "use node" for spectrum-ts, http actions run in the default runtime

convex/profiles.ts           query    me()                                 { user, profile }, profile carries phoneVerified
                             mutation update({timezone?, digestHour?, phone?})  phone change schedules profiles.linkPhoton
                             internal action linkPhoton, internal mutation storePhotonUserId

convex/agent/index.ts        Agent definition (name "tenno", model gpt-5.6-luna via @ai-sdk/openai)
convex/agent/tools.ts        tools: getWorldState, createRule, listRules, searchItems
convex/agent/chat.ts         mutation startThread(), action sendMessage({threadId, text}), query listMessages({threadId})
                             internal action replyToInbound({phone, text}) => string, the iMessage entry point
convex/agent/ruleBuilder.ts  action  draft({text}) => RuleInput           structured output, never saves
convex/wiki.ts               action  searchItems({q})                     MediaWiki api.php, cached in memory for an hour

convex/auth.ts, convex/auth.config.ts, convex/http.ts   Convex Auth: Discord, Resend magic link through convex/email.ts,
plus the Anonymous provider as a dev only way in until the Discord and Resend keys exist. http.ts mounts the photon webhook.
```

All public queries/mutations call `requireUser(ctx)` from `convex/lib/auth.ts`, which returns `{ userId }`, and scope by userId. Never take userId as an argument.

## Next.js routes

```
app/(marketing)/page.tsx          landing (slice 8)
app/(auth)/login/page.tsx         Discord button + magic link email form (slice 2)
app/(app)/layout.tsx              authed shell: sidebar nav, user menu (slice 2)
app/(app)/dashboard/page.tsx      world state panels (slice 5)
app/(app)/rules/page.tsx          rule list + create/edit dialog + AI builder (slice 6)
app/(app)/chat/page.tsx           agent chat (slice 7)
app/(app)/settings/page.tsx       email, phone opt in, digest hour, timezone (slice 6)
```

Providers: `app/ConvexClientProvider.tsx` wraps `ConvexAuthNextjsProvider`, mounted in `app/layout.tsx` together with the
single `<Toaster />`. `proxy.ts` protects `(app)` routes with `convexAuthNextjsMiddleware`. `app/logo/page.tsx` is a
temporary logo board and is not part of the product.

## Env vars

Convex deployment: `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, `AUTH_RESEND_KEY`, `RESEND_API_KEY`, `OPENAI_API_KEY`, `SPECTRUM_PROJECT_ID` (550d43e3-1cd6-456d-93b8-335451754842), `SPECTRUM_PROJECT_SECRET`, `PHOTON_WEBHOOK_SECRET`, `SITE_URL`.
Next.js: `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`. See `.env.example`.

## Slices and file ownership

| # | Slice | Owns | Depends on |
|---|---|---|---|
| 1 | schema + auth wiring | convex/schema.ts, convex.config.ts, auth*.ts, http.ts, lib/auth.ts, ConvexClientProvider, proxy.ts | none |
| 2 | login + app shell | app/(auth)/*, app/(app)/layout.tsx, components/shell/* | 1 (uses api names only) |
| 3 | ingest | convex/ingest/*, convex/worldstate.ts, convex/crons.ts (ingest entry), tests | schema shape |
| 4 | rules engine + notify | convex/rules.ts, matcher.ts, notify.ts, crons.ts (digest entry), tests | schema shape |
| 5 | dashboard UI | app/(app)/dashboard/*, components/panels/* | worldstate.get shape |
| 6 | rules + settings UI | app/(app)/rules/*, app/(app)/settings/*, components/rules/* | rules.*, profiles.* signatures |
| 7 | agent + chat | convex/agent/*, convex/wiki.ts, app/(app)/chat/* | rules.create, worldstate.get |
| 8 | landing page | app/(marketing)/*, components/marketing/* | none |
| 9 | email + photon delivery | convex/email.ts, convex/emails/*, convex/photon.ts, profiles.ts | schema shape |
| 10 | seam + CI | merges 1..9 in order, resolves conflicts, `npm run build`, tests, GitHub Actions | all |

`convex/crons.ts` is shared by 3 and 4: each adds only its own `crons.interval/cron` line. `convex/http.ts` is owned by 1; slice 9 appends the photon route in a clearly marked block.

## Rules for every slice

- Branch `dhruv/slice-<n>-<name>` from `main`. Commit small. No dashes in commit messages or PR titles, use commas or a colon. PR title `Area: plain sentence`.
- Keep the slice near 300 added lines of real code. Tests do not count.
- Tests assert what a user perceives. Convex functions use `convex-test`. Pure functions use vitest.
  One `vitest.config.ts` with two projects: `ui` runs `**/*.test.tsx` under jsdom, `convex` runs `convex/**/*.test.ts`
  under the edge runtime. One `vitest.setup.ts`, one `test` script.
- Write `<slice>.questions.md` at repo root, append every question and the assumption you continued with.
- Do not install new packages without logging it in questions.md.
- Comments say why, one line, no history.
- `npm run build` and `npx tsc --noEmit` must pass before you push. Convex codegen: run `npx convex codegen` if `convex/_generated` is missing.
