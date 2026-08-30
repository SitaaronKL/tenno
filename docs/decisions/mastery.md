# round2-mastery questions

Slice: mastery tracker. Branch `dhruv/round2-mastery`.

## For the seam agent

### 1. Schema block to merge

`convex/schema.ts` now carries a marked block at the end, plus a `masteryKind` union declared
above the schema. Merge both, they are the only lines this slice touched in that file.

```ts
export const masteryKind = v.union(
  v.literal("warframe"), v.literal("primary"), v.literal("secondary"), v.literal("melee"),
  v.literal("companion"), v.literal("archwing"), v.literal("other"),
);

items: defineTable({
  uniqueName: v.string(),
  name: v.string(),
  category: v.string(),          // DE productCategory, kept for debugging
  kind: masteryKind,
  masteryReq: v.number(),
  masteryXp: v.number(),
  buildable: v.boolean(),
  components: v.array(v.object({ itemType: v.string(), count: v.number() })),
}).index("by_unique_name", ["uniqueName"]).index("by_kind", ["kind"]),

starNodes: defineTable({
  uniqueName: v.string(), name: v.string(), planet: v.string(), masteryReq: v.number(),
}).index("by_unique_name", ["uniqueName"]),

profileCache: defineTable({
  playerId: v.string(), fetchedAt: v.number(), displayName: v.string(),
  masteryRank: v.number(), nodesCompleted: v.number(),
  xpByItem: v.array(v.object({ uniqueName: v.string(), xp: v.number() })),
}).index("by_player", ["playerId"]),
```

### 2. Nav entry

`components/shell/nav.ts` already exists, so the entry is appended there, before Settings:

```ts
{ href: "/mastery", label: "Mastery", icon: AtomIcon },
```

It reuses `components/icons/atom.tsx` because this slice does not own `components/icons`. Swap it
for a dedicated mark if one lands.

### 3. Two data tables

Another worker is writing `components/panels/data-table.tsx` for the dashboard. Mine is
`components/mastery/data-table.tsx` plus `data-table-features.ts` and `columns.tsx`. They should be
deduped into one shared table once both land. Mine registers only column filtering, sorting and
pagination, no visibility or selection.

### 4. Seeding game data after deploy

Nothing in this slice runs at deploy time. After a push, run once:

```
node scripts/import-public-export.mjs        # refreshes convex/gamedata/*.json
npx convex run gamedata/import:importGameData '{}'
```

The `/mastery` table is empty until that runs.

## Assumptions I continued with

- **LZMA.** Node has no LZMA and this machine has no `xz`, so the import script uses the pure JS
  `lzma-purejs` as a devDependency. New package, logged here as the contract requires.
- **TanStack Table v9.** Added `@tanstack/react-table@^9` per Dhruv's note and `docs/nextjs/data-table.md`.
  `docs/MARKET.md` bans TanStack Query, not Table, so this is not a conflict.
- **Which items give mastery.** Anything whose `productCategory` maps to one of our seven kinds, minus
  rows flagged `excludeFromCodex`. `SpecialItems` (exalted weapons, Venari, Orion & Sirius) and
  `OperatorAmps` are dropped: they rank up but they are not separate mastery entries.
- **Mastery xp.** 200 a level for frames, archwings, necramechs and companions, 100 a level for
  weapons, times `maxLevelCap` when DE sets it, else 30. Necramechs have no `maxLevelCap` in the
  export so they are hard coded to 40 levels.
- **Mastered.** An item counts as mastered when its `XPInfo` affinity reaches its full mastery xp.
  DE gives no explicit flag, this is the same rule the community trackers use.
- **Duplicate XPInfo rows.** A player can hold the same item twice, the parser keeps the higher
  affinity.
- **Prime filter.** Matched on the word Prime in the item name. DE has no Prime field and every
  Prime carries the word, so this is exact in practice.
- **Node completions.** Counted from `Results[0].Missions` where `Completes > 0`, shown as one number
  in the rank tile rather than a star chart. `starNodes` is seeded so a later slice can render it.
- **Player id storage.** Kept in `localStorage`, not on the profile row, because `profiles` is owned by
  another slice. Move it to `profiles.playerId` if that slice wants it.
- **Auth.** `mastery.progress` calls `requireUser`, per the contract, even though the item list itself
  is public game data. The page lives under `(app)` so it is authed anyway.
- **Rate limit.** `profileSync.fetchProfile` is 6 lookups an hour per user through the rate limiter
  component, with a 6 hour cache per player id, matching the `docs/MARKET.md` guardrail. The cache
  is checked before the limiter so a repeat read of a warm profile is free.
- **Codegen.** Ran `npx convex codegen` only, never `convex dev` or `convex deploy`.
