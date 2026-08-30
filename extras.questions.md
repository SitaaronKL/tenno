# extras: daily and weekly extras

Questions raised while building the slice, and the assumption each one continued with.

## Data

**The schedule files are mirrored as JSON, not as the raw text.** The brief allowed either. JSON imports
cleanly in the Convex bundler and in vitest, raw text would need a loader. Both files are one contiguous run
of timestamps, so each is stored as `{ from, values }` rather than a map keyed by timestamp: `spIncursions.json`
is 58 KB for 800 days, `arbitrations.json` is 10 KB for 31 days, both well under the 150 KB budget. The format
is written into the file itself and into `docs/de-endpoints.md` section 5b.

**Both windows open a day back, not at the current hour.** A world state snapshot a few hours old still has to
resolve, and the DE fixture is captured at 04:21 UTC. `scripts/refresh-schedules.mjs` starts both windows at
yesterday's UTC midnight.

**The arbitration window is 31 days, so it has to be re-trimmed about monthly.** When it runs out
`currentArbitration` returns null and the tile disappears rather than guessing. Noted in the doc, and the
script refreshes incursions in the same run.

**About half the arbitration nodes have no Goons tier.** `tier` is an empty string for those, the tile hides it,
and a rule that filters on tiers never matches an unrated node.

**`WorldState.incursions` is `string[]`, so the box prints nodes only.** The brief fixed the type, and the
schedule file carries nodes with no mission type. `de-names.json` does know each node's mission type, but it is
632 KB of ingest data that must not reach the browser, so the box shows the six friendly node names.

**Teshin's order was verified against the wiki.** `wiki.warframe.com/w/The_Steel_Path`, section Weekly Rotating
Offer, lists the same eight items in the same order as `docs/browse-wf.md`. Its epoch is 2020-11-16, which is
216 weeks before the 2025-01-06 epoch used here, a whole number of 8 week loops, so the two agree. The source
is named in `lib/teshin.ts` and in `docs/browse-wf.md`.

**Circuit comes from DE's `EndlessXpSchedule`, not from a static table.** DE has reset the cycle before, so the
feed is the safer source, as `docs/browse-wf.md` already argued.

## Placement

**The Weekly box sits where the Baro box used to.** Baro still renders in that slot when he is actually here,
which is two days in fourteen. The Weekly box is always there, and Baro takes the slot beside it when he lands.

**Arbitration is the tenth tile.** It sits after Baro and before the two reset tiles, so the row reads
"what is up now" then "what rolls over". With Baro away the grid is two rows of five with nothing empty.

**Darvo's deal has no check off.** It is daily, not weekly, and it is a purchase, not a chore. The pill counts
the four weekly tasks only: Teshin, Iron Wake, Circuit and Circuit Steel Path.

## Contract changes

`lib/contracts/worldstate.ts` gains `Arbitration`, `Circuit`, `DarvoDeal` and `GameEvent`, and five optional
`WorldState` fields (`incursions`, `arbitration`, `circuit`, `darvo`, `events`). All optional, so rows written
before this slice still read back. `convex/schema.ts` mirrors them.

`lib/contracts/rule.ts` gains the `arbitration` kind `{ missionTypes, tiers }`, mirrored in
`convex/lib/validators.ts`, matched in `convex/matcher.ts`, summarized in `convex/notify.ts` and
`components/rules/sentence.ts`, buildable in the rule form, and offered as a suggestion chip.

## Files another slice owns that this one touched

- `convex/ingest/normalize.ts` and `de.ts`: the two normalizers, one new field each plus the DE only extras.
- `convex/ingest/de.ts` lost its three private node helpers to the new `convex/ingest/names.ts`, which the
  schedule lookups need too. Same behavior, one copy.
- `convex/ingest/normalize.test.ts`: the test asserting the warframestat path has no `arbitration` key now
  asserts what actually matters, that upstream's `SolNode000` placeholder never gets through.
- `components/panels/cycles.tsx`: one tile. `dashboard-grid.tsx`: two boxes and the events line.
- `components/panels/checkoffs.tsx`: two key helpers, `incursionKey` and `weeklyKey`.

## Size

The slice is about 700 added lines of real code against the 300 line guide, because the brief is six features
plus a rule kind. Splitting it would have meant six branches over the same three contract files.
