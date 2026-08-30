# Archimedea, questions and assumptions

## Contract changes logged here, as the contract asks

- `lib/contracts/worldstate.ts` gained `Archimedea` and `ArchimedeaMission`, plus an optional
  `archimedea` on `WorldState`. Mirrored in `convex/schema.ts` as `v.optional(v.array(archimedea))`,
  so a world state row written before this slice still validates.
- `lib/contracts/rule.ts` and `convex/lib/validators.ts` both gained the `archimedea` kind.
- `convex/ingest/apply.ts` emits one `archimedea` world event per variant per weekly rotation.

## Names all resolved, the lookup tables needed no change

Every deviation, risk and personal modifier DE writes in `Conquests` is a bare id that already sits in
the language table `scripts/build-de-names.mjs` builds, so the script is untouched. Checked against the
fixture: `VolatileGrenades` reads back "Hazardous Goods", `Knifestep` reads "Knifestep Syndrome",
`DoubleTroubleLegacyte` reads "Mitosis", and so on for all 24 ids in the capture. Nothing failed to
resolve. `MT_ALCHEMY` and `MT_ENDLESS_CAPTURE` are in `missionTypes` too, as "Alchemy" and
"Legacyte Harvest".

The only ids the tables do not carry are the conquest types themselves, `CT_LAB` and `CT_HEX`. Those
are mapped in `convex/ingest/de.ts` instead, `CT_LAB` to `deep` and `CT_HEX` to `temporal`. A type
neither one names is skipped rather than shown as an id.

## Assumptions, none confirmed against the game

- `CT_LAB` is Deep Archimedea (Sanctum Anatomica, Cavia) and `CT_HEX` is Temporal Archimedea
  (Hollvania, The Hex). The mission types and factions in the fixture agree with that reading.
- Normal and elite share a deviation, so the deviation is read from the `CD_NORMAL` difficulty only,
  the same choice WFCD's parser makes.
- Elite repeats the normal risks and appends its own, so `eliteBonus` is the tail of the `CD_HARD`
  risk list. It is one entry per mission, in mission order, and a mission that gained more than one
  risk reads as one comma joined entry so the index still lines up with `missions`. In the capture
  every mission gains exactly one.
- `Variables` are the personal modifiers, shared by both difficulties.
- The key is `variant:expiresAt`, so the rotation is news once and a second pull inside the same week
  says nothing.

## WeeklyVaultBonusRewards is read but not shown

The fixture carries two entries, this week and next, each a bonus region and four point thresholds.
They belong to Netracells as much as to Archimedea, and the box asked for is the mission set, so this
slice parses no rewards. Folding them in is a follow up.

## Node is always absent today

DE ships no star chart node inside `Conquests`, only a faction and a mission type, so `node` is
optional on `ArchimedeaMission` and every mission parsed from the fixture leaves it out. The panel
renders it when it appears.
