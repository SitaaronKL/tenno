# Design system

References pulled from Mobbin on 2026-08-30. Links open the screen on Mobbin.

## Feel

Watchful, calm, precise, a little cosmic. Linear, Vercel, Raycast, in the Warframe universe. Dense but airy. Black and white only: the accent is the inverse of the background (white on dark, black on light). No gold, no yellow, no colored badges except the semantic success, warning and danger states. Emphasis comes from weight, size, contrast and motion, not hue.

## Tokens (Tailwind v4, set in app/globals.css)

```
background      #0a0a0a          near black, never pure black
surface         #121212          cards
surface-2       #181818          hover, nested panels
border          #232323          hairline, 1px, never heavier
text            #f5f5f5
text-muted      #8a8a8a
accent          #ffffff          inverse of background, buttons, active states
accent-soft     #ffffff14        8 percent, tinted backgrounds and rings
success         #4ade80          verified, active, sent
warning         #fb923c          expiring soon, stale feed
danger          #f87171          failed, expired
radius          12px cards, 8px inputs and chips, 999px pills
font            Geist Sans (already in the scaffold), Geist Mono for timers and ids
```

Light and dark are both native. Theme is a user setting (System, Light, Dark) stored with `next-themes` and shown in Settings, with a quick toggle in the user menu. Tokens are CSS variables on `:root` (light) and `.dark`, so every component uses tokens and never a raw hex.

```
                light          dark
background      #fafafa        #0a0a0a
surface         #ffffff        #121212
surface-2       #f4f4f5        #181818
border          #e4e4e7        #232323
text            #0a0a0a        #f5f5f5
text-muted      #6b6b6b        #8a8a8a
accent          #0a0a0a        #ffffff     inverse of the background
accent-soft     #0a0a0a14      #ffffff14
```

The logo is `public/logo-outline.svg` (Dhruv's own trace) rendered with `currentColor`, so it flips with the theme. No flash on load: `next-themes` sets the class before paint, `suppressHydrationWarning` on `<html>`.

## Layout

Sidebar 240px, collapsible to 64px icons on tablet, Sheet on mobile. Content max width 1280px, 24px gutters. Page header: title left, primary action right, one line of muted helper text under the title.

## Pages

### Dashboard
References: Supabase project home https://mobbin.com/screens/782baf2b-1d87-4a1c-a461-a87acc585ba9, Sentry https://mobbin.com/screens/ac81ee7f-550f-4395-aafe-13da3dc10e05, Railway https://mobbin.com/screens/4e385395-8885-4bd2-ae55-a242c9c7af30.

- Top row: six cycle tiles (Cetus, Vallis, Cambion, Earth, Duviri, Zariman). Each tile: small icon, world name, state in text, countdown in mono. Tile border turns accent-soft when under 5 minutes.
- Stale feed banner above the grid when `stale` is true: warning dot, "Data is N minutes old, upstream is lagging".
- Grid below: Fissures (2 columns wide), Invasions (2 wide), Sortie, Archon Hunt, Baro, Nightwave, Alerts (1 wide each). Cards have a header row (title, count pill, optional filter), hairline dividers between rows, no inner borders.
- Fissure row: tier badge (Lith gray, Meso blue tint, Neo purple tint, Axi gold tint, Requiem red tint, Omnia white), node and mission in text, Steel Path and Storm as tiny outlined chips, countdown right aligned in mono, turns warning under 5 minutes.
- Baro card when inactive: big countdown, next relay name. When active: relay, countdown to leave, inventory list with ducats and credits.
- Empty states: one line of muted text and a small logo mark at 40 percent opacity, never a big illustration.

### Rules
References: Apollo workflows https://mobbin.com/screens/103fcc89-18f4-46dd-8d25-176dc79f6cf0, ClickUp automation https://mobbin.com/screens/92b59974-0c99-47af-a55f-2739690a67ec, Kit rules https://mobbin.com/screens/79fe826d-e5b0-435c-aa39-09243b845084.

- List: table rows with Switch on the left, name, a "sentence" summary built from the filter ("Axi fissure, Survival or Defense, Steel Path only"), channel icons (mail, message), mode pill (Instant, Hourly digest), last fired time, kebab menu. Empty state: "No rules yet" with a Create button and two example chips that prefill the form.
- Create and edit dialog: two tabs, Build and Describe. Build tab is a sentence builder like ClickUp: "When [kind] [conditions] then notify me by [channels] [mode]". Each bracket is a chip that opens a Select or checkbox group. Describe tab: textarea, Draft button, the drafted rule renders as the same sentence with an Edit affordance, then Save.
- Steel Path is a three way segmented control: Any, Only, Exclude.

### Chat
References: Langdock https://mobbin.com/screens/33cfbe4d-6be2-450f-a424-9592d3c4bb3f, Mistral Le Chat https://mobbin.com/screens/f55821bf-0d53-4ae9-92e7-4c68fcf4fffe.

- Empty thread: centered logo mark, "What do you want to know, Tenno?", four suggestion chips ("What is worth running right now", "Alert me when Baro brings Primed Chamber", "Any Axi Survival fissures", "When does Cetus go night").
- Messages: no bubbles for the assistant, just text with the mark as avatar. User messages in a surface-2 bubble right aligned. Tool calls render as a small collapsed row "Checked world state" with a check icon.
- Composer floats at the bottom, surface card, Enter sends, Shift Enter newline. A line under it: "Text this agent from iMessage, link your phone in Settings".

### Settings
References: Instacart notification settings https://mobbin.com/screens/56a8bbd6-7d95-48ae-b62f-bdd62c99feb3, PayPal notifications https://mobbin.com/screens/e2a6fbaf-a63a-4889-ab89-c00788401e61.

- Two cards side by side on desktop: Email (address, read only, "from your sign in") and iMessage (phone input, state pill Unverified or Verified with a green dot, and the instruction "Text START to +1 (415) 603-5536 from this phone" with a copy button and a QR code of the sms: link).
- Below: Digest card with hour Select and timezone Select, helper text "Hourly digest rules send once a day at this hour".
- Danger zone at the bottom: remove phone, sign out.

### Login
- Centered card on the landing background, logo mark, "Sign in to Voidwatch", provider buttons stacked, guest button as a text link under them when enabled. Magic link success state replaces the form: "Check your email" with the address.

### Landing
References: ToDesktop https://mobbin.com/sites/sections/03ac58c4-657f-4005-a4c7-2486d0641a5d, Customer.io https://mobbin.com/sites/sections/cbac56f2-5cdf-45a1-814d-83c855d8f552.

- Hero: no pill label. Headline left aligned, very large (clamp 3.5rem to 7rem), tight leading, a display face with character (try Instrument Serif or Geist for the headline, Geist for body). Sub line one sentence. Two buttons, primary is white on black, secondary outlined, both square cornered. The outline logo as a faint large mark on the right.
- Product shot: a real screenshot of the dashboard in a browser frame with the top edge cut by the fold, like ToDesktop.
- Three feature columns with icon, title, two lines. Then an iMessage mock conversation in a phone frame. Then "How it works" three steps. Footer with GitHub and the fan project note.

## Motion

150ms ease out on hover and open. Countdowns tick without layout shift (mono font, fixed width). Skeletons match final layout exactly. No page transitions.

## Accessibility

Contrast at least 4.5 to 1 for text, 3 to 1 for chips. Every interactive element has a focus ring in accent. Countdown text also has a visible label for screen readers ("expires in 4 minutes").
