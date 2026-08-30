# Rule suggestions, questions and assumptions

## Contract changes logged here, as the contract asks

- `lib/contracts/rule.ts` and `convex/lib/validators.ts` both gained the `bounty` and `reset` kinds,
  `leadMinutes` on `cycle`, and `modifiers` on `sortie`. The zod side uses `.default(null)` for the two
  added fields so an old stored filter still parses, the Convex side marks them `v.optional` so an old
  stored row still reads back through `vRuleDoc`.
- `lib/contracts/worldstate.ts` gained an optional `missionType` on `BountyJob`, mirrored in
  `convex/schema.ts` as `v.optional(v.string())`.
- `convex/crons.ts` gained the "resets" hourly entry. `convex/resets.ts` is new.

## Syndicates the fixture does or does not carry

`convex/ingest/__fixtures__/de.json` has jobs for exactly three boards: `EntratiSyndicate` (Entrati),
`CetusSyndicate` (Ostrons) and `SolarisSyndicate` (Solaris United). `ZarimanSyndicate` (The Holdfasts),
`HexSyndicate` (The Hex) and `EntratiLabSyndicate` (Cavia) are present in `SyndicateMissions` but carry
zero jobs in this capture, so no board is emitted for them. Their names still resolve through the
syndicate table, so a rule naming them will match the moment DE ships jobs for them. The
"Tier 5 bounty is Exterminate" suggestion therefore cannot be exercised against the fixture, and the
Zariman job path is covered by a direct unit test of `bountyMissionType` instead.

## Mission type derivation

DE writes a job as a path, and it names the mission two different ways. Venus and Cetus append it after
`Job` or `Bounty` (`VenusSpyJobSpy`, `AttritionBountyExt`, where `Ext` is a three letter code), Deimos
and Zariman spell it inside the name (`DeimosExcavateBounty`). `bountyMissionType` reads the tail first,
falls back to the whole segment, and returns an empty string when neither names a mission.

Assumptions, none of them confirmed against the game:
- `Purify` maps to `Defense`, it is the infested hold the ground objective.
- `Reclamation` and `Preservation` map to `Recovery`.
- Isolation Vault jobs carry no `jobType` at all, so they carry no mission type. They are the only jobs
  in the fixture without one.

## Cycle lead time

`ingest/apply.ts` only ever emits the phase that is running now, so a lead rule on the current phase is
always already past and `rules.evaluate` skips it. The lead path is real and tested, but it only fires
for a cycle event whose `startsAt` is in the future. Emitting the next phase ahead of time is the
follow up that makes lead rules useful every cycle, it was out of this slice's scope.

## Suggestion channels

"Channels from the user's profile, email by default" was read as: email always, plus iMessage when the
profile has a verified phone. The user still confirms the rule in the dialog, so a wrong guess costs a
click.

## Board level

`level` is the job's position on the board, 1 to 5, not the enemy level range. Boards with fewer than
five jobs (the fixture's Entrati board has six plus three vaults) simply do not match a level past
their end.
