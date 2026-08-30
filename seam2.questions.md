# seam2: merging the five round 2 branches

Merge order was data, auth, mastery, app, shell, resolving by ownership. Only one file conflicted,
`convex/_generated/api.d.ts`, and it was a pure union of two import lists. `npx convex codegen` afterwards
produced no diff, so the hand resolution was already what the generator writes. `convex/schema.ts` merged with
no conflict at all: the data slice added `bounties` to the world state validator, the mastery slice added its
marked block at the end, and the two never touched the same lines.

## Seams and what I decided

### One data table

Two branches shipped a TanStack v9 table. The dashboard's registered sorting only, mastery's registered
filtering, sorting and pagination. There is now one `components/ui/data-table.tsx` with a single `features`
object covering all three, and callers opt in: pass `columnFilters` to filter, pass `pageSize` to paginate.
Visibility and selection stay unregistered so they tree shake away, per `docs/nextjs/data-table.md`.

Question: the two tables also looked different, dense and borderless for a dashboard card, roomy and boxed with
a footer for a full page. Assumption: that is presentation, not a second component, so it is two boolean props,
`dense` and `bordered`, plus `countLabel`. The alternative was two wrappers over one hook, which is more files
for the same result.

Empty states differ too and both are kept. `empty` renders instead of the table when there is no data at all,
which is what a dashboard panel wants. `emptyFiltered` renders as a row inside the table when filters have
emptied it, which is what the mastery page wants. A caller can pass either or both.

`components/panels/data-table.tsx`, `components/mastery/data-table.tsx` and
`components/mastery/data-table-features.ts` are deleted. `components/mastery/columns.tsx` now builds its column
helper on the shared `DataTableFeatures`.

### Bounties

The shapes match exactly, field for field, `level` typed as a string on both sides, so nothing had to be fixed
in the caller. `components/panels/bounties.tsx` had declared its own `Bounty` and `BountyJob` and read the field
through a cast, because it was written before the data slice landed. Both now come from
`lib/contracts/worldstate.ts` and `bountiesOf` is `state.bounties ?? []`.

### Nav

The mastery entry survived the sidebar rewrite untouched: mastery appended to `NAV_ITEMS` in
`components/shell/nav.ts` and shell rewrote the renderer around the same array, so git merged them cleanly.
The new `AppSidebar` maps over `NAV_ITEMS`, holds a ref to each icon and drives it from the row's own hover and
focus, so Mastery animates exactly like the other four. `AtomIcon` exposes the same imperative handle the other
icons do, so nothing needed adapting.

### /mastery was not a protected route

Found by curling the running app, not by a test: `proxy.ts` matched `/dashboard`, `/rules`, `/chat` and
`/settings`, so `/mastery` rendered for a signed out visitor and only failed later, inside `requireUser`. The
mastery slice did not own `proxy.ts` and could not have added it. Added `"/mastery(.*)"`, and it now redirects
to `/login` like every other app route.

### Two data table tests, no dedupe needed

Nothing tested the same behaviour twice. `convex/ingest/de.test.ts` and `convex/ingest/normalize.test.ts` look
like duplicates ("gives the alert its node and its reward" appears in both) but they cover two different
readers, DE's payload and warframestat's, so both stay. Same for the fissure order: `convex/worldstate.test.ts`
asserts the query sorts Lith to Omnia, `components/panels/fissures.test.tsx` asserts the table opens in that
order and re-sorts on a header click. Different layers, both worth keeping.

### Gold

Nothing in `app/`, `components/` or `convex/emails/` used gold, a gold hex or a hue token. The shell slice had
already moved every token in `app/globals.css` to the inverse of the background, charts included. What was left:
`app/logo/page.tsx`, deleted with the rest of the logo board, and two unreferenced SVGs, `public/logo-mark.svg`
and `public/logo-rebuilt.svg`, both traced in `#f5b942` and both superseded by `public/logo-outline.svg`.
Deleted. `public/logo-ideas/` is left alone, those are Dhruv's source traces, not assets the app serves.

`docs/DESIGN.md` still specified a per tier hue for the fissure badge ("Axi gold tint") three lines under the
rule that says no gold. The code was already black and white, so I corrected the doc to describe what shipped.

Assumption: the blue in the landing page's iMessage mock stays. It reads as a screenshot of Messages, the shell
slice's questions file argues the same, and nothing outside the phone frame uses it.

### Auth

The `Password` provider is registered unconditionally on the server, it needs no keys, and
`NEXT_PUBLIC_AUTH_PASSWORD` decides only what the login page offers. Verified in a browser with the flag on:
the email and password form renders, with a Create one toggle. Guest is untouched and still behind
`AUTH_ALLOW_GUEST` on the deployment plus `NEXT_PUBLIC_ALLOW_GUEST` in the browser. Both flags and
`NEXT_PUBLIC_PHOTON_NUMBER` are in `.env.example`.

Password sign in will report an unknown provider until someone deploys, the auth slice could not deploy and
neither could I.

### Mastery seed

`node scripts/import-public-export.mjs` runs here in under a second and writes `convex/gamedata/items.json`
(919 items) and `nodes.json` (269 nodes), byte identical to what is checked in, so DE's Public Export has not
moved since the mastery slice ran it. `npx convex run gamedata/import:importGameData '{}'` was not run, it
writes to the deployment. Both commands are step 4 of README's Run it yourself, with a line saying `/mastery`
is empty until they run.

### Codegen

`npx convex codegen` only. Its own help says it does not modify the code running on the deployment, and the
output confirms it: no diff under `convex/_generated`.

## Still open

- The signed in shell could not be checked in a browser. The deployment runs the pre merge `convex/auth.ts`, so
  there is no way in. The landing page, the login page and the redirect behaviour of every `(app)` route were
  checked live; dashboard, chat, rules and mastery are covered by tests only.
- `npm audit` reports 18 moderate advisories, all inherited from `main`. Untouched, that is not a seam.
