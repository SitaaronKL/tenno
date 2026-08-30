# Slice 5 questions and assumptions

- `convex/_generated` does not exist yet, so `api.worldstate.get` is unavailable. Assumption: reference the query by name with `makeFunctionReference<"query", {platform:"pc"}, WorldState | null>("worldstate:get")` in `components/panels/world-state.ts`. Swap it for `api.worldstate.get` once slice 1 or 3 lands codegen. The call site signature is unchanged.
- `app/(app)/layout.tsx` and `ConvexClientProvider` are owned by slices 1 and 2 and are not in the tree yet. Assumption: the dashboard page renders on its own for now, and the provider wraps it later. The route is `force-dynamic` so a build never prerenders a Convex query without a provider.
- Dev deps added for tests: vitest, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, jsdom, plus `vitest.config.ts`, `vitest.setup.ts` and a `test` script. `@vitejs/plugin-react` was skipped, it conflicts with the installed babel 8, vitest transforms JSX from tsconfig on its own. `convex-test` is not needed here, this slice has no Convex functions.
- Panel set beyond the contract: the layout follows hub.warframestat.us. Assumption: a three column grid, Fissures and Invasions span two columns, everything else is one.
- Arbitration is a known placeholder upstream, per docs/ARCHITECTURE.md, so no arbitration panel.
- Cycles: the contract lists six worlds. Assumption: render only worlds present in the snapshot, in a fixed order, so a partial ingest does not show blanks.
- Baro: when inactive we count down to `startsAt` and hide inventory, when active we count down to `expiresAt` and list items with ducats and credits.
