# Contract errata

Every place the merged code differs from `docs/CONTRACT.md` as the slices wrote it. `docs/CONTRACT.md` has been
updated to match, this file is the record of what changed and why.

## Product name

The product is **Voidwatch**. User visible "Tenno" strings in the landing page, shell, login page, root metadata,
email templates and the email from address are now "Voidwatch". The repo, the npm package name and the agent's
internal `name: "tenno"` are unchanged. `app/logo/page.tsx` keeps its own copy, it is a temporary board.

## Schema

- `WorldState` carries `upstreamTimestamp` and `stale`. Ingest keeps every upstream entity and expiry is applied
  at the read boundary (`worldstate.get`, and again in the panels), so a lagging upstream no longer empties the
  dashboard. `stale` is true when the snapshot is more than ten minutes behind.
- `profiles` gained `photonSpaceId` (the inbound iMessage conversation) and `lastDigestAt` (the guard that keeps
  one local hour to one digest), plus an index `by_phone` so an inbound text finds its owner.
- `notifications` gained `mode` (so digest eligibility is indexed, not filtered), `attempts` and `nextAttemptAt`
  (retry with backoff). The unused `by_status` index is gone, `by_user_status` is what the digest reads.
- New table `photonInbound` `{ messageId, receivedAt }`, index `by_message`, so a Photon redelivery is answered once.
- `worldEvents.expiresAt` is optional. Baro arrivals and invasions have no fixed end.
- `worldEvents.payload` is `v.any()`. Each kind has a different shape and the typed one lives in
  `lib/contracts/worldstate.ts`.
- The Convex mirror of `RuleFilter` and `RuleInput` lives in `convex/lib/validators.ts` as `vRuleFilter` and
  `vRuleInput`, not inline in `convex/schema.ts`. `convex/schema.ts` imports and re-exports them, so both the
  schema and `convex/agent/ruleBuilder.ts` use one definition.
- `rules.filter` and `rules.update`'s filter argument use `vRuleFilter` instead of `v.any()`.
- `ruleBuilder.draft` returns `vRuleInput` instead of `v.any()`.
- `worldstate.get`, `ingest.pull` and `ingest.apply` take `vPlatform`, not `v.string()`, because the schema pins
  `platform` to the literal `"pc"`. `ingest.apply` takes and `worldstate.get` returns the shared
  `worldStateValidator`, not `v.any()`.

## Function map

- `requireUser(ctx)` returns `{ userId }`, not a bare id. Slices 4 and 7 assumed a bare id, their call sites were
  changed, slice 1 owns the file.
- `sendEmail`'s `react` argument is a serializable descriptor `{ template, props }`, exported from `convex/email.ts`
  as `vReact`. A React element cannot cross a Convex function boundary. Slice 4's caller passed
  `{ template: "RuleMatch", props: { title, lines } }`, which does not match the template. `convex/notify.ts` now
  sends the real `RuleMatch` props for an instant send and `Digest` props for the hourly digest, and takes the link
  from `SITE_URL`.
- The Photon webhook handler is `photonWebhook` in `convex/photonHttp.ts`, not in `convex/photon.ts`.
  `convex/photon.ts` is `"use node"` for `spectrum-ts` and http actions run in the default runtime.
- `convex/photon.ts` also exports `reply({phone, text})`, the Node action that asks the agent and texts the answer.
- `convex/agent/chat.ts` gained `replyToInbound({phone, text}) => string`. Slice 9 needed it and the contract did
  not list it. The thread is keyed by the user id the verified phone resolves to, so the tools act as that user.
  A phone we do not know is told to add it in Settings.
- `convex/profiles.ts` gained `linkPhoton` (internal action) and `storePhotonUserId` (internal mutation).
  `registerUser` is an action and `update` is a mutation, so the phone change schedules the action and it writes
  the id back.
- `convex/wiki.ts` caches in a module level `Map` with a one hour TTL. There is no `wikiCache` table.

## Function map additions

- `convex/profiles.ts` gained `ensure` (the profile row is created when Convex Auth creates the user),
  `linkInbound` (the inbound text links a phone to its profile, dedupes by Photon message id, and writes
  `phoneVerifiedAt`) and `userForVerifiedPhone`.
- `convex/rules.ts` gained `listForUser` and `createForUser` as internal functions. The iMessage agent has no
  session, so it acts for the user the verified phone belongs to. The public `list`, `create`, `update` and
  `remove` still call `requireUser`.
- `convex/notify.ts` gained `dueUsers`, `pendingDigestFor`, `recordDigest` and `retryLater`. `pendingDigest` is
  gone. `digest` takes an optional `now` so the local hour it picks is testable.
- `convex/lib/phone.ts` normalizes a phone to `+` plus digits, so a number typed in settings matches the one
  Photon delivers.

## Public by design

- `worldstate.get` is the one public function with no `requireUser`. World state is public game data, the same for
  everyone, and the landing page reads it. Every other public query and mutation calls `requireUser`.

## Auth

- `convex/auth.ts` sends the magic link through `internal.email.sendEmail` with the `MagicLink` template, rather
  than the Resend provider's own mail. Convex Auth passes the action ctx to `sendVerificationRequest` as a second
  argument that the Auth.js type does not describe, so the handler is cast.
- The `Anonymous` provider is registered only when `AUTH_ALLOW_GUEST` is `"true"`, and the login page shows the
  guest button only when `NEXT_PUBLIC_ALLOW_GUEST` is `"true"`. The Discord and magic link buttons render only
  when `NEXT_PUBLIC_AUTH_DISCORD` and `NEXT_PUBLIC_AUTH_RESEND` are `"true"`. Every variable is in `.env.example`.
- `convexAuth` uses the `afterUserCreatedOrUpdated` callback to create the profile row, so a new user can be
  emailed before they ever open settings.

## Frontend

- `<Toaster />` is mounted once in `app/layout.tsx`. Slice 2's copies in `app/(app)/layout.tsx` and the login page
  are gone.
- `components/shell/auth-actions.ts` is deleted. The real `ConvexAuthNextjsProvider` is mounted in the root layout,
  so `useAuthActions()` is used directly.
- `components/shell/useMe.ts`, `components/rules/api.ts` and `components/panels/world-state.ts` use the generated
  `api` object. Every `makeFunctionReference` call is gone.
- `profiles.me` returns `{ user, profile }` and the profile carries `phoneVerified: boolean`, not `phoneVerifiedAt`.
  `useProfile` flattens it for the settings page, which reads `phoneVerified`.
- `profiles.me` throws when signed out, so `useProfile` and `useMe` skip the query until Convex auth settles and
  report `null` when the visitor is signed out.

## Env

`EMAIL_DOMAIN` is read by `convex/email.ts` for the from address and was missing from the contract's list.
`AUTH_ALLOW_GUEST`, `NEXT_PUBLIC_ALLOW_GUEST`, `NEXT_PUBLIC_AUTH_DISCORD` and `NEXT_PUBLIC_AUTH_RESEND` are new.
`.env.example` lists all of them.

## Tests

- One `vitest.config.ts` with two projects: `ui` runs `**/*.test.tsx` under jsdom with `vitest.setup.ts`, `convex`
  runs `convex/**/*.test.ts` under the edge runtime with `convex-test` inlined. `vitest.config.mts` and
  `tests/setup.ts` are deleted, `package.json` devDependencies are deduped.
- Every suite sits beside the file it tests, there is no `tests/` folder and no `__tests__` folder.
- `convex/rules.test.ts` mocks `convex/email.ts` with a no op internal action. The suite is about the rules engine,
  and the real `email.ts` needs a Resend key.
