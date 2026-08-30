# Round 2, slice: shell and landing

Owned: `app/globals.css`, `app/layout.tsx`, `app/(app)/layout.tsx`, `components/shell/**`, `app/(marketing)/**`, `components/marketing/**`, `public/logo*.svg`, `app/icon.svg`. Plus the shadcn primitives the Sidebar block pulled in (`components/ui/sidebar.tsx`, `breadcrumb.tsx`, `collapsible.tsx`, `hooks/use-mobile.ts`).

## Tokens

Q: DESIGN.md says black and white only, but the token file had gold in `--primary`, `--ring`, `--accent-strong`, `--chart-1` and every `--sidebar-*`.
A: All of them are now the inverse of the background: `#0a0a0a` on light, `#ffffff` on dark. `--accent-soft` is the same colour at 6 percent (light) and 8 percent (dark). Charts moved to a neutral ramp, hue carries no meaning in this app. `--success`, `--warning`, `--danger` kept their hues, the brief exempts semantic states.

Q: Anything outside my files still hardcodes gold?
A: `app/logo/page.tsx`, the temporary logo board, still has `const G = "#f5b942"`. It is not part of the product and it is not mine, so I left it. Everything else (`components/panels/tier-badge.tsx`, `app/(auth)/login/page.tsx`) reads tokens, so it went black and white for free.

Q: `components/ui/button.tsx` got rewritten by `npx shadcn add` (`link` variant `text-accent-strong` back to `text-primary`).
A: Reverted it. No `components/ui` variant hardcodes gold, so nothing there needed changing.

Q: `--font-heading` is used by `card.tsx`, `dialog.tsx` and `sheet.tsx`.
A: Left it on Geist. Pointing it at the display face would have turned every card title in the app serif, and those surfaces belong to other workers. The display face is applied explicitly with `font-display` on landing headlines only.

## Logo

The mark everywhere is now `public/logo-outline.svg`, inline as `components/shell/logo.tsx` with `fill="currentColor"` on the `<svg>` and no fill on the paths, so it flips with the theme. `components/shell/logo-mark.tsx` is now a one line re-export (`export { Logo as LogoMark }`) so the panels, chat and dashboard files other workers own pick up the new mark without me touching them.

`app/icon.svg` is the same file with a `<style>` block that sets `path { fill: #0a0a0a }` and flips to `#f5f5f5` under `prefers-color-scheme: dark`. A favicon cannot use `currentColor`, so a media query is the only way to get both themes out of one file.

Assumption: 52 KB of traced path inlined into the bundle is acceptable. It is one component, shared, and gzip takes it to about 20 KB. If it bothers anyone, the fix is to run the SVG through an optimiser and cut the coordinate precision.

## Shell

Installed `npx shadcn@latest add sidebar-07 breadcrumb`. Kept `components/ui/sidebar.tsx`, `breadcrumb.tsx`, `collapsible.tsx` and `hooks/use-mobile.ts`, deleted the block's demo files (`app/dashboard/page.tsx`, `components/app-sidebar.tsx`, `nav-main.tsx`, `nav-projects.tsx`, `nav-user.tsx`, `team-switcher.tsx`) because they collide with routes and components other slices own.

Per `docs/nextjs/sidebar.md` this is the base-nova Sidebar: links are `render={<Link/>}`, not `asChild`. Behaviour kept: `collapsible="icon"`, cmd+B (the provider's own `SIDEBAR_KEYBOARD_SHORTCUT`), `tooltip` on every menu button so labels appear when collapsed, `SidebarRail` as the drag toggle, and the user card in `SidebarFooter` with the theme toggle, Settings and Sign out in its dropdown. `--sidebar-ring` is white on dark and near black on light, per the doc's note.

`hooks/use-mobile.ts` as shipped by the block fails `npm run lint` (`react-hooks/set-state-in-effect`). Rewrote it on `useSyncExternalStore`, which reads the media query directly instead of writing state on mount. Same behaviour, no cascading render.

Q: The old header had the account menu and a mobile Sheet trigger. Where did they go?
A: The account menu moved to the sidebar footer, where the brief asked for it. The Sheet is now the Sidebar's own mobile behaviour, opened by `SidebarTrigger` in the top bar. The top bar is trigger, divider, breadcrumb.

Q: Breadcrumb content.
A: `breadcrumbTrail()` in `components/shell/nav.ts` maps a path to labels, using the nav item's own label where the segment matches a nav href and title casing anything else. Root crumb is always Voidwatch.

## Animated icons

The bug: every `components/icons/*` icon animates on hover of its own `<div>`, which is 16px in a 200px row, so nothing appeared to happen. Each icon exposes `{ startAnimation, stopAnimation }` through `useImperativeHandle` and sets `isControlledRef` as soon as a ref is attached. So the fix is to attach a ref in the nav item and call the handle from the row's own `onMouseEnter`/`onMouseLeave` (and focus/blur, so keyboard users get it too). `AnimatedIconHandle` and `NavIcon` in `nav.ts` type that. `components/shell/app-sidebar.test.tsx` asserts it with a probe icon.

## Landing

Layout: hero, pinned product shot, ASCII mark plus three feature rows, iMessage, how it works, footer, and a fixed floating bar.

- Hero: no pill, headline left aligned at `clamp(3.5rem, 11vw, 7rem)` in the display face, one sentence sub, two square (`rounded-none`) buttons. The outline mark sits at the right at 11 percent opacity. Note: it must not be `-z-10`. The marketing layout paints `bg-background`, and a negative z index drops the mark behind that paint, which is why the previous hero's background mark was invisible. It is `absolute` with the content `relative` instead.
- Product shot: browser frame, `lg:sticky lg:top-16` inside a `lg:h-[165vh]` section, so it stays pinned while the floating bar rides over it. Verified in a real browser at 1440 wide.
- Floating bar: `fixed bottom-6`, frosted (`bg-surface/70 backdrop-blur-xl`), rounded, centred, four section links and Get started.

## Effects: canvasui vs hand rolled

Tried `npx shadcn@latest add @canvas-ui/ascii-object-react` (registry `https://canvasui.dev/r/{name}.json`) as Dhruv asked, and rendered it in a real browser against `public/logo-outline.svg`.

Result: **it works, no Chrome flag needed.** ASCII Object is a WebGL renderer, not one of the html-in-canvas components, so it renders everywhere. I did not keep it, for two reasons:

1. It pulls `three` plus `@types/three`, 25 MB in `node_modules`, for one decorative block. The brief asked for a small effect with no heavy dependency.
2. It lights the SVG as a 3D object, so the traced mark reads as a fuzzy sphere. The logo's spiral silhouette is lost. Side by side, the hand rolled version is more legible at the same size.

Kept `components/marketing/ascii-logo.tsx`: about 70 lines, no dependency. It draws `/logo-outline.svg` into an offscreen canvas at one pixel per character cell, reads the alpha as coverage, then paints a ` .:-=+*#%@` ramp with a slow diagonal wave walking the ramp. It honours `prefers-reduced-motion` by painting one static frame, and it no ops when `getContext("2d")` is unavailable, which is what keeps it safe under jsdom. `three` and `@types/three` were uninstalled and `components.json` was reverted, so the registry entry is not committed. Add it back with the URL above if you want to revisit.

I did not try ASCII Sweep on the headline. The Object components were enough, and sweep over live HTML is in the family that needs the flag.

## iMessage

Hand built, no library. I looked and did not find a maintained React package for iOS bubbles worth a dependency for one mock. It is gray incoming (`#e9e9eb` light, `#26252a` dark), blue outgoing (`#0b84ff`), a drawn SVG tail on the last bubble of each run, a Today 9:41 AM divider and a Delivered receipt, in a phone frame.

Q: Blue and the black and white rule.
A: The blue is inside the phone mock only, and the brief names it explicitly ("gray incoming, blue outgoing"). It reads as a screenshot of Messages, not as a Voidwatch accent. Nothing outside the mock uses it. Say the word and it goes gray on gray.

The bubble corner the tail joins is squared off (`rounded-br-md` / `rounded-bl-md`), otherwise the 1.15rem radius curves away from the tail and leaves a visible notch.

## Fonts

Body stays Geist. Headlines are **Instrument Serif** (400, via `next/font/google`, exposed as `--font-display` and the `font-display` utility).

Why: DESIGN.md names it first, and it is the right call for this brand. It is a high contrast display serif with tight default spacing, so it holds up at `clamp(3.5rem, 11vw, 7rem)` where a text serif would go spindly. It has one weight, which forces the page to get contrast from size and case rather than from more weights, which is exactly the "no hue, emphasis from weight and size" rule in DESIGN.md. It is the opposite of Geist in texture but shares its vertical proportions, so the two sit together without looking like two products. And a serif reads as watchful and a little old world against a black field, which is the feel the doc asks for.

`--font-heading` deliberately stays Geist so this is a landing choice, not an app wide one.

## Not done

- The signed in shell could not be checked in a real browser: this deployment has no sign in method configured, so `/dashboard` redirects to `/login`. Behaviour is covered by tests instead (nav links and current page, breadcrumb, account card, cmd+B collapse, trigger collapse, icon hover animation).
- `app/logo/page.tsx` still has hardcoded gold, see above.
