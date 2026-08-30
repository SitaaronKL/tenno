# Slice 6 questions, rules and settings UI

Every question here got an assumption so the slice could keep moving.

**Convex generated types are missing.** `convex/` has only a README, no schema and no `_generated`, so
`npx convex codegen` cannot run and `api.rules.*` does not exist yet. Assumption: address contract
functions by name with `makeFunctionReference` in `components/rules/api.ts`. Runtime paths used:
`rules:list`, `rules:create`, `rules:update`, `rules:remove`, `profiles:me`, `profiles:update`,
`agent/ruleBuilder:draft`. Seam agent should swap these for the generated `api` object.

**Branch name.** The contract asks for `dhruv/slice-6-rules-settings`, the workspace was created on
`slice-6-dashboard`. Assumption: keep the workspace branch so the orchestrator can find it.

**Form controls.** shadcn Select, Checkbox and RadioGroup are Base UI popups that are awkward to drive in
jsdom, and the repo has no Checkbox or RadioGroup component. Assumption: native `select`, `radio` and
`checkbox` inputs styled with the same tokens, so tests click what a user clicks. shadcn Dialog, Tabs,
Table, Switch, Badge, Card are used as is.

**Rule kinds without their own fields.** `nightwave` has no filter fields, so the form shows only name,
mode and channels for it. Assumption: that is intended.

**Mission type list.** The contract types mission types as free strings. Assumption: offer the six common
ones as checkboxes, Survival, Defense, Capture, Exterminate, Rescue, Interception.

**Photon number.** Hardcoded `+1 (415) 603-5536` in the settings copy as the slice brief states. Assumption:
it is a fixed shared line, not per user, so it does not need to come from the backend.

**Phone verified state.** Read from `profiles.me` as `phoneVerifiedAt`, matching the schema in the contract.
Assumption: slice 9 sets it when the inbound webhook links the phone.

**New devDependencies.** Added `vitest`, `convex-test`, `@testing-library/react`,
`@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, plus a `test` script.
`@vitejs/plugin-react` was skipped, it conflicts with the babel version shadcn pins, and vitest transforms
tsx through esbuild without it.

**Pre existing build error.** `app/layout.tsx` references the Next generated `LayoutProps` type, so
`npx tsc --noEmit` only passes after `npm run build` has written `.next/types`. Not a slice 6 file.

**No Convex provider in the tree yet.** `app/ConvexClientProvider.tsx` is slice 1 and `app/(app)/layout.tsx`
is slice 2, so `next build` prerendered my pages with no client and `useQuery` threw. Assumption: both pages
render their Convex reading parts inside `components/rules/client-only.tsx`, which mounts children after the
first client render. It stays correct once the real provider lands.
