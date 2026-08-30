# Contract errata

Every place the merged code differs from `docs/CONTRACT.md` as the slices wrote it. `docs/CONTRACT.md` has been
updated to match, this file is the record of what changed and why.

## Product name

The product is **Voidwatch**. User visible "Tenno" strings in the landing page, shell, login page, root metadata,
email templates and the email from address are now "Voidwatch". The repo, the npm package name and the agent's
internal `name: "tenno"` are unchanged. `app/logo/page.tsx` keeps its own copy, it is a temporary board.

## Schema

- `worldEvents.expiresAt` is optional. Baro arrivals and invasions have no fixed end.
- `worldEvents.payload` is `v.any()`. Each kind has a different shape and the typed one lives in
  `lib/contracts/worldstate.ts`.
- The Convex mirror of `RuleFilter` and `RuleInput` lives in `convex/lib/validators.ts` as `vRuleFilter` and
  `vRuleInput`, not inline in `convex/schema.ts`. `convex/schema.ts` imports and re-exports them, so both the
  schema and `convex/agent/ruleBuilder.ts` use one definition.
- `rules.filter` and `rules.update`'s filter argument use `vRuleFilter` instead of `v.any()`.
- `ruleBuilder.draft` returns `vRuleInput` instead of `v.any()`.
- `worldstate.get`, `ingest.pull` and `ingest.apply` take `vPlatform`, not `v.string()`, because the schema pins
  `platform` to the literal `"pc"`.

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
  not list it. The thread is keyed by `phone:<number>`, since an inbound text has no signed in user.
- `convex/profiles.ts` gained `linkPhoton` (internal action) and `storePhotonUserId` (internal mutation).
  `registerUser` is an action and `update` is a mutation, so the phone change schedules the action and it writes
  the id back.
- `convex/wiki.ts` caches in a module level `Map` with a one hour TTL. There is no `wikiCache` table.

## Auth

- `convex/auth.ts` sends the magic link through `internal.email.sendEmail` with the `MagicLink` template, rather
  than the Resend provider's own mail. Convex Auth passes the action ctx to `sendVerificationRequest` as a second
  argument that the Auth.js type does not describe, so the handler is cast.
- The `Anonymous` provider is registered as well, and the login page has a "Continue as guest" button. This is dev
  only, so the app can be used before the Discord and Resend keys exist. Remove both when the keys land.

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

## Tests

- One `vitest.config.ts` with two projects: `ui` runs `**/*.test.tsx` under jsdom with `vitest.setup.ts`, `convex`
  runs `convex/**/*.test.ts` under the edge runtime with `convex-test` inlined. `vitest.config.mts` and
  `tests/setup.ts` are deleted, `package.json` devDependencies are deduped.
- `convex/rules.test.ts` mocks `convex/email.ts` with a no op internal action. The suite is about the rules engine,
  and the real `email.ts` needs a Resend key.
