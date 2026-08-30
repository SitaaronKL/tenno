# polish.questions.md

UI polish pass over the whole app, against `docs/DESIGN.md`. Every question, and the assumption I continued with.

## Tokens and theme

- **DESIGN.md calls the gold "accent", shadcn calls its hover surface "accent".** Assumption: void gold is `--primary`
  (buttons, rings, active states) and shadcn's `--accent` stays a neutral hover surface, otherwise every menu row
  and select item turns gold. Added `--surface`, `--surface-2`, `--accent-soft`, `--accent-strong`, `--success`,
  `--warning`, `--danger` as extra theme colors.
- **Gold as text fails contrast on light.** `#d99a1e` on `#fafafa` is 2.34 to 1, under the 4.5 the spec asks for,
  so gold text and gold icons use `--accent-strong`, `#8a6100` on light (5.31 to 1) and `#f5b942` on dark. Gold as a
  fill is unchanged, black on `#d99a1e` is 8.1 to 1.
- **The spec gives no light values for success, warning and danger.** Assumption: `#15803d`, `#c2410c`, `#dc2626`,
  all at least 4.5 to 1 on both light surfaces.
- **Radius.** `--radius: 0.5rem` gives 8px inputs, chips and buttons and 11px cards, the closest fit to the
  "12px cards, 8px inputs" line while keeping shadcn's radius ladder intact.
- **Light and dark are both native** (the later spec change). `next-themes` with `attribute="class"`,
  `defaultTheme="system"`, `suppressHydrationWarning` on `<html>`. Landing and login stay dark whatever the setting,
  per Dhruv, so both wrap their content in `.dark`.
- Tier tints are the one place a raw palette color survives, because the spec names the relic colors. Each has a
  light and a dark value.

## Icons

- **All app icons come from lucide-animated** (`components/icons/*`, installed with the shadcn CLI, MIT). They animate
  on hover and sit still otherwise, which is the library's default. That pulls in `motion` as a dependency.
- **The library covers 467 of Lucide's icons, so some had no match.** Substitutions: Dashboard `layout-grid`,
  Rules `workflow`, delete `x`, kebab `grip-horizontal`, edit `square-pen`, email channel `at-sign`,
  Cambion Drift `bone`, Duviri `tornado`, Zariman `atom`. Every one is paired with a text label.
- **The icons inside shadcn primitives** (the chevron in Select, the check in a dropdown) are still `lucide-react`.
  They belong to the vendored component, not to our screens. Say the word and I will swap those too.
- **No sparkles.** Per the standing rule in the design vault, AI surfaces use the brand mark, so the "Say what you
  want" step on the landing page and the chat empty state use `logo-mark`, not a star.
- The icons render a `<div>` wrapper and take a numeric `size`, not a `size-4` class, so every call site passes pixels.

## Logo

- `public/logo-mark.svg` now strokes its white arcs with `currentColor`, with an internal `prefers-color-scheme`
  block so the standalone file (favicon, `app/icon.svg`) still looks right on its own. The sidebar, login, empty
  states and chat use an inline React copy (`components/shell/logo-mark.tsx`), because an `<img>` cannot inherit
  `currentColor`. Gold stays gold in both.
- `app/favicon.ico` is gone, `app/icon.svg` replaces it.

## Data the design asks for and the API does not have

- **"Last fired time" on a rule row.** `rules.list` returns the raw rule document, which has `createdAt` and no
  last fired timestamp, and I am not allowed to touch Convex functions. The row shows the created date instead.
  A `lastFiredAt` on the rule, or a notifications lookup, would make the real column possible.
- **Collapsed tool rows in chat.** `agent.chat.listMessages` filters to user and assistant messages, so tool calls
  never reach the client. An assistant turn that comes back with no prose is a tool step in practice, so that is
  what renders as "Checked world state".
- **The landing product shot** is meant to be a real screenshot of the dashboard. There is no Convex deployment in
  this worktree to screenshot, so it is a composed shot of the real dashboard layout in a browser frame. Replace it
  with a PNG when a deployment exists.

## Dependencies added

- `qrcode` and `@types/qrcode` for the Settings QR of the `sms:` link. It is drawn in the browser and rendered as a
  data URL, so no image ships with the page. The link is `sms:+14156035536?body=START` (RFC 5724).
- `motion`, pulled in by lucide-animated.
- `components/ui/popover.tsx` added with `npx shadcn add popover`, for the sentence builder chips.

## Tests changed

Only where the visible text or the roles changed, and they still assert what a user perceives.

- `dashboard-grid.test.tsx`: the stale banner now reads "Data is 25 minutes old, upstream is lagging".
- `rule-form.test.tsx`: Steel Path is a segmented control (radios Any, Only, Exclude) and the filters are chips that
  open a popover, so the test clicks chips instead of native selects. The serialization assertions are unchanged,
  null, true and false.
- `settings/page.test.tsx`: the phone state is a pill (Unverified, Verified) rather than a sentence, plus new tests
  for the danger zone and for the theme choice surviving a remount.
- `marketing/page.test.tsx`: the second call to action is "See the dashboard", per the spec.
- New `components/rules/sentence.test.tsx` for the rule sentence.

## Checked in the browser

Both themes on the dashboard, the rules list, the theme control, the landing page and login, in a real dev server
with the ingest fixture shifted forward so the countdowns run. Fixed from what that showed: countdowns wrapping to
two lines, the landing hero calls to action rendering as buttons instead of links (a Base UI console error that
predates this pass), and the login card centering.
