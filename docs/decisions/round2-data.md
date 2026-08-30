# round2 data: bounties, fissure order, optional fields

## Readability target

`curl api.tenno.tools/worldstate/pc` presents bounties as one entry per syndicate, each with a
`syndicate` display name and a `jobs` array whose rewards are resolved item names with counts
("Voidplume Down", "3X 1,500 Credits Cache"), never a `/Lotus/...` path and never a table id. That is
the bar this slice meets: every reward we hand a panel is a name a player would read on the board.
tenno.tools also carries per reward drop chance and rotation. The contract shape for this slice is
`rewards: string[]`, so chance and rotation are dropped, the names are kept.

## Assumptions

- Bounty shape follows the slice brief exactly: `{ syndicate, node, expiresAt, jobs: [{ level,
  minLevel, maxLevel, standing, rewards }] }`. Job type name ("Capture Their Leader"), mastery
  requirement and per stage standing are all available from both upstreams but are not in the shape,
  so they are not carried. Say the word and they are a two line change.
- `standing` is the sum of the stages, the standing a full run pays. Both upstreams ship the per
  stage array.
- `level` is the string the in game board prints, `"5 - 15"`. `minLevel` and `maxLevel` are kept
  alongside it so a rule can compare numbers later.
- A board is any `SyndicateMissions` entry that carries jobs. That picks up Ostron, Solaris United
  and Entrati today and will pick up The Holdfasts, Cavia and The Hex the moment DE puts jobs on
  them, with no code change. Every other syndicate entry is a mission offering rotation, not a board.
- Neither upstream says where a board is: DE and warframestat both send `Nodes: []`. The hub node is
  a six entry table in `convex/ingest/bounties.ts`. A syndicate not in it gets `node: ""` rather than
  a guess.
- Jobs are kept in upstream order, which is the order the board shows them, low level first with the
  isolation vaults last.

## Resolving reward tables

DE gives a table path only, for example
`/Lotus/Types/Game/MissionDecks/EidolonJobMissionRewards/TierATableBRewards`. Two sources resolve it,
both baked into `convex/ingest/de-names.json` by `scripts/build-de-names.mjs` so the DE reader never
depends on a second upstream at request time:

1. WFCD `warframe-drop-data` bounty tables (`cetusBountyRewards`, `solarisBountyRewards`,
   `deimosRewards`, `zarimanRewards`, `entratiLabRewards`, `hexRewards`), keyed by the level range
   and rotation the game prints, for example `level 5 - 15 cetus bounty|b`. 97 tables. This is what
   WFCD's own parser fetches live from `api.warframestat.us/drops`, we ship a snapshot instead.
2. WFCD `languages.json`, which names some tables as a comma separated list. Used only when the drop
   table misses.

On the current fixture all 23 jobs resolve through source 1, including the Deimos and Narmer tables
that `languages.json` does not carry at all. A path neither source knows leaves `rewards: []` rather
than leaking an id into the UI.

Not resolvable, noted rather than faked:

- Arcana isolation vaults. Drop data has both "Isolation Vault" and "Arcana Isolation Vault" rows,
  DE's payload carries no flag telling them apart (WFCD says the same in `SyndicateJob.ts`), so the
  plain vault table is used for both.
- Reward tables for boards DE is not running right now (Zariman, Cavia, Hex). Their level ranges are
  in the shipped table and the syndicate tag maps to the right variant, but the mapping is untested
  against a live payload because DE lists no jobs for them today.
- Per reward drop chance and rotation letter. Available in the drop data, dropped to fit
  `rewards: string[]`.

`scripts/build-de-names.mjs` now writes `syndicates` and `bountyRewards` on top of what it wrote
before. `de-names.json` grew from 600 KB to 632 KB. Rerun it after a game update.

## Fixture

`convex/ingest/__fixtures__/de.json` already carried bounties for Ostron, Solaris and Entrati, so no
refresh was needed. A live refresh was attempted and `api.warframe.com/cdn/worldState.php` answered
403 to curl from this machine, plain UA and browser UA alike, which matches the rate limit note in
`docs/de-endpoints.md`. The fixture stands at build `Time` 2026-08-30T04:20:27Z.

## Other

- `worldstate.get` now sorts fissures Lith, Meso, Neo, Axi, Requiem, Omnia, then soonest expiry
  inside a tier. Sorting is at the read, next to the expiry filter, so ingest keeps upstream order.
- `bounties` is optional on the stored validator and on the `WorldState` type so rows written before
  this slice still validate. `worldstate.get` fills it with `[]`, so a panel never has to check.
- No new packages.
