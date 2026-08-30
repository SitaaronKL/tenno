# Seam questions and decisions

Merging slices 1 to 9 into one working app. Every decision, and the assumption behind it.

## Merge

Order was 1, 3, 4, 9, 2, 5, 6, 7, 8, one `git merge` each. Conflicts were resolved by the ownership table in
`docs/CONTRACT.md`: the owning slice's file wins, every other slice's copy is a stub and was dropped.

- `convex/schema.ts`, `convex/convex.config.ts`, `convex/lib/auth.ts`: slice 1's.
- `convex/email.ts`, `convex/photon.ts`: slice 9's, slice 4's no op stubs dropped.
- `app/(app)/dashboard|rules|chat|settings/page.tsx`: slices 5, 6 and 7's, slice 2's placeholders dropped.
- `package.json`: union of every slice's devDependencies, deduped, vitest pinned to the newest ask (`^4.1.11`).
- `package-lock.json`: took one side per merge and regenerated with `npm install` at the end.

Halfway through, `origin/main`, `origin/slice-2-schema-auth` and `origin/slice-8-agent-chat` were force pushed to
strip AI trailers. The branch was reset to the new `origin/main` and all nine merges were redone from the fresh
refs, then the seam edits were reapplied.

**Old scaffold commit still carries trailers.** The other seven slice branches were not force pushed, so they still
descend from the pre rewrite scaffold commit `8d3c903`, which has a `Co-Authored-By` and a session link. It is now
in this branch's history. Assumption: rewriting seven other people's branches is not mine to do, so it stays and is
flagged here. My own commits carry no trailers.

## convex/_generated

Regenerated with `npx convex codegen` against `dev:steady-mongoose-632`, so `api`, `internal` and `components` are
really typed rather than the `AnyApi` fallback the slices had. The folder stays committed for now, as asked.

Every `makeFunctionReference` call is gone: `components/rules/api.ts`, `components/shell/useMe.ts`,
`components/panels/world-state.ts`, `convex/ingest/apply.ts` and `convex/photon.ts` now use `api` and `internal`.

## Type circularity in the agent

Real codegen made `convex/agent/tools.ts`, `convex/agent/index.ts` and `convex/agent/ruleBuilder.ts` infer through
the generated `api`, which infers through them, so `tsc` reported implicit `any`. Assumption: annotate the return
type of every tool `execute` and of `ruleBuilder.draft`'s handler. That is the documented Convex fix and it costs
nothing at runtime.

## sendEmail props

Slices 4 and 9 agreed on the descriptor shape but not the props. Slice 4's caller sent `{ title, lines }`, slice 9's
`RuleMatch` wants `{ ruleName, kind, title, detail?, expiresAt?, url }`. Slice 9 owns the templates, so the caller
was fixed: `notify.send` sends `RuleMatch` props, `notify.digest` sends `Digest` props, and the link comes from
`SITE_URL` with `https://voidwatch.app` as the fallback.

## replyToInbound

Slice 9 called `agent/chat:replyToInbound` and slice 7 never wrote it, so the webhook had nothing to answer with.
Added it as an internal action in `convex/agent/chat.ts`. Assumption: an inbound text has no signed in user, so the
thread is keyed by `phone:<number>`. A phone that later signs in gets a separate web thread. Good enough for v1.

## profiles.me and the settings page

`profiles.me` returns `{ user, profile }` and exposes `phoneVerified: boolean`. Slice 6's settings page expected a
flat profile with `phoneVerifiedAt`. Assumption: slice 1 owns the query, so `useProfile` flattens `me()` and the
settings page reads `phoneVerified`. Same rendering, one less field on the wire.

`me()` throws when signed out. `useProfile` and `useMe` skip the query until `useConvexAuth` settles and return
`null` for a signed out visitor, so the pages keep their "sign in to see this" branch.

## Anonymous sign in

The deployment has no `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, `AUTH_RESEND_KEY` or `RESEND_API_KEY` yet, so
Discord and the magic link cannot work. Registered the `Anonymous` provider and added a "Continue as guest" button
on the login page, both marked dev only in a comment. Nothing reads those four vars at import time: the Auth.js
providers resolve env when a sign in runs, and `@convex-dev/resend` starts in test mode when `RESEND_API_KEY` is
absent. Assumption: both come out once the keys land.

## Tests

One `vitest.config.ts` with two projects, per the brief: `ui` runs `**/*.test.tsx` under jsdom, `convex` runs
`convex/**/*.test.ts` under the edge runtime. `vitest.config.mts` and `tests/setup.ts` are deleted, one
`vitest.setup.ts` remains (it polyfills `matchMedia`, sonner reads it on mount). Vitest 4 dropped
`environmentMatchGlobs`, so this uses `test.projects`.

Two suites needed a fix after the merge, both because a stub became real:

- `convex/rules.test.ts` seeded `userId: "user1"`, which the real schema rejects. It now inserts a `users` row.
  It also mocks `convex/email.ts` with a no op internal action, otherwise the real one needs a Resend key and every
  notification lands as `failed`. The suite is about the rules engine.
- `tests/app-shell.test.tsx` renders `UserMenu`, which now reads `useConvexAuth`. The test mocks `convex/react`.
  It is about the shape of the chrome.

No test was deleted, none of the 65 duplicated another.

## Left alone

- `app/logo/page.tsx` stays, it is the temporary logo board.
- `.env.example` still does not exist. No slice owns it and the contract references it.
- Photon inbound is not deduped. Slice 9 flagged it, a duplicate text still produces a duplicate reply.
- `onEmailEvent` bounce handling is still not wired, slice 9 left it for later.
