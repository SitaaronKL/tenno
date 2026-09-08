# Descendia weekly rotation data

Probed live on 2026-09-08. Read only research, no code changed.

## What the rotation is

Descendia is the weekly tower mode in the Dark Refractory (The Old Peace quest gates it). Each week is a 21 floor climb, the game calls the floors Infernums. Every floor has a mission type, an arena level, an enemy spec and one or more modifier auras (the wiki calls them Penances, drawn from a pool of about 40). Checkpoints sit at floors 7, 14 and 21. Everything resets Monday 00:00 UTC.

## Deterministic or fetched

Not deterministic. The wiki says the challenges are randomly chosen each weekly reset, and DE's own payload confirms it: each week carries a `RandSeed`, so the set is server seeded, not a fixed cycle like Teshin's 8 week Steel Path Honors. No cycle order exists to enumerate. An upstream fetch is required, but DE publishes the current week plus four future weeks, so one fetch covers five weeks of planner data.

## Where it lives

DE's world state is the only source that has it.

Endpoint: `GET https://api.warframe.com/cdn/worldState.php`, JSON path `Descents` (top level array). Today it holds 5 entries, one per week, Monday to Monday UTC, each with `Activation`, `Expiry`, `RandSeed` and 21 `Challenges`. This is the `Descents 6` key already noted in `docs/de-endpoints.md`, count is 5 as of this probe.

Sources that do not have it, all probed 2026-09-08:
1. `api.warframestat.us/pc`: 200 from this laptop today, no descendia related key, and their OpenAPI spec (`docs.warframestat.us/openapi.yaml`) never mentions it. The WFCD parser reads the raw `Descents` key but exposes nothing for it.
2. `oracle.browse.wf/worldState.min.json`: 200, but the oracle strips the key, it keeps only the eleven keys listed in `docs/browse-wf.md`. The browse.wf live page shows Descendia only as two completion checkboxes, no rotation data.
3. `api.tenno.tools/worldstate/pc`: 200, no descendia key at all.

## Sample (first challenge of the current week)

```json
{
  "Activation": { "$date": { "$numberLong": "1788739200000" } },
  "Expiry": { "$date": { "$numberLong": "1789344000000" } },
  "RandSeed": 1918650706,
  "Challenges": [
    {
      "Index": 1,
      "Type": "DT_INFESTED_SALVAGE",
      "Challenge": "VeryToxic",
      "Level": "/Lotus/Levels/DevilTower/ArenaAvocado.level",
      "Specs": ["/Lotus/Types/Game/EnemySpecs/CorpusGrineerMix"],
      "Auras": ["/Lotus/Types/Scripts/Tau/CoH/Complications/ToxicLeechEnhancementAura"]
    }
  ]
}
```

Across the five weeks on file: 21 distinct `Type` values (`DT_EXTERMINATE`, `DT_DEFENSE`, `DT_BOSS`, `DT_NETRACELLS`, `DT_PROTOFRAME`, `DT_RACE` and so on) and about 50 `Challenge` stems (`GrenadesOnly`, `HeadShotsOnly`, `GlassMaker`, `ArchonBoreal`, `Kullervo`, `NC_SlipAndSlide`, ...). Some floors have empty `Specs` and `Auras`.

## Naming

The `DT_*` types, challenge stems, arena levels and aura paths are internal names with no entry in WFCD's data or the Public Export tables we already use. Options, in order: a small hand written label map like the challenge labels in `convex/ingest/bountyCycle.ts` (camel case split covers most stems), or `oracle.browse.wf/dicts/en.json` which carries strings DE omits from the export, worth checking for the `DT_*` and aura paths when we build the card.

## Recommendation

Ingest from DE's worldState.php, do not compute. Our pull already fetches this exact file, so the work is reading one more key: map each `Descents` entry to week bounds, seed and 21 floors, keep all five weeks for the planner, and label names locally. WarframeStat.us cannot serve as the fallback here since it drops the key, so on a failed DE pull hold the last snapshot, five weeks of lookahead makes staleness cheap.
