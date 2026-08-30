# Digital Extremes data sources

Everything DE exposes for Warframe, officially or de facto. Probed live on 2026-08-30 (build `2026.08.19.11.06`, Update 43.5.4). DE publishes no API docs, so shapes below come from curl plus the WFCD parsers that read them. Assume any of it can change without notice.

Companion doc: `docs/warframe-api.md` covers WarframeStat.us, warframe.market and warframe-items in depth. This file is about what sits underneath them.

## Summary table

| # | Source | URL | Auth | Format | Freshness | Size | Risk |
|---|---|---|---|---|---|---|---|
| 1 | World state | `api.warframe.com/cdn/worldState.php` | none | JSON (served as text/html) | `Cache-Control: max-age=11`, `Time` was 49 s old | 135 KB | low, it is a CDN file |
| 2 | Platform world states | `api-ps4`, `api-xb1`, `api-swi`, `api-mob`, `api-and` `.warframe.com/cdn/worldState.php` | none | JSON | same | 135 to 139 KB | low |
| 3 | Notifications RSS | `api.warframe.com/cdn/rss.php` | none | RSS 2.0 with `wf:` namespace | `ttl 1`, header max-age 86063 | 2 KB | low |
| 4 | Public Export index | `content.warframe.com/PublicExport/index_en.txt.lzma` | none | LZMA, CRLF text | `no-cache`, Last-Modified 2026-08-19 | 490 B | low |
| 5 | Public Export manifests | `content.warframe.com/PublicExport/Manifest/<name>!<hash>` | none | JSON, CORS `*` | immutable per hash (max-age about 1 year) | 2 KB to 3.8 MB each, 15 MB total | low |
| 6 | Item images | `content.warframe.com/PublicExport/<textureLocation>` | none | PNG, CORS `*` | immutable per hash | 20 to 100 KB | low |
| 7 | Drop tables | `warframe.com/droptables` 302 to a DigitalOcean Spaces HTML | none | one HTML page, 22k table rows | Last-Modified 2026-06-25, max-age 86400 | 4.4 MB | low |
| 8 | Player profile | `api.warframe.com/cdn/getProfileViewingData.php?playerId=<oid>` | none, needs account id | JSON | `max-age=600` | about 600 KB | medium, see notes |
| 9 | Patch notes site | `warframe.com/patch-notes` and `/patch-notes/pc/<ver>` | none | HTML | on release | 86 KB list, 467 KB per note | low |
| 10 | Forum update notes RSS | `forums.warframe.com/forum/3-pc-update-notes.xml/` | none | RSS 2.0 | `s-maxage=900`, 25 items | 878 KB | medium, 403 without the exact path |
| 11 | News site | `warframe.com/en/news` | none | HTML | on publish | 67 KB | low |
| 12 | Kuva and arbitration log | `10o.io/kuvalog.json` (semlar, not DE) | none | JSON | hourly | small | Cloudflare 403 to curl |
| 13 | Steel Path Incursion schedule | `browse.wf/sp-incursions.txt` (browse.wf, not DE) | none | text, `epochDay;SolNode,...` | Last-Modified 2025-01-14, runs to 2028 | 100 KB | low |
| 14 | Arbitration schedule | `browse.wf/arbys.txt` (browse.wf, not DE) | none | text, `epochHour,SolNode` | Last-Modified 2024-12-25, about five years ahead | 940 KB | low |
| 15 | Arbitration node tiers | `browse.wf/supplemental-data/arbyTiers.js` (browse.wf, not DE) | none | JS object literal | Last-Modified 2026-04-21 | 1.5 KB | low |

## 1. worldState.php

`GET https://api.warframe.com/cdn/worldState.php`. Source of truth for everything live. Header `Cache-Control: public, max-age=11`, our fetch showed `Age: 49`, and the `Time` field (epoch seconds) was 49 s behind wall clock. WarframeStat.us in the same minute reported `timestamp 01:28:47Z` against `Time 04:29:27Z`, a 3 hour lag, which is why the CLAUDE.md rule says always compare timestamps and fall back to DE.

Top level keys observed, with type and count:

```
WorldSeed str, Version 10, MobileVersion "5.3.5.0", BuildLabel "2026.08.19.11.06/…",
Time int, ForceLogoutVersion 0, PrimeTokenAvailability true
Events 30, Goals 1, Alerts 1, Sorties 1, LiteSorties 1, SyndicateMissions 38,
ActiveMissions 21, VoidStorms 12, Invasions 10, GlobalUpgrades 1, FlashSales 41,
SkuSales 0, InGameMarket {}, HubEvents 0, NodeOverrides 6, VoidTraders 1,
PrimeVaultTraders 1, PrimeAccessAvailability {}, PrimeVaultAvailabilities 5,
DailyDeals 1, LibraryInfo {}, PVPChallengeInstances 12, PersistentEnemies 0,
PVPAlternativeModes 0, PVPActiveTournaments 0, ProjectPct 3, ConstructionProjects 0,
TwitchPromos 0, ExperimentRecommended 0, EndlessXpSchedule 1, FeaturedGuilds 5,
SeasonInfo {}, KnownCalendarSeasons 1, Conquests 2, Descents 6, Tmp str,
WeeklyVaultBonusRewards 2
```

Conventions: ids are `{"$oid": "…"}`, dates are `{"$date": {"$numberLong": "ms"}}`, every name is an internal path (`/Lotus/Types/Keys/…`, `SolNode25`, `FC_CORPUS`, `MT_SURVIVAL`). Translating those needs `warframe-worldstate-data` (solNodes, missionTypes, factions, languages, sortieData, syndicatesData, fissureModifiers, steelPath, synthTargets, persistentEnemyData, upgradeTypes, conclaveData, arcanes, archonShards, plus 14 locale folders).

Platform hosts still serve distinct files (sizes differ by a few KB) even though cross save merged the state. Mobile (`api-mob`, `api-and`) are the companion app's feeds, and `MobileVersion` in the payload is the app version gate.

## 2. Keys the parser reads

`WFCD/warframe-worldstate-parser` (`lib/WorldState.ts`, master) reads exactly these raw keys: ActiveMissions, Alerts, BadlandNodes, BuildLabel, Conquests, DailyDeals, Descents, EndlessXpSchedule, Events, FlashSales, GlobalUpgrades, Goals, Invasions, KnownCalendarSeasons, LibraryInfo, LiteSorties, PVPChallengeInstances, PersistentEnemies, PrimeVaultTraders, ProjectPct, SeasonInfo, Sorties, SyndicateMissions, Time, Tmp, VoidStorms, VoidTraders, WeeklyChallenges, WeeklyVaultBonusRewards.

Derived, not in the raw file: earth, Cetus, Vallis, Cambion, Zariman, Duviri and Midrath cycles are pure clock math from `Time`. `arbitration` and `kuva` come from semlar's `https://10o.io/kuvalog.json` (`lib/models/Kuva.ts`), the parser truncates times to the hour and hashes the entry for an id. When that fetch fails you get the `SolNode000 / Unknown` placeholder our dashboard already hides. `sentientOutposts`, `kinepage`, `faceoffBonus` and the cancer charity floof count are parsed out of the `Tmp` string (keys `sfn`, `pgr`, `fbst`, `QTCCFloofCount`). `steelPath` rotation is table math. `news` is not DE data at all, WarframeStat.us adds it from its own feed.

Keys the parser ignores entirely: WorldSeed, Version, MobileVersion, ForceLogoutVersion, SkuSales, InGameMarket, HubEvents, NodeOverrides, PrimeAccessAvailability, PrimeVaultAvailabilities, PrimeTokenAvailability, PVPAlternativeModes, PVPActiveTournaments, ConstructionProjects, TwitchPromos, ExperimentRecommended, FeaturedGuilds.

## 3. rss.php

`GET https://api.warframe.com/cdn/rss.php`. ISO-8859-1 RSS with a `wf:` namespace. One item per Alert, Invasion and Outbreak (infested invasion). Item shape:

```xml
<item>
  <guid>6a9050f00000000000000000</guid>
  <title>175x Nakak Pearls (Item) - 50000cr - Selkie (Sedna) - 4320m</title>
  <author>Alert</author>
  <description>Dog Days Floaty of Fury</description>
  <pubDate>Thu, 27 Aug 2026 15:00:00 +0000</pubDate>
  <wf:faction>FC_GRINEER</wf:faction>
  <wf:expiry>Mon, 31 Aug 2026 15:00:00 +0000</wf:expiry>
</item>
```

The guid equals the worldState `_id`, so it can be joined. Its value to us: DE already renders human names (item, node with planet, reward count, duration in minutes) which saves a translation step for alert and invasion notifications. Nothing else is in it.

## 4. Public Export

Index: `https://content.warframe.com/PublicExport/index_en.txt.lzma`. Decompress with LZMA, split on lines, strip `\r` (the file is CRLF, a stray `\r` in the URL makes curl fail silently). Each line is `ExportName_en.json!00_<hash>`. Replace `_en` with `de`, `fr`, `es`, `it`, `ko`, `pl`, `pt`, `ru`, `tc`, `th`, `tr`, `uk`, `zh` and `index_<lang>.txt.lzma` for other locales. The index changes with every hotfix (Last-Modified 2026-08-19, same day as 43.5.4).

Manifest path is singular: `https://content.warframe.com/PublicExport/Manifest/<line>`. Pass the full line including `!00_hash`, with globbing off. Files are immutable per hash (`max-age=30012105`), CORS `*`, ETag exposed. Some files (Recipes, Upgrades, Warframes, Weapons) contain raw newlines inside strings, escape `\n` before `JSON.parse`.

| File | Bytes | Top keys and counts | Row keys |
|---|---|---|---|
| ExportWarframes | 232 K | ExportWarframes 125, ExportAbilities 13 | uniqueName, name, description, health, shield, armor, power, sprintSpeed, stamina, masteryReq, abilities[], productCategory, parentName |
| ExportWeapons | 610 K | ExportWeapons 837, ExportRailjackWeapons 143 | damagePerShot[], totalDamage, criticalChance, criticalMultiplier, procChance, fireRate, multishot, magazineSize, reloadTime, accuracy, noise, trigger, slot, masteryReq, omegaAttenuation (riven disposition) |
| ExportUpgrades | 3.0 M | ExportUpgrades 1600, ExportModSet 19, ExportAvionics 82, ExportFocusUpgrades 105 | uniqueName, name, description, polarity, rarity, baseDrain, fusionLimit, compatName, type, levelStats[] (text per rank) |
| ExportRelicArcane | 3.2 M | ExportRelicArcane 3261 | name, relicRewards[] (item, rarity, tier), arcanes with levelStats |
| ExportRecipes | 1.3 M | ExportRecipes 1866 | resultType, ingredients[] {ItemType, ItemCount}, buildPrice, buildTime, skipBuildTimePrice, num, consumeOnUse, secretIngredients |
| ExportResources | 1.0 M | ExportResources 3522 | uniqueName, name, description, parentName, excludeFromCodex |
| ExportRegions | 50 K | ExportRegions 269 | uniqueName (SolNode), name, systemName, systemIndex, missionIndex, factionIndex, minEnemyLevel, maxEnemyLevel, masteryReq, nodeType |
| ExportSortieRewards | 80 K | ExportSortieRewards 17, ExportNightwave (affiliationTag, challenges[] with standing and required), ExportIntrinsics, ExportOther | rewardName, probability, rarity, tier |
| ExportSentinels | 12 K | ExportSentinels 34 | stats like warframes |
| ExportDrones | 2.5 K | ExportDrones 6 | extractor drone stats |
| ExportCustoms | 969 K | ExportCustoms 4763 | cosmetics: name, description |
| ExportFlavour | 666 K | ExportFlavour 2623 | glyphs, sigils, emotes |
| ExportGear | 55 K | ExportGear 180 | gear wheel items |
| ExportKeys | 12 K | ExportKeys 46 | quest and key items |
| ExportFusionBundles | 10 K | ExportFusionBundles 51 | endo bundles |
| ExportManifest | 3.8 M | Manifest 19843 | uniqueName to textureLocation |

Images: `https://content.warframe.com/PublicExport` + `textureLocation` (keep the `!00_hash` suffix). Probed one: 200, 69 KB PNG, CORS `*`, max-age about 357 days. This is the CDN behind every wiki and warframe-items icon; `WFCD/warframe-items` (`build/scraper.ts`) reads exactly these manifests plus `drops.warframestat.us/data/all.slim.json` and the wiki ducat page, so we could skip the npm package and ingest the export directly for a smaller, fresher item table.

Not in the export: drop locations, mod stat numbers (only rank text), warframe ability numbers, enemy data, relic vault status.

## 5. Drop tables

`https://www.warframe.com/droptables` 302s to `https://warframe-web-assets.nyc3.cdn.digitaloceanspaces.com/uploads/cms/hnfvc0o3jnfvc873njb03enrf56.html` (the hash has been stable for years). 4.4 MB, 22078 `<tr>`, no auth, Last-Modified 2026-06-25, so DE refreshes it on major updates rather than hotfixes. The page states it is generated from internal data with no guarantees.

Sections by `<h3 id>`: missionRewards, relicRewards, keyRewards, transientRewards (dynamic location), sortieRewards, cetusRewards, solarisRewards, deimosRewards, zarimanRewards, entratiLabRewards, hexRewards, modByAvatar, modByDrop, blueprintByAvatar, blueprintByDrop, resourceByAvatar, resourceByDrop, sigilByAvatar, additionalItemByAvatar, relicByAvatar.

`WFCD/warframe-drop-data` scrapes this exact URL (one `lib/*.js` per section) and republishes JSON at `https://drops.warframestat.us/data/all.json` (6.6 MB, 200) with `info.json` carrying `hash`, `timestamp`, `modified`. For the resource tracker we can read their JSON and verify `modified` against the DO Spaces Last-Modified, or scrape ourselves with a 300 line cheerio job since the table layout is fixed.

### Fixed bounty boards

DE's world state lists four boards with zero jobs, so nothing downstream can show them: Zariman (The Holdfasts), Entrati Lab (Cavia), Vox Solaris (the Profit Taker phases) and Höllvania (The Hex). Those boards never rotate their level bands or their pools, and the drop tables are the only place the pools are written down. Sections used: `zarimanRewards`, `entratiLabRewards`, `hexRewards` and the `PROFIT-TAKER` rows of `solarisBountyRewards`. Each row is `bountyLevel` ("Level  50 - 55 Zariman Bounty", note the double space) plus `rewards` keyed by rotation `A`, `B`, `C`, each drop carrying `itemName`, `rarity`, `chance` and `stage`. Today all four boards publish rotation C only, one final stage pool per level band.

`scripts/build-static-bounties.mjs` downloads `https://drops.warframestat.us/data/all.json`, trims those rows to syndicate, node, level band and per rotation `[{ item, chance }]`, and writes `convex/ingest/staticBounties.json` (about 10 KB) with the source URL and the `modified` stamp from `info.json` inside it. Current snapshot: `modified` 1782419611000, 2026-06-25T20:33:31Z, hash `a0ece5e9be2e2d55c75040720ef3226a`. `convex/ingest/staticBounties.ts` fills a board from that file when upstream sends it with no jobs, keeping the expiry upstream printed for the board so the rotation still cycles.

## 5b. Steel Path Incursions and Arbitration, mirrored from browse.wf

Neither rotation is in DE's world state, and semlar's kuvalog is Cloudflare gated (section 8). browse.wf
publishes both as precomputed schedule files. Their About page says the raw data is free to use with credit,
so: **the incursion and arbitration schedules come from browse.wf, and the arbitration node tiers are the
Arbitration Goons' work, republished by browse.wf.**

`scripts/refresh-schedules.mjs` downloads all three, trims them to a window that opens a day back, and writes
them as JSON beside the ingest code:

| File | From | Shape | Size |
|---|---|---|---|
| `convex/ingest/spIncursions.json` | `sp-incursions.txt` | `{ from, days: [[SolNode x6], ...] }`, `from` is the epoch second of `days[0]`, one entry per UTC day | 58 KB, 800 days |
| `convex/ingest/arbitrations.json` | `arbys.txt` | `{ from, hours: [SolNode, ...] }`, `from` is the epoch second of `hours[0]`, one entry per hour | 10 KB, 31 days |
| `convex/ingest/arbyTiers.json` | `arbyTiers.js` | `{ tiers: { SolNode: "S" } }`, S down to F, about half the arbitration nodes are unrated | 700 B |

`convex/ingest/schedules.ts` reads them by clock: `todaysIncursions(now)` returns the six friendly node names
for the UTC day, `currentArbitration(now)` returns the node, mission type, faction, tier and the next hour
boundary. Both are pure and both return nothing rather than guessing once the window runs out, so the
arbitration file has to be re-trimmed about monthly. Run the script after a game update, or when the
arbitration tile goes quiet.

## 6. Player profile

`GET https://api.warframe.com/cdn/getProfileViewingData.php?playerId=<24 hex account id>`. Per platform host as in section 2. Since Update 38.0.8 lookup by name is dead: `?n=Name` returns 200 with an empty body, unknown ids return 409 `Could not find requested account`. `Cache-Control: public, max-age=600`, so the profile refreshes every 10 minutes at most. `content.warframe.com/dynamic/getProfileViewingData.php` (the path most tutorials quote and the one `@wfcd/profile-parser` still names) is 404 now.

Users find their id at `https://www.warframe.com/api/user-data` while logged in to warframe.com (`user_id`). Unauthenticated that endpoint returns 200 with 21 bytes.

Shape (from the profile-parser fixture, 600 KB): top level `Results[]`, `Stats`, `TechProjects`, `XpCacheExpiryDate`, `XpComponents`. `Results[0]` carries AccountId, DisplayName, PlayerLevel (mastery rank), Created, GuildName, GuildTier, GuildXp, Affiliations[] (syndicate standing and title), DailyAffiliation* (daily cap used per syndicate), DailyFocus, PlayerSkills (intrinsics), Missions[] (`{Tag: "SolNode…", Completes, Tier}` for every node incl. Steel Path), LoadOutInventory (equipped items with mods and arcanes), LoadOutPreset, OperatorLoadOuts, ChallengeProgress, Alignment, DeathMarks, WishWishlist. `Stats` has TimePlayedSec, Rank, XP, Income, MissionsCompleted, Weapons[] (per weapon XP, kills, fired, hits), Enemies[] (kills and deaths per enemy), Abilities[], Scans, PVP, and every event score ever.

Risk: the forums carry a thread about an IP getting 403 from `api.warframe.com` after polling it and worrying about game login, and DE staff have said scraping profiles at volume is not welcome. Fetch on user request, cache 10 minutes per the header, never crawl.

## 7. Patch notes and news

Site: `https://www.warframe.com/patch-notes` lists `/patch-notes/pc/<major>-<minor>-<patch>` links (42-0-0 … 38-5-0 on the first page, so it lags the forums: 43.5.4 is out and the site page stops at 42.0.0 in its link list). Each note is server rendered HTML, no `__NEXT_DATA__`, no JSON-LD, title in `<h2 class="title">`. Good for canonical long form notes, bad for freshness.

Forum RSS: `https://forums.warframe.com/forum/3-pc-update-notes.xml/` (trailing slash matters, other spellings 403 or 404). 25 latest topics, `title`, `link`, `guid` (topic id), `pubDate`, `description` (first 1.4 KB of the post as HTML). `s-maxage=900`. The first item on 2026-08-30 was Hotfix 43.5.4 published 2026-08-19 18:05 UTC, 41 minutes before the Public Export index Last-Modified, so the RSS is the earliest signal a build shipped. Full note text needs a fetch of `link` with a browser UA (Invision returns 403 to bare curl on topic pages). Other boards did not resolve with the same pattern, so treat the id 3 feed as the only reliable one.

News: `https://www.warframe.com/en/news` HTML with `/en/news/<slug>` links, no RSS anywhere on the site (`/news/rss`, `/rss`, `/api/news` all 404). WarframeStat.us builds its `news` key from this page.

## 8. Everything else probed

- `api.warframe.com/cdn/worldState.php?platform=ps4` and `?ps4` return 409, use the host names.
- `content.warframe.com/dynamic/worldState.php` and `content.<platform>.warframe.com` no longer resolve.
- `semlar.com/arbys` is an HTML page (200), `arbys.json` 404, `10o.io/kuvalog.json` is behind Cloudflare and rejects plain curl, so arbitration data needs a browser UA or a copy of the rotation table.
- Mobile app: no documented endpoints beyond `api-mob` and `api-and` world states, its `Events` entries carry `MobileOnly` and `Prop` flags.
- `docs/MARKET.md` does not exist in this repo, so the product mapping below uses ARCHITECTURE.md and ROADMAP.md only.

## What each unlocks

worldState.php direct
- Freshness: our ingest can drop the 3 hour lag seen on WarframeStat.us by parsing DE ourselves with `warframe-worldstate-parser` (already an npm package), keeping WarframeStat.us as the fallback instead of the primary.
- Fissure, Void Storm, sortie, archon hunt, Baro, Nightwave, invasion, alert and bounty panels with no third party in the path.
- Exact expiry to the millisecond for notification timing.

rss.php
- Alert and invasion notifications with DE's own English titles, one small fetch, joinable to worldState by guid.

Public Export
- v2 builds: warframe stats, weapon stats incl. riven disposition, every mod with polarity, drain, rarity and per rank text, mod sets, arcanes, focus. Enough for capacity and polarity math and a stat preview.
- Resource tracker: ExportRecipes gives every blueprint's ingredients, build time and rush cost, so a goal explodes into raw resources with no wiki call. ExportResources names them.
- Codex and item search: names, descriptions and icons for 20k items with CORS, direct from CDN.
- Patch aware suggestions: diff two hashes of ExportUpgrades or ExportWarframes and you get the exact numbers a hotfix changed, which is better evidence than parsing prose notes.
- Localization: all locales for free.
- Relics: ExportRelicArcane lists each relic's rewards and tiers.

Drop tables
- Resource tracker: where to farm, chance, rotation, per mission, per enemy, per bounty. Cross with live fissures, invasions and bounties to show "this is dropping right now".
- Build editor: mod sources for every slot.

Profile
- Personal mastery, node completion, syndicate standing and daily caps, equipped loadout. Lets the agent answer "what should I run" with the user's own progress, and lets the resource tracker infer owned items from LoadOutInventory. Requires the user to paste their account id.

Forum RSS and patch notes site
- Patch feed for the `patches` table with a 15 minute delay, plus the trigger for the agent's per build review. Site pages give canonical text for the agent to read.

worldState extras
- Calendar (KnownCalendarSeasons), Archimedea (Conquests), Descendia (Descents), circuit (EndlessXpSchedule), Nightwave (SeasonInfo), global boosters (GlobalUpgrades), daily deal, weekly Netracell bonus (WeeklyVaultBonusRewards), all already in DE data and mostly unused by us. Each is a weekly planner card and a rule kind.

## Keys of worldState.php we do not use yet

Our v1 ingest reads alerts, fissures, sorties, archon hunt, Baro, nightwave, cycles, invasions and bounties. Everything else:

- Goals: running events and tactical alerts (WaterFight today) with Count, Goal, InterimGoals, BonusGoal, per node requirements, rewards and Personal or Clan flags. We read the name and the expiry, nothing else, and print them above the dashboard grid. Still worth adding: the progress bar and a rule kind.
- Events: the in game news console, 30 localized messages with links, `MobileOnly`, `Priority`, `Community`. Worth a "news" strip and a source for the patch feed since DE posts hotfix links here.
- PVPChallengeInstances: 12 Conclave daily and weekly challenges by type ref. Low value, Conclave is dead, skip.
- PVPAlternativeModes, PVPActiveTournaments: empty. Skip.
- DailyDeals: Darvo's deal, StoreItem, Discount, SalePrice, AmountTotal, AmountSold, expiry. Read into `WorldState.darvo` as item, discount, remaining stock and expiry, one row in the Weekly box.
- FlashSales: 41 market discounts on bundles with PremiumOverride price and dates. Low value unless we add a market page.
- SkuSales: empty, platform store sales. Skip.
- InGameMarket: LandingPage categories with item lists (New Player, New, Featured). Skip.
- GlobalUpgrades: active global boosters (today 2x kill XP with UpgradeType and OperationType). Worth a banner and a rule kind, players plan around double events.
- ConstructionProjects and ProjectPct: Fomorian and Razorback build percentage (three floats). Worth a small gauge, it predicts the next Balor Fomorian or Razorback event.
- KnownCalendarSeasons: the 1999 Hex calendar, per day CET_CHALLENGE, CET_REWARD, CET_PLOT events. Worth a weekly planner card, rewards include arcane unlockers and boosters.
- EndlessXpSchedule: Circuit rotation, normal frames and hard weapons this week. Read into `WorldState.circuit`, two rows in the Weekly box. Safer than the static table browse.wf uses, DE has reset the cycle before.
- SeasonInfo: Nightwave season, phase, ActiveChallenges with daily flag. We use it via warframestat already; direct read removes the lag.
- Conquests: Elite and normal Archimedea missions with deviations and risks. Worth a card and a rule for "Archimedea has mission X".
- Descents: Descendia weekly challenge set (type, arena, enemy spec, aura). Worth a card once the mode matters, low priority.
- WeeklyVaultBonusRewards: Netracell and Archimedea bonus region and point thresholds. Worth folding into the Archimedea card.
- LiteSorties: archon hunt, Boss, three missions. Already used.
- ActiveMissions and VoidStorms: fissures and Railjack void storms with Modifier and tier. Already used.
- PersistentEnemies: acolytes, empty since 29.5. Skip unless DE revives it.
- FeaturedGuilds: five featured dojos for the star chart. Skip.
- HubEvents, TwitchPromos, ExperimentRecommended: empty. Skip, but poll for TwitchPromos before a drop campaign.
- LibraryInfo: Simaris community synthesis target. Small "scan this" card, cheap.
- NodeOverrides: hidden or overridden star chart nodes (EuropaHUB hidden). Only needed for map rendering. Skip.
- PrimeVaultTraders and PrimeVaultAvailabilities: Varzia's Prime Resurgence manifest with aya prices. Worth an "available primes" list for the wishlist and price alerts.
- PrimeAccessAvailability, PrimeTokenAvailability: which Prime Access is on and whether Regal Aya works. Skip.
- BadlandNodes: dark sector nodes, absent from the current payload. Skip.
- WeeklyChallenges: absent today, the parser still reads it. Skip.
- Tmp: JSON string with `pgr` (Kinepage, the 1999 pager message), `sfn` (sentient anomaly node), `fbst` (Faceoff bonus times), `QTCCFloofCount`. Anomaly is worth a rule kind for Shedu and Sentient farmers.
- WorldSeed, Version, MobileVersion, BuildLabel, ForceLogoutVersion: signature and build metadata. `BuildLabel` is worth storing, a change is the cheapest hotfix detector we have and it fires before the forum RSS.
- Arbitration and Kuva siphons: not in the file. Arbitration now comes from browse.wf's schedule (section 5b). Kuva siphons still need semlar's kuvalog, which is Cloudflare gated.
