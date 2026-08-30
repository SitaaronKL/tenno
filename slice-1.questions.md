# Slice 1 questions and assumptions

**profiles.ts ownership.** The contract table lists `convex/profiles.ts` under slice 9, my brief lists it under slice 1.
Assumption: slice 1 writes `me()` and `update()` per the function map, slice 9 appends the Photon calls. I left a
marked `SLICE 9:` comment inside `update()` where `photon.registerUser({ phone })` should be scheduled, and did not
import `internal.photon` so the file compiles today.

**Create profile on first me() call.** Convex queries cannot write, so `me()` cannot insert a row. Assumption:
`me()` returns a profile shaped object filled with defaults (timezone `UTC`, digestHour 9, platform `pc`) when no row
exists, and the row is created by the first `update()`. Callers see the same shape either way.

**me() return shape.** The contract says "profile + auth user". Assumption: `{ user: { _id, name, email, image },
profile: {...} }`. The profile leaves out `photonUserId` and exposes `phoneVerified: boolean` instead of
`phoneVerifiedAt`, since the UI only needs the flag.

**Phone change resets verification.** Assumption: setting a new phone clears `photonUserId` and `phoneVerifiedAt`,
because a new number has to opt in to Photon again.

**worldEvents.expiresAt.** The contract lists it as required, but Baro arrivals and invasions have no fixed end.
Assumption: `v.optional(v.number())`.

**worldEvents.payload.** The contract does not fix a shape and each kind differs. Assumption: `v.any()`, with the
per kind shapes owned by slice 3.

**worldState table.** Stores `{ platform, fetchedAt, data }` where `data` is the full validated `WorldState`, so
`fetchedAt` is duplicated inside `data`. Kept both: the top level one is what slice 3 sorts on.

**Protected routes in proxy.ts.** Route groups such as `(app)` do not appear in URLs, so the matcher cannot say
`/(app)`. Assumption: protect `/dashboard`, `/rules`, `/chat`, `/settings`, and bounce signed in users away from
`/login`. Slice 2 owns the login page path, I assumed `/login` per the contract route table.

**Convex codegen.** I cannot log in to Convex, so `npx convex codegen` could not reach a deployment. I ran it against
a placeholder self hosted URL, which writes `convex/_generated/` with `components` typed as `AnyComponents`. Real
component types appear after the first `npx convex dev`.

**Magic link from address.** No sending domain was given. Assumption: `Tenno <noreply@tenno.app>` in `convex/auth.ts`,
change it when the Resend domain is verified.

**New dev dependencies.** Added `vitest`, `convex-test`, `@edge-runtime/vm` and a `test` script, per the brief.

**Branch name.** The workspace put me on `slice-1-x` rather than `dhruv/slice-1-schema`. I stayed on the branch the
workspace created.

**.env.example.** The contract references it and the file does not exist. I did not create it, no slice owns it.
I did add `.env.local` with a placeholder `NEXT_PUBLIC_CONVEX_URL` so `npm run build` passes, it is gitignored.
