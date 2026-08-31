# Bundle diet

The deploy took 21 minutes because five reference data files, about 2.2 MB of JSON, were imported by
Convex function modules and so were bundled into every function that could reach them. This slice
takes them out of the bundle without taking them out of the repo.

## What moved where

| File | Was | Is now |
| --- | --- | --- |
| `convex/gamedata/mods.json` (525 KB) | imported by `gamedata/importMods.ts` | `mods` table, `scripts/seed-tables.mjs` |
| `convex/gamedata/items.json` (404 KB) | imported by `gamedata/import.ts` | `items` table, same script |
| `convex/gamedata/nodes.json` (21 KB) | imported by `gamedata/import.ts` | `starNodes` table, same script |
| `convex/gamedata/dropSources.json` (321 KB) | imported by `gamedata/dropSources.ts` | `dropSources` table, same script |
| `convex/gamedata/components.json` (257 KB) | imported by `convex/goals.ts` | new `parts` table, same script |
| `convex/ingest/de-names.json` `names` (555 KB) | imported by `ingest/de.ts` | new `deNames` table, same script |

JSON still imported by `convex/**` outside tests, which is what a function bundle can carry:

```
 78574  convex/ingest/de-names.json     nodes, factions, syndicates, bounty rewards, bare id modifiers
 59419  convex/ingest/spIncursions.json two years of Steel Path incursion days
 18663  convex/ingest/arbitrations.json sixty days of hourly arbitrations
  9871  convex/ingest/staticBounties.json
   774  convex/ingest/arbyTiers.json
------
163 KB total, against a 300 KB budget. de-names.json is 78 KB, against a 150 KB budget.
```

## Why a table for the DE name paths

`de-names.json` was 636 KB and 555 KB of that was `names`, 6354 `/Lotus/...` paths mapped to the
words a player reads. Instrumenting `normalizeDe` against the checked in snapshot showed it resolves
45 of them, 21 with a path. So the file was 550 KB of bundle to answer a few dozen lookups.

The split is by key shape, because that matches how the parser uses them:

- Bare ids, the sortie and Archimedea modifiers, 103 of them, stay in the bundle. They are small and
  every snapshot names several.
- `/Lotus` paths go to the `deNames` table, keyed by lowercase path.

`normalizeDe` is synchronous, so it cannot read a table itself. `ingest/pull.ts` walks the raw
snapshot for `/lotus/` strings with the new `deNamePaths`, reads those rows through
`ingest/names.lookup`, and hands the map to `normalizeDe`. Every `named()` key is a string DE wrote
into the snapshot, so the walk finds all of them: about 480 paths a snapshot, one indexed read each,
once every five minutes. `normalizeDe` holds the map in a module level slot rather than threading it
through a dozen parsers, which is safe because the function is synchronous end to end.

An unknown path still falls back to the tail of the path, exactly as before, so ingest degrades to
the old behaviour rather than failing if the table is empty.

## Why `parts` is a new table

`convex/goals.ts` needed `components.json` for two things, the name list the search box filters and
`explodeRecipe`. Both run with a ctx, so both can read a table. `parts` only overlaps the `items`
table by 46 rows out of 1095, so it is its own table rather than a column on `items`.

## Why the seed moved to `convex import`

`importMods`, `importGameData` and `importDropSources` existed to page a bundled file into a table.
Now that the file is not bundled, they take their rows from args only, and are the partial refresh
path after a game update. The full seed is `scripts/seed-tables.mjs`, which shapes each file into
JSON Lines and shells out to `npx convex import --table <t> --format jsonLines --replace`. Every one
of these tables is game data, identical for every user and rebuilt by its own build script, so
replacing the table is right and merging would only leave rows behind after a game update.

The script exports `TABLES`, `shape` and `toJsonl` so `scripts/seed-tables.test.mjs` can check the
shaping on five rows inline, with no network and no deployment. `vitest.config.ts` gained a third
project, `scripts`, to run it.

## TypeScript: what worked and what did not

The intent was to stop tsc inferring a 500 KB literal type per data file, with an ambient
`declare module "*.json"` and `resolveJsonModule` off, so each file is cast once by a loader module.
That does work, and it measured well, but `next build` rewrites `tsconfig.json` and sets
`resolveJsonModule` back to `true` on every run, calling it a mandatory change. So the flag cannot
stay off in this repo.

What is left is the part that survives: the big files are no longer in the TypeScript program at
all, because no `.ts` imports them any more, and the files that remain are read through two loader
modules, `ingest/nameTables.ts` and `ingest/scheduleData.ts`, that cast once and export a small
shape. `lib/palladino.ts` does the same. Downstream files see `Record<string, NodeEntry>`, not a
literal per key.

Measured on a cold `npx tsc --noEmit`, best of three:

|  | before | after |
| --- | --- | --- |
| wall | 4.05s | 3.71s |
| user | 7.01s | 6.10s |
| types | 244,765 | 188,381 |
| memory | 1023 MB | 942 MB |

Honest reading: the JSON was never what made tsc slow here, it was about a fifth of the type count
and a tenth of the time. The 21 minute deploy was the real cost, and that is a bundle problem, not a
tsc one. `npx convex codegen --typecheck disable` runs in 4.1s.

The `de.test.ts` fixture used to get its names from the bundled file. It now reads
`convex/ingest/__fixtures__/de-names.json`, the same table cut to the 134 paths the checked in
snapshot names, 14 KB rather than 555 KB. `scripts/build-de-names.mjs` rewrites that cut whenever it
rewrites the table, so the fixture cannot drift into naming items by the tail of their path.

That cut is read from inside `de.test.ts`, not from a helper module beside it. Convex treats every
`.ts` under `convex/` that is not a test as a module and bundles it, which a first pass proved by
putting `ingest/__fixtures__/names` in the generated api. Test files are the only place under
`convex/` where a fixture import stays out of the deploy.

## Schedules

`spIncursions.json` and `arbitrations.json` stay bundled: they are a clock, ingest reads them on
every pull, and a table read per pull buys nothing at 78 KB. `scripts/refresh-schedules.mjs` caps
arbitrations at 60 days, 1440 hourly entries and 18 KB. Incursions stay at 800 days because the
whole file is only 59 KB.

Both files run out, so `convex/ingest/horizon.ts` is a daily cron that warns seven days before
whichever schedule ends, naming `node scripts/refresh-schedules.mjs`. It warns rather than throws:
a schedule that has run out leaves two panels empty, it does not break ingest.

## Assumptions

- `--replace` on a seed table is safe because none of these tables carry user data. `goals` and
  `builds` reference `items` and `mods` by `uniqueName`, a string, not by document id, so replacing
  a row does not orphan anything.
- The 480 path lookups a snapshot costs are cheap enough at one pull every five minutes. If ingest
  ever gets hot, the fix is to cache the resolved map by snapshot `Time` rather than to re-bundle.
- `npx convex codegen` uploads to the deployment as a side effect. It was run against the dev
  deployment named in `.env.local`, and nothing else in this slice was deployed. The seed commands
  in the README still have to be run once after this ships, or `/resources`, `/mastery`, `/builds`
  and DE item names all come up empty.
