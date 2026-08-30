# Slice 3 ingest, questions and assumptions

- `convex/schema.ts` is owned by slice 1 and did not exist on my branch, so codegen and convex-test had nothing to run against. Assumption: I added a minimal stub with only `worldState` and `worldEvents`, exactly as the contract spells them, marked with a comment. The seam agent should take slice 1's schema wholesale and drop mine.
- `internal.rules.evaluate` does not exist yet, it is slice 4. Assumption: I reference it through `makeFunctionReference<"mutation">("rules:evaluate")` so my code compiles today and resolves to the real function once slice 4 lands. No behaviour change.
- `worldEvents.payload` needs a validator. Assumption: `v.any()`, since the payload shape differs per kind and the typed shape already lives in `lib/contracts/worldstate.ts`.
- Event keys must be stable and unique per upstream entity. Assumption: upstream `id` for fissure, alert, invasion, sortie, archonHunt and baro, the nightwave act id for nightwave, and `<world>:<state>:<expiresAt>` for cycles, since cycle objects carry no id in the normalized type.
- Cycle and nightwave events have no natural end for a rule to read. Assumption: `expiresAt` is the cycle or act expiry, `startsAt` the activation.
- Baro events: one event per arrival, `startsAt` is his arrival, so a rule fires when the arrival first appears, not when he lands.
- Arbitration is a broken placeholder upstream (`node: "SolNode000"`, `typeKey: "Unknown"`, `expired: true`). Per `docs/warframe-api.md` I drop it entirely, and the normalized `WorldState` has no arbitration field anyway.
- Fissures come back with `expired` entries briefly. Assumption: I keep everything upstream returns and let the UI filter on `expiresAt`, except entries whose expiry already passed relative to `fetchedAt`.
- Added devDependencies `vitest`, `convex-test`, `@edge-runtime/vm` and a `test` script, they were missing.
- `crons.ts` is shared with slice 4. I added only the ingest interval and left a marked comment line where the digest cron goes.
- `npx convex codegen` cannot reach a deployment without login, so `convex/_generated/api.d.ts` fell back to the untyped `AnyApi` form. My code compiles against it. The seam agent should re-run codegen once a deployment exists to get the typed api.
