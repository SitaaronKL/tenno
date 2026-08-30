# Fixed board mission types and Palladino

Assumptions and calls made in this slice. Notes live here, not at the repo root.

## Part A, the fixed boards

- The oracle lists a board's rotation in the same order the drop table prints its level bands, so the two
  are matched by index. Zariman and Cavia are five each, the Hex is seven, and both sides agree today.
  A cycle shorter than the board leaves the extra jobs as they were rather than dropping them.
- Mission type comes from the node, not from the challenge. A node in `de-names.json` already carries one,
  so `scripts/build-de-names.mjs` did not need a new field, only more nodes: WFCD has no Höllvania entries
  yet, so the script now fills the gaps from DE's own `ExportRegions.json` plus `dict.en.json` through
  browse.wf's Public Export mirror. WFCD still wins where it has the node. The table went 452 to 497 nodes.
- Challenge labels are a static map of the 51 stems the three boards use, read off browse.wf's
  `ExportChallenges.json` once, with a camel case split as the fallback. The alternative was shipping that
  233 KB file and its `|COUNT|` placeholders, which reads worse in a row than four words.
- The cycle is fetched once per rotation, in `ingest.pull` after the DE pull, and held on the snapshot as
  `bountyCycle`. The next pull inside the same rotation reuses it, so their cache is respected. The oracle
  going down keeps the held cycle, and with neither the boards are the drop table version they were before.
- Vox Solaris has no entry in the cycle. It stays exactly as it was, expiry included.
- `rot` orders the reward tables, the current rotation reads "Rotation C, now" and sits first. The
  "fixed board" label is gone, a filled board now looks like every other one.
- `zarimanFaction` and `vaultRot` are stored but not shown. DE's feed already drives the Zariman cycle tile
  and there is no vault board in the panel, so nothing to wire them to yet.

## Part B, Palladino

- The wiki's Usage table also lists the Iron Wake Scene, a Ducat decoration and sixteen Rell emotiles.
  The slice lists the eleven weekly wares the task names: two Riven Mods, Veiled Riven Cipher, Riven
  Transmuter, Endo, Credits, Kuva, and the four Requiem relics. The decorations are not weekly chores.
- Requiem Ultimatum is on the wiki's weekly limit list too but is not in the task's list, so it is left out.
  Adding it is one line in `lib/palladino.json`.
- Each ware is its own check off on the weekly key, `weekly:ironwake:<ware>:<reset>`, so the two Riven Mods
  tick separately. The Weekly box count now covers all fourteen weekly things, not four.
- The row label stays "Palladino's Iron Wake" and the row itself is now the expander, not a check off.
