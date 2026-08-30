# v2 resources questions

Slice: resource tracker, roadmap v2 slice 14. Branch `dhruv/resources`.

## For the seam agent

### 1. Schema block to merge

`convex/schema.ts` carries a marked `v2-resources` block at the end. Those lines are the only ones
this slice touched in that file.

```ts
dropSources: defineTable({
  itemName: v.string(),
  sources: v.array(v.object({ place: v.string(), rotation: v.string(), chance: v.number() })),
}).index("by_item_name", ["itemName"]),

goals: defineTable({
  userId: v.id("users"),
  itemName: v.string(),
  wantedCount: v.number(),
  haveCount: v.number(),
  fromBuildId: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_user", ["userId"]),
```

### 2. Nav entry

`components/shell/nav.ts` gains `{ href: "/resources", label: "Resources", icon: PackageIcon }`
between Chat and Mastery, with a new animated icon at `components/icons/package.tsx`.

### 3. Generated api

`convex/_generated/api.d.ts` was hand edited to name the four new modules. `npx convex codegen`
bundles and pushes to the dev deployment (see the note in `docs/decisions/round2-data.md` territory
and the memory on this repo), and the deployment is shared with the builds worker, so pushing a half
finished schema was the worse option. Rerun codegen when the branches merge, the file will come back
identical.

## Questions and assumptions

### `fromBuildId` is a string, not an id

The builds table belongs to the parallel `dhruv/builds` worker. Typing the field as `v.id("builds")`
would need that table in the schema, which is theirs to add. **Assumption:** a string holds the id
until the tables meet, then it can be tightened in one line.

### mods data does not exist yet

The brief says to trim drop sources to items in our items or mods data. There is no mods table and no
`convex/gamedata/mods.json` on origin. **Assumption:** the trim reads `mods.json` when it is there
and skips it when it is not, and the run prints which it did. Rerun
`node scripts/build-drop-sources.mjs` after the builds slice lands and mod drops appear.

### item components have no names, so a second data file exists

`convex/gamedata/items.json` stores components as bare uniqueNames. Nothing else in the repo names
`/Lotus/Types/Items/MiscItems/Neurode`, and a part's own recipe (the second level the brief asks for)
is not in there either. `scripts/build-components.mjs` writes `convex/gamedata/components.json`, 1095
parts, 257 KB, from DE's Public Export: name plus, for a part, its ingredients. Raw resources also
carry a recipe, the Helminth converter, so only `/Lotus/Types/Recipes/` and `/Lotus/Weapons/` paths
count as parts. Otherwise Neurodes would explode into 50,000 Alloy Plate.

### explosion adds the part and its resources

"Recursively one level" is read as: a part is a goal, because you farm the part, and what the part is
built from is a goal too, because you farm that separately. A Prime Neuroptics comes out of a relic
and then eats Rubedo, and a tracker that showed only one of those would be wrong either way. Counts
merge across parts, so three parts asking for Rubedo make one goal.

### the drop table cut

`convex/gamedata/dropSources.json` is 321 KB, 1386 items, 5075 sources, from 30138 rows read.
The cut, recorded in the file under `cut`: eight sources an item, best chance first with one entry a
place before a second rotation of the same place, and only items our own data names. 2517 rows were
dropped past the per item cap, and everything the drop tables list that we cannot name was skipped.
The script throws rather than writing a file over 800 KB.

### fissures light the badge through relics

A fissure carries no reward list, so "live now" for a fissure means: this item drops from a relic of a
tier that has a fissure open. Invasions, alerts and bounties match on the reward name directly, after
stripping the count and the word Blueprint the drop tables print into it.

### no rule kind fits a fissure

`RuleFilter` has nowhere to put an item name on a fissure rule, so a row whose only live source is a
fissure shows no "Farm this" button rather than a rule that would fire on every Axi fissure forever.
Invasion, alert and bounty rules prefill from the row.

### the seeds are not run here

`npx convex run` needs the deployment, and this worker is codegen only. `/resources` shows its empty
state until somebody runs the two import steps in the README.
