# Slice 11, upstream fallback

Questions and the assumptions I continued with.

## Source order was inverted mid slice

The brief started with warframestat first and DE as the fallback. Measured live at 04:22Z, DE was 0 minutes
old with 23 active missions while warframestat was 174 minutes old with every fissure expired, so the
orchestrator inverted the order. Shipped order: DE is primary and `normalizeDe` runs every tick, warframestat
is read only when the DE fetch fails or the body does not parse as JSON. The ten minute staleness check runs
on whichever source answered, unchanged.

Assumption: a stale but parseable DE body is still better than warframestat, so staleness alone does not
trigger a fallback. `stale` is reported and the dashboard banner says so.

## Friendly names: static JSON, not a runtime fetch

Nodes, mission types, factions, sortie bosses and modifiers, item names and nightwave challenge titles are
all internal ids in DE's feed. I ship a generated lookup at `convex/ingest/de-names.json` (about 590 KB),
built by `scripts/build-de-names.mjs` from WFCD `warframe-worldstate-data`
(`solNodes`, `missionTypes`, `factionsData`, `sortieData`, `languages`).

Why static rather than fetch once and cache: the fallback exists for the case where an upstream is down, and
a second network dependency at exactly that moment is the thing being avoided. A static file also keeps the
ingest action pure and testable. Cost: the file goes stale on a game update, so rerun the script when
`BuildLabel` changes. Language keys are lowercased on build because DE spells the same `/Lotus` path with
different casing across feeds.

Cross checked the mapping against `api.tenno.tools/worldstate/pc`, which parses the same DE snapshot:
`SolNode216` to Valefor (Europa), `MT_EXCAVATE` to Excavation, `VoidT3` to Neo, `SORTIE_BOSS_TYL` to
Tyl Regor, `/Lotus/Types/Items/MiscItems/WaterFightBucks` to Nakak Pearls. All agree.

Not verified: whether a 590 KB JSON import is comfortable inside a deployed Convex action bundle. It type
checks, bundles and tests fine locally, but there is no deployment on this branch to push to. If it turns out
to be a problem, the narrow fix is to drop the `names` table down to the `/lotus/types/items` and
`/lotus/types/challenges` prefixes, which is about 390 KB.

## Cycles are computed, and all six are derivable

DE does not publish the open world cycles. Every one of them is derived, and each was checked against
warframestat's own values for the same instant before being kept:

- Cetus, from the `CetusSyndicate` bounty expiry. The bounty rotation ends with night, day is 100 minutes and
  night is 50.
- Cambion rides the Cetus clock, fass is day and vome is night.
- Zariman, from the `ZarimanSyndicate` bounty expiry against a confirmed Corpus start of 1655182800000, a
  five hour full cycle flipping faction at the halfway mark.
- Earth, a plain 8 hour cycle aligned to the unix epoch, 4 hours of day then 4 of night.
- Vallis, a 26m40s loop from a known warm start of 2026-02-04T19:46:48Z, warm for the first 6m40s.
- Duviri, five two hour spirals, sorrow, fear, joy, anger, envy, anchored 52 seconds after the epoch.

So no cycle is left out. The three bounty derived ones degrade safely: if the syndicate entry is missing from
the feed, that cycle is dropped rather than guessed.

Assumption: the Vallis and Duviri anchor constants come from the WFCD parser, which is the same source
warframestat uses. They are magic numbers with no upstream to validate them against beyond that agreement.

## Smaller calls

- `Invasion.completion` is computed as `((1 + Count / Goal) / 2) * 100`, the defender percentage, matching
  what warframestat reports for the same rows.
- Nightwave standing is not in DE's feed. It is fixed per tier, so it is derived from the challenge path:
  daily 1000, weekly 4500, `WeeklyHard` elite 7000.
- Void Storms carry no mission type of their own, so the star chart node supplies both the Railjack mission
  type and the enemy faction.
- Fissure enemy faction is likewise read off the node table, DE's `ActiveMissions` rows do not carry one.
- An unknown `/Lotus` path falls back to the last path segment rather than rendering the whole string.

## Contract changes, logged as the contract requires

`WorldState.source` is new, `"warframestat" | "de"`, optional so world state rows written before this slice
still validate. Added in all three places: `lib/contracts/worldstate.ts`, `vSource` in
`convex/lib/validators.ts`, and the `worldStateValidator` in `convex/schema.ts`.

## UI

One edit in `components/panels/dashboard-grid.tsx`: the stale notice now appends
"Live from Digital Extremes" when the source is DE. A polish agent is editing `app/` and `components/` at the
same time, so nothing else was touched. I did add the matching case to `dashboard-grid.test.tsx`, which that
agent may also be editing, a trivial conflict if so.
