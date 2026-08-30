# Builds (v2 slice 12)

What this slice added: mods and arcanes in the game data, a `builds` table with capacity and polarity
math, the `/builds` list and editor, and an agent tool that drafts a loadout.

## Data

`scripts/import-public-export.mjs` now also reads `ExportUpgrades` (1600 mods) and `ExportRelicArcane`
(3261 rows, of which 168 are arcanes, the rest are relics and carry no `levelStats`). It writes
`convex/gamedata/mods.json`, 1747 rows, 525 KB, under the 600 KB target, so descriptions stayed in.

Each row keeps uniqueName, name, kind (mod or arcane), polarity, rarity, type, slot, baseDrain,
fusionLimit, the max rank description, and parsed `effects`.

- Polarity ids are renamed to the game's school names: `AP_ATTACK` is madurai, `AP_DEFENSE` vazarin,
  `AP_TACTIC` naramon, `AP_POWER` zenurik, `AP_WARD` unairu, `AP_PRECEPT` penjaga, `AP_UMBRA` umbra.
- `type` prefers DE's `compatName`, so a stance says "Whips" where `type` only says MELEE.
- `slot` is derived: `type === "AURA"` is an aura, `isUtility === true` is exilus eligible, arcanes
  are their own slot, everything else is a normal mod.
- `effects` come from parsing the max rank stat lines, for example "+45% Ability Range" becomes
  `{ stat: "range", percent: 45 }`. 87 of 1747 rows parse into an effect. Those are the mods the
  stat preview covers: every health, shield, armor, energy, sprint, duration, efficiency, range and
  strength mod DE writes in that shape, which is the common warframe set (Vitality, Redirection,
  Steel Fiber, Flow, Rush, Intensify, Streamline, Stretch, Continuity, the corrupted duals, the
  Umbral and Primed versions). Weapon damage lines like "+165% Damage" are deliberately not parsed,
  a weapon preview needs damage math this slice does not do.
- `items.json` gained an optional `stats` field on warframes (health, shield, armor, energy, sprint)
  from `ExportWarframes`. The stat preview starts there. Weapons carry no comparable set.

Seeding is paged, 500 rows a call, because one mutation should stay small. Both commands are in the
README under Run it yourself.

## Game numbers

The brief gave "Vitality at rank 10 costs 14" as the example. DE's own export says Vitality is
`baseDrain: 2, fusionLimit: 10`, so a maxed Vitality is 12 and halves to 6. The mod that costs 14 at
rank 10 is Serration (`baseDrain: 4`). The tests assert both, against the export's numbers.

Rules implemented in `lib/builds/capacity.ts`:

- Drain is `baseDrain + rank`. An aura's baseDrain is negative and goes further negative per rank, so
  a maxed Corrosive Projection is -7.
- A matching polarity halves the drain, rounded up: 9 becomes 5, 14 becomes 7.
- A mismatched polarity adds a quarter, rounded up: 14 becomes 18, 9 becomes 12.
- An empty slot has no polarity and costs the drain flat.
- Capacity is 30, or 60 with a reactor. An aura does not spend the pool, it raises it, and a matching
  aura slot doubles what it gives.
- Mod percentages add, they never multiply, and a mod at rank r is `(r + 1) / (max + 1)` of its max
  value, which is how DE's own level tables scale.
- Efficiency is capped at 175 percent, the game stops counting past it.
- Archon shards are stored but are not in the stat math yet.

## Deviations from the brief

- `slots` carries a `polarities` object (aura, exilus, eight mods) as well as the mod refs. The brief
  asked for a forma toggle per slot but the schema it gave had nowhere to put the result. `forma`
  stays the count. The toggle stamps the slot with the polarity of whatever mod is sitting in it,
  which is what a player actually does with a forma.
- `slots.aura` and `slots.exilus` are `modRef | null` rather than optional, so an empty slot and a
  missing field are the same thing.
- The mods `search` query has a limit, but the editor asks for all of them once (about half a
  megabyte) and filters locally, so the picker answers a keystroke without a round trip. If that
  payload starts to hurt, move the filtering back to the server, the query already takes q, slot,
  polarity and type.
- The agent's draft is handed to the editor through `sessionStorage`, not a saved row, because the
  brief asks for it to open unsaved. `/builds/new` reads the key once and clears it.
- `draftBuild` is a tool over `agent/buildDrafter.ts:draftForUser`, and `/builds` calls the public
  `draft` action through the same internal action, so the chip and the chat share one rate limit
  (buildDrafts, 10 an hour, like ruleDrafts).

## Not done

- Weapon stat preview, it needs damage, multishot and status math.
- Shard effects.
- Riven mods, they carry no fixed stats in the export.
