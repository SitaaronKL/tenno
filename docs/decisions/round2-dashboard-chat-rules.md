# round2-dashboard-chat-rules questions

Assumptions I continued with. Slice: dashboard, chat and rules UI, round 2.

## Ownership and things I did not touch

- `app/globals.css` still defines `--primary`, `--ring`, `--accent-soft` and `--accent-strong` as gold.
  My files use tokens only, never a hex, so the dashboard, chat and rules pages turn black and white the
  moment the token owner lands the new values. I removed every literal hue of my own (the Meso, Neo, Axi
  and Requiem tints in `tier-badge.tsx`, the gold progress bar in `invasions.tsx`, `accent-primary` on the
  rule form checkboxes, which is now `accent-foreground`). Assumption: the token swap is another worker's.
- `components/shell/logo-mark.tsx` still draws two strokes in `#f5b942`. It is the agent avatar in chat and
  the mark in every empty state, and it is not my file. Assumption: the shell worker replaces it with the
  outline mark from `public/logo-outline.svg` rendered in `currentColor`.
- `components/segmented.tsx` is the Steel Path control inside the rule sentence. Not my file, it reads
  `accent-soft` and `accent-strong`, so it follows the token swap too.

## Dashboard

- Bento grid is six columns on desktop. Fissures 4, Bounties 2, Invasions 3, Alerts 3, Sortie 2,
  Archon Hunt 2, Baro 2, Nightwave 6. Two columns on tablet, one on mobile. Assumption: "size follows
  content" means a fixed span per card, not a masonry layout that measures rendered height.
- I dropped the tier tab strip and the Steel Path switch from the Fissures card. The table sorts by every
  column now and the Mode column says "Steel Path" or "Normal" in words, so the two filters were saying the
  same thing twice in a smaller space. Assumption: sortable columns replace them. Say the word and the tier
  tabs come back as a filter above the table.
- Default fissure order is tier (Lith, Meso, Neo, Axi, Requiem, Omnia) then soonest expiry inside a tier.
  Clicking a header takes over from there.
- Countdowns stay mono and tabular. The tooltip shows the absolute time in the reader's own zone, formatted
  by `toLocaleString`, for example "Sat, Aug 30, 9:14 PM".
- Nightwave title reads "Nightwave, Season 18". Season is capitalized because it is part of the name.
- Hover on a card or a cycle tile is a one pixel outline in the foreground color, which is white on dark and
  black on light, plus the card icon replaying its animation. Nothing moves and nothing resizes.

## Bounties

- `state.bounties` is read through `bountiesOf(state)` in `components/panels/bounties.tsx`, which treats the
  field as optional and returns `[]` when the data slice has not landed yet. The row type I coded against is
  `{ syndicate, node, expiresAt, jobs: [{ level, minLevel, maxLevel, rewards: string[], standing }] }` with
  `level` typed as a string. If the data worker types `level` as a number, `tsc` will point at the one line
  in `bounties.tsx` and the fix is a one word change.
- Each syndicate is one accordion row: syndicate, node and countdown on the trigger, the job list inside.

## Data table

- `@tanstack/react-table` 9.2.4 added, per the new note in the task and `docs/nextjs/data-table.md`.
  This is the one allowed TanStack use. Logged here because the contract says to log new packages.
- One reusable `components/panels/data-table.tsx`, used by fissures, invasions and alerts. Only
  `rowSortingFeature` is registered, so filtering, paging, selection and visibility are tree shaken out.
  Column widths come from a `widths` prop keyed by column id, because the column sizing feature is not
  registered and `columnDef.size` does not exist without it.

## Chat

- The dynamic import's loading fallback is the real empty state and a disabled composer, and the client
  shows the empty state while `listMessages` is still `undefined`. An unopened thread and an empty thread
  look identical, so there is no loading line to flash.
- Scrolling only happens when the message count grows after the first render, so mounting the page does not
  jump the view.
- Three suggestion chips, down from four. I dropped "Alert me when Baro brings Primed Chamber" because the
  rules page is where a player sets that up.

## Rules

- The create and edit dialogs no longer scroll as a whole. The dialog is a two row grid, the header is
  fixed, and the body scrolls inside a `min-h-[24rem] max-h-[60vh]` box, so the dialog stays the same size
  and stays centered while the sentence changes shape.
- The sentence builder is a wrapping flex row with `items-center`, and every chip is `h-7`, so the chips,
  the segmented control and the connecting words share one baseline instead of riding on `leading-9`.
