# hide-prefs, assumptions

Slice: bounty rows and hide preferences. Branch `dhruv/hide-prefs`.

- Hidden keys carry their group: `box.*`, `board.*`, `tile.*`. A flat list would collide, Baro is a box
  and a tile, Cetus is a board and a tile. The extras slice keys are `box.incursions`, `box.weekly` and
  `tile.arbitration`, their switches already draw and take effect the moment those pieces land.
- The one list lives in `lib/contracts/preferences.ts`. `convex/profiles.ts` imports it, so a key the UI
  never draws is refused on the way in.
- A bounty row prints the derived level band, "5 to 15", not upstream's raw "5 - 15" string, so it reads
  the way the rest of the app does and keeps dashes out of prose.
- A job's `title` no longer shows. The row is the level band, the mission type, and the standing, and a
  job with no mission type reads "Bounty", per the slice brief.
- Rewards live in the collapsed body. One row is open at a time, per board.
- The world state switches sit outside the settings form and save on the switch, not on Save settings,
  so a guest with no profile can use them too.
- Guests store the choice under `voidwatch.hidden`. A profile wins over the browser the moment there is
  one, the two are never merged.
- `profiles.update({ hidden })` replaces the whole list, the switch sends the full set every time.
