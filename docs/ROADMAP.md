# Roadmap

## v1 (all in)
- [ ] Scaffold: Next.js 16 + shadcn + Convex + Convex Auth (Discord, magic link)
- [ ] Ingest: 5-min cron → `worldState` + `worldEvents`
- [ ] Dashboard: fissures, sorties, archon, Baro, nightwave, cycles, invasions, alerts
- [ ] Rules: schema, CRUD UI, matcher, instant + hourly digest, per-user rate limit
- [ ] Email delivery via Resend (React Email templates)
- [ ] iMessage/SMS delivery via Photon (opt-in via text START)
- [ ] AI rule builder (structured output → confirm → save)
- [ ] iMessage chat agent (Photon webhook → Convex Agent → reply)
- [ ] Deploy: Vercel + Convex prod, domain, Resend domain verified

## Later
- Codex / item lookup (trimmed `warframe-items` ingest)
- warframe.market price lookups + price alerts
- Personal farming goals → agent suggests what to run now
- Discord DM channel
- Platform switcher (PS/Xbox/Switch) — v1 is PC only

## v2: builds, resources, patch aware suggestions (added 2026-08-29)

Goal: a modern replacement for Overframe, the wiki drop tables, and a resource checklist, with the agent in the loop.

### Data foundation (slice 11), done Aug 30 2026 through the mastery slice: Public Export items and nodes in Convex, drop tables read by the bounty boards. Mods, arcanes and drop sources land with slices 12 and 14.
- Ingest game data into Convex: warframes, weapons, mods, arcanes, relics, drop sources.
  Sources: WFCD `warframe-items` (trimmed by uniqueName) plus wiki Lua modules
  (`Module:Warframes/data`, `Module:Mods/data`, `Module:Weapons/data`, `Module:DropTables/data`) via `api.php?action=parse`.
- Tables: `items`, `mods`, `dropSources` (item -> where, chance, rotation). Weekly refresh cron.
- Patch feed: `forums.warframe.com` PC update RSS plus the `news` key from warframestat. Table `patches` with parsed notes.

### Builds (slice 12, 13)
- Table `builds` { userId, frameOrWeapon, mods[8 slots + aura + exilus], arcanes, shards, forma, notes, source: manual|youtube|agent, sourceUrl, public }.
- Build editor: pick item, drag mods, capacity and polarity math, stat preview. Share link, fork.
- Import from a URL: agent reads a YouTube page (title, description, transcript when available) or an Overframe link and drafts the build with structured output; user confirms.
- Agent tool `draftBuild({item, goal})` proposes a build from the mods table and explains choices.

### Resource tracker (slice 14)
- Table `goals` { userId, itemId, wantedCount, haveCount }. Adding a build or a wishlist item explodes its recipe into goals.
- Page shows each missing resource with best farm locations from `dropSources`, and highlights when a live event (fissure, invasion, bounty) drops it. Notifier rules can be created from a goal in one click.

### Patch aware suggestions (slice 15)
- When a new `patches` row lands, a workflow asks the agent: for each saved build, did this patch change a mod, ability, or stat in it. Output: a suggestion card on the build ("Update 40.2 buffed Roar duration, consider swapping X for Y") and an optional notification.
- Same flow for "new mod or arcane released that fits this build".

Order: 11 first (everything reads it), then 12 and 14 in parallel, then 13 and 15.
