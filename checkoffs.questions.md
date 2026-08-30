# Check offs, questions and assumptions

**How does the browser tell a guest from an account?** `completions.list` returns an empty list for both,
so a guest would look like an account with nothing ticked. Added `completions.canSave`, a query that
returns false for an anonymous user. The provider skips both queries while signed out.

**Where does the prune live?** The contract already has one weekly cron, `retention`. Rather than a
second weekly job, `retention.sweep` now also deletes completions past `expiresAt` through the new
`by_expires` index, and its return value gained a `completions` count.

**Panel count pill.** It took a `number`, the pill now reads "2 of 3 left" and "7 left", so its type
widened to `number | string`. That is a one line change in `components/panels/panel.tsx`, slice 5's file.

**Invasion expiry.** Upstream gives an invasion no end time, so a key expires at `startsAt` plus seven
days. A long invasion that outruns that just gets a fresh box, it never loses a tick mid run.

**Nightwave count.** The pill used to show the number of acts. It now shows what is left, so with
nothing ticked it reads the same number as before.

**Panels rendered outside the provider.** `CheckoffsProvider` mounts in `DashboardGrid`, not in `Panels`,
so the existing panel tests keep rendering without a Convex client. Without the provider the boxes show
and a click does nothing.

**`npx convex codegen` printed "Uploading functions to Convex".** Codegen was the only Convex CLI command
run, never `dev` or `deploy`, but the current CLI bundles and uploads as part of generating bindings.
Flagging it since the deployment was not meant to be touched.

**No new packages.** The Checkbox is a shadcn component written by hand against `@base-ui/react/checkbox`,
which was already installed.
