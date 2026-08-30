# Warframe data sources

Everything below was verified live on 2026-08-29 (game build `2026.08.19.11.06`). Four sources, each good at one thing:

| Source | Use it for | Auth | Format |
|---|---|---|---|
| WarframeStat.us (`api.warframestat.us`) | World state, parsed and human-readable; item/mod/drop lookups; riven prices | none | JSON, CORS `*` |
| Official `api.warframe.com/cdn/worldState.php` | Raw world state straight from DE (source of truth, ugliest shape) | none | JSON (served as `text/html`) |
| warframe.market (`api.warframe.market/v2`) | Player trade listings and price history | none for reads | JSON |
| WFCD/warframe-items (npm `warframe-items`) | Static item database (stats, components, drops, images) | n/a | JSON files / npm package |

Recommendation for this app: poll WarframeStat.us for world state (it already does the hard translation of DE's internal names), use `warframe-items` for the item catalogue, and warframe.market only for pricing. Keep the official endpoint as a fallback/verification source.

---

## 1. WarframeStat.us

Base: `https://api.warframestat.us`. Open source (WFCD/warframe-status, built on `warframe-worldstate-parser`). Community-run; it is the de facto API used by most third-party apps and Discord bots.

### World state

`GET /{platform}` where platform is `pc`, `ps4`, `xb1`, `swi`, `mob`. Note that since cross-save, `pc` is effectively the shared world state for all platforms; the others are still served.

- `?language=en` (also `es`, `fr`, `de`, `it`, `pt`, `ru`, `pl`, `uk`, `tr`, `ja`, `zh`, `ko`, `tc`). Old path style `/pc/es` still works.
- Every top-level key is also its own endpoint: `GET /pc/fissures`, `/pc/sortie`, `/pc/voidTrader`, `/pc/nightwave`, `/pc/archonHunt`, `/pc/arbitration`, `/pc/cetusCycle`, `/pc/syndicateMissions`, and so on. Use these when you only need one slice (fissures is about 9 KB vs 126 KB for the full state).
- Full PC payload is about 126 KB.

Caching and rate limits: no documented hard rate limit, but responses are served through Cloudflare with `cache-control: max-age=120` and `cf-cache-status: HIT`, so polling faster than every 2 minutes gets you the same body. The official upstream only changes on a roughly 10 second cadence anyway. Be a good citizen: poll once per minute or two from the server (a Convex cron), never from every client.

Top-level keys (PC, 2026-08):

```
alerts, arbitration, archimedeas, archonHunt, buildLabel, calendar, cambionCycle,
cetusCycle, clanWeeklyInitiative, conclaveChallenges, constructionProgress,
dailyDeals, darkSectors, duviriCycle, earthCycle, events, faceoffBonus, fissures,
flashSales, globalUpgrades, invasions, kinepage, kuva, news, nightwave,
persistentEnemies, sentientOutposts, simaris, sortie, steelPath, syndicateMissions,
timestamp, vallisCycle, vaultTrader, voidTrader, voidTraders, zarimanCycle
```

Conventions that hold across nearly every object: `id` (string), `activation` and `expiry` (ISO-8601 UTC), and for anything with a localized name a paired `xKey` field holding the untranslated value (`node` / `nodeKey`, `faction` / `factionKey`, `missionType` / `missionTypeKey`). Some objects also carry a pre-rendered `timeLeft` / `eta` string; compute your own from `expiry` instead, since the cached response can be up to 2 minutes stale.

#### Shapes

**alerts** (array)
```json
{
  "id": "6a9050f00000000000000000",
  "activation": "2026-08-27T15:00:00.000Z",
  "expiry": "2026-08-31T15:00:00.000Z",
  "mission": {
    "description": "Water Fight Alert Mission Desc",
    "node": "Selkie (Sedna)", "nodeKey": "Selkie (Sedna)",
    "type": "Survival", "typeKey": "Survival",
    "faction": "Grineer", "factionKey": "Grineer",
    "reward": {
      "items": [], "countedItems": [{ "count": 175, "type": "Nakak Pearls", "key": "Nakak Pearls" }],
      "credits": 50000, "thumbnail": "", "color": 5198940
    },
    "minEnemyLevel": 1, "maxEnemyLevel": 2,
    "nightmare": false, "archwingRequired": false, "isSharkwing": false,
    "levelOverride": "...", "enemySpec": "...", "advancedSpawners": [], "requiredItems": [], "levelAuras": []
  },
  "rewardTypes": ["other"],
  "tag": "WaterFight"
}
```
`rewardTypes` is a normalized tag list (`nitain`, `orokinCell`, `blueprint`, `credits`, `other`, ...), handy for filtering.

**invasions** (array)
```json
{
  "id": "...", "activation": "...",
  "node": "Cerberus (Pluto)", "nodeKey": "Cerberus (Pluto)",
  "desc": "Grineer Offensive",
  "attacker": { "reward": { "items": [], "countedItems": [{ "count": 3, "type": "Detonite Injector", "key": "..." }], "credits": 0, "thumbnail": "https://cdn.warframestat.us/img/detonite-injector.png", "color": 5068118 }, "faction": "Grineer", "factionKey": "Grineer" },
  "defender": { "reward": { "...same shape..." }, "faction": "Corpus", "factionKey": "Corpus" },
  "vsInfestation": false,
  "count": -25675, "requiredRuns": 37000,
  "completion": 15.3,
  "completed": false,
  "rewardTypes": ["detonite", "fieldron"]
}
```
`count` is signed: negative means the attacker is winning, positive the defender. `completion` is a percentage from the defender's perspective (0..100). Infested invasions have `vsInfestation: true` and no attacker reward. No `expiry`; an invasion ends when `completed` flips.

**sortie** (object, daily, resets 16:00 UTC)
```json
{
  "id": "...", "activation": "2026-08-29T16:00:00.000Z", "expiry": "2026-08-30T16:00:00.000Z",
  "rewardPool": "Sortie Rewards",
  "boss": "Tyl Regor", "faction": "Grineer", "factionKey": "Grineer",
  "variants": [
    { "missionType": "Rescue", "missionTypeKey": "Rescue",
      "modifier": "Eximus Stronghold", "modifierDescription": "Eximus units have a much higher spawn rate...",
      "node": "War (Mars)", "nodeKey": "War (Mars)" }
  ],
  "missions": []
}
```
Always exactly three `variants`.

**archonHunt** (object, weekly, resets Monday 00:00 UTC)
```json
{
  "id": "...", "activation": "2026-08-24T00:00:00.000Z", "expiry": "2026-08-31T00:00:00.000Z",
  "rewardPool": "Archon Sortie Rewards",
  "boss": "Archon Nira", "faction": "Narmer", "factionKey": "Narmer",
  "variants": [],
  "missions": [
    { "node": "Callisto (Jupiter)", "nodeKey": "...", "type": "Rescue", "typeKey": "Rescue",
      "nightmare": false, "archwingRequired": false, "isSharkwing": false,
      "advancedSpawners": [], "requiredItems": [], "levelAuras": [] }
  ]
}
```
Note it uses `missions[]` (with `type`) rather than `variants[]` (with `missionType`) like sortie does. Boss rotates Amar / Nira / Boreal.

**fissures** (array, includes Void Storms and Steel Path fissures)
```json
{
  "id": "...", "activation": "...", "expiry": "...",
  "node": "Thebe (Jupiter)", "nodeKey": "Thebe (Jupiter)",
  "missionType": "Sabotage", "missionTypeKey": "Sabotage",
  "enemy": "Corpus", "enemyKey": "Corpus",
  "tier": "Meso", "tierNum": 2,
  "isStorm": false,
  "isHard": false
}
```
`tierNum`: 1 Lith, 2 Meso, 3 Neo, 4 Axi, 5 Requiem, 6 Omnia. `isStorm` = Railjack Void Storm, `isHard` = Steel Path. The array is not sorted; sort by `tierNum` then `expiry` client-side. Some entries have `expired: true` briefly before dropping out; filter on `expiry > now`.

**nightwave** (object)
```json
{
  "id": "nightwave1804464000000",
  "activation": "...", "expiry": "...",
  "season": 18, "tag": "Radio Legion Intermission16 Syndicate", "phase": 0, "params": {},
  "possibleChallenges": [],
  "activeChallenges": [
    { "id": "1788134400000seasondailysuspendfiveenemies",
      "activation": "...", "expiry": "...",
      "isDaily": true, "isElite": false, "isPermanent": false,
      "title": "Deep Impact", "desc": "Suspend 5 or more enemies in the air at once with a Heavy Slam Melee Attack",
      "reputation": 1000 }
  ]
}
```
Daily = 1000 standing, weekly = 4500, elite weekly = 7000 (`isElite: true`). Dailies last 3 days; weeklies reset Monday 00:00 UTC.

**voidTrader** (Baro Ki'Teer; object. `voidTraders` is the array form, `vaultTrader` is Varzia's Prime Resurgence inventory)
```json
{
  "id": "5d1e07a0a38e4a4fdd7cefca",
  "activation": "2026-09-04T13:00:00.000Z", "expiry": "2026-09-06T13:00:00.000Z",
  "character": "Baro Ki'Teer",
  "location": "Strata Relay (Earth)",
  "inventory": [],
  "psId": "...", "initialStart": "1970-01-01T00:00:00.000Z", "schedule": []
}
```
While Baro is away, `activation` is his next arrival and `inventory` is empty. While present, `inventory` is `[{ "item": "Primed Flow", "ducats": 350, "credits": 175000 }, ...]`. He arrives every 2 weeks on Friday 13:00 UTC and stays 48 hours.

**arbitration** (object)
```json
{
  "id": "...", "activation": "...", "expiry": "...",
  "node": "Sechura (Pluto)", "nodeKey": "...",
  "enemy": "Corpus", "type": "Defense", "typeKey": "Defense",
  "archwing": false, "sharkwing": false,
  "expired": false
}
```
Arbitrations are not in DE's world state; WarframeStat.us derives them from a known rotation table. When the derivation fails you get a placeholder (`node: "SolNode000"`, `enemy: "Tenno"`, `type: "Unknown"`, `expired: true`), which is what it returned at time of writing. Treat `expired: true` or `typeKey === "Unknown"` as "no data" and hide it rather than render it. Rotates hourly.

**events** (array; Tactical Alerts, Operations, Plague Star and so on)
```json
{
  "id": "...", "activation": "...", "expiry": "...",
  "description": "Tactical Alert: Dog Days",
  "faction": "Corpus", "node": "Earth", "concurrentNodes": ["Earth", "Earth", "Earth"],
  "maximumScore": 100, "currentScore": 0, "smallInterval": null, "largeInterval": null,
  "rewards": [ { "items": ["Avatar Image Dog Days Erra Glyph"], "countedItems": [...], "credits": 50000, "thumbnail": "", "color": 5198940 } ],
  "interimSteps": [ { "goal": 25, "reward": { "...reward shape..." }, "message": {} } ],
  "jobs": [], "previousJobs": []
}
```

**syndicateMissions** (array, one entry per syndicate; the open-world bounties live in `jobs`)
```json
{
  "id": "1788060126431CetusSyndicate",
  "activation": "...", "expiry": "...",
  "syndicate": "Ostrons", "syndicateKey": "Ostrons",
  "nodes": [],
  "jobs": [
    { "id": "AttritionBountyLib1788060126431", "expiry": "...",
      "uniqueName": "/Lotus/Types/Game/MissionDecks/EidolonJobMissionRewards/TierATableARewards",
      "type": "...", "enemyLevels": [5, 15], "standingStages": [...], "minMR": 0,
      "rewardPool": ["Redirection", "100X Oxium", ...],
      "rewardPoolDrops": [ { "item": "Redirection", "rarity": "Uncommon", "chance": 20, "count": 1 } ] }
  ]
}
```
Bounty syndicates: `Ostrons` (Cetus), `Solaris United` (Fortuna), `Entrati` (Deimos), `The Holdfasts` (Zariman), `The Hex` (1999). Relay syndicates (Steel Meridian etc.) have `nodes[]` populated and `jobs[]` empty. Bounties rotate every 2.5 hours in lockstep with the Cetus day/night cycle.

**Cycles** (objects)
```json
"cetusCycle":   { "id": "...", "activation": "...", "expiry": "...", "isDay": true,  "state": "day",    "timeLeft": "1h 2m 50s", "isCetus": true }
"vallisCycle":  { "id": "...", "activation": "...", "expiry": "...", "isWarm": false, "state": "cold" }
"cambionCycle": { "id": "...", "activation": "...", "expiry": "...", "state": "fass", "timeLeft": "..." }
"earthCycle":   { "id": "...", "activation": "...", "expiry": "...", "isDay": true,  "state": "day", "timeLeft": "..." }
"zarimanCycle": { "id": "...", "activation": "...", "expiry": "...", "state": "corpus" | "grineer" }
"duviriCycle":  { "id": "...", "activation": "...", "expiry": "...", "state": "sorrow",
                  "choices": [ { "category": "normal", "categoryKey": "EXC_NORMAL", "choices": ["Nidus","Octavia","Harrow"] },
                               { "category": "hard",   "categoryKey": "EXC_HARD",   "choices": ["Vectis","Stug","Ballistica","Destreza","Obex"] } ] }
```
Cycle lengths: Cetus 150 min (100 day / 50 night), Vallis 26m40s (6m40s warm / 20m cold), Cambion = Cetus (fass = day, vome = night), Earth 8h (4/4), Duviri 2h per spiral (joy, anger, envy, sorrow, fear). All are deterministic, so you can compute them locally from a single fetched `activation` if you want to avoid polling.

**steelPath** (weekly honors rotation)
```json
{ "currentReward": { "name": "30,000 Endo", "cost": 150 },
  "activation": "...", "expiry": "...", "remaining": "22h 30m 48s",
  "rotation": [ { "name": "Umbra Forma Blueprint", "cost": 150 }, ... 8 entries ... ],
  "evergreens": [ { "name": "Veiled Riven Cipher", "cost": 20 }, ... ] }
```

**Others**
- `dailyDeals[]`: `{ item, uniqueName, originalPrice, salePrice, discount, total, sold, activation, expiry }` (Darvo).
- `globalUpgrades[]`: active boosters/double-resource weekends: `{ upgrade: "Mission Kill XP", operation: "is multiplied by", operationSymbol: "x", upgradeOperationValue: 2, activation, expiry }`.
- `constructionProgress`: `{ fomorianProgress: "84.30", razorbackProgress: "40.09", unknownProgress: "0.00" }` (strings, percent).
- `news[]`: `{ id, message, link, imageLink, priority, date, translations{}, update, primeAccess, stream, mobileOnly }`.
- `conclaveChallenges[]`, `flashSales[]`, `kuva[]` (Kuva Siphon nodes, often empty), `sentientOutposts`, `persistentEnemies[]`, `simaris`.
- `calendar`: the 1999 Hex calendar: `{ activation, expiry, days: [ { date, events: [ { type: "To Do" | "Big Prize!" | "Override", challenge?: {title, description}, reward?: string, upgrade?: {title, description} } ] } ] }`.
- `archimedeas`: Deep/Temporal Archimedea weekly missions and modifiers (newer key; the older `deepArchimedea` / `temporalArchimedea` keys are gone).
- `timestamp` and `buildLabel`: when DE's world state was generated and the game build. Show `timestamp` as "last updated".

### Static data endpoints

Same base URL, backed by `warframe-items`. All support `?language=xx`. Search is case-insensitive substring; exact-name lookups are exact.

| Endpoint | Returns |
|---|---|
| `GET /items/search/{query}` | Any item (warframes, weapons, mods, resources, relics, ...) |
| `GET /items/{name}` | Exact item |
| `GET /warframes/search/{q}`, `/warframes/{name}` | Warframes (with abilities, stats, components, drops). Search `prime` returns 2.5 MB; be specific. |
| `GET /weapons/search/{q}`, `/weapons/{name}` | Primary, secondary, melee, arch-guns |
| `GET /mods/search/{q}`, `/mods/{name}` | Mods (with `levelStats`, `drops`, `polarity`, `rarity`, `baseDrain`, `fusionLimit`) |
| `GET /drops/search/{q}` | Drop table rows `{ place, item, rarity, chance }` (from DE's official drop tables). `orokin cell` returned 137 rows. |
| `GET /{platform}/rivens/search/{q}` | Riven price stats from DE's weekly trade data: `{ "Melee Riven Mod": { "Nikana": { "rerolled": { avg, stddev, min, max, pop, median }, "unrolled": {...} } } }` |

Item objects (example, Nikana Prime) carry: `name, uniqueName, description, category, type, productCategory, masteryReq, tradable, vaulted, vaultDate, estimatedVaultDate, isPrime, imageName, wikiaUrl, wikiaThumbnail, polarities, buildPrice, buildTime, components[], drops[], damagePerShot[20], totalDamage, criticalChance, criticalMultiplier, procChance, fireRate, disposition, introduced, releaseDate, tags`. `damagePerShot` is a 20-slot array in DE's element order (impact, puncture, slash, heat, cold, electricity, toxin, blast, radiation, gas, magnetic, viral, corrosive, void, tau, cinematic, shield drain, health drain, energy drain, true).

Images: `https://cdn.warframestat.us/img/{imageName}` (imageName from the item record, lowercased with hyphens in most cases; the `thumbnail` fields in reward objects already give the full URL).

---

## 2. Official world state (Digital Extremes)

`GET https://api.warframe.com/cdn/worldState.php`

The old `https://content.warframe.com/dynamic/worldState.php` now returns 404; every current parser (including WarframeStat.us) reads the `api.warframe.com/cdn` path. Platform-specific hosts (`content.ps4.warframe.com` etc.) no longer resolve; there is one shared world state since cross-save.

- No auth, no documented rate limit. `Cache-Control: public, max-age=9`, served via CDN, so about a 10 s effective refresh. `Content-Type: text/html` even though the body is JSON; parse it anyway.
- About 128 KB.
- Undocumented and unversioned. DE changes it without notice; this is why you want WarframeStat.us in front of it.

Top-level keys (2026-08):

```
ActiveMissions, Alerts, BuildLabel, Conquests, ConstructionProjects, DailyDeals,
Descents, EndlessXpSchedule, Events, ExperimentRecommended, FeaturedGuilds,
FlashSales, ForceLogoutVersion, GlobalUpgrades, Goals, HubEvents, InGameMarket,
Invasions, KnownCalendarSeasons, LibraryInfo, LiteSorties, MobileVersion,
NodeOverrides, PVPActiveTournaments, PVPAlternativeModes, PVPChallengeInstances,
PersistentEnemies, PrimeAccessAvailability, PrimeTokenAvailability,
PrimeVaultAvailabilities, PrimeVaultTraders, ProjectPct, SeasonInfo, SkuSales,
Sorties, SyndicateMissions, Time, Tmp, TwitchPromos, Version, VoidStorms,
VoidTraders, WeeklyVaultBonusRewards, WorldSeed
```

Mapping to the friendly names:

| Official | WarframeStat.us | Notes |
|---|---|---|
| `ActiveMissions` | `fissures` | `Modifier: "VoidT1".."VoidT6"` = tier, `Hard: true` = Steel Path |
| `VoidStorms` | `fissures` with `isStorm` | |
| `Alerts` | `alerts` | |
| `Invasions` | `invasions` | |
| `Sorties` | `sortie` | |
| `LiteSorties` | `archonHunt` | |
| `SeasonInfo` | `nightwave` | |
| `VoidTraders` | `voidTrader` | Character literally `"Baro'Ki Teel"` |
| `PrimeVaultTraders` | `vaultTrader` | Varzia |
| `Goals` | `events` | |
| `SyndicateMissions` | `syndicateMissions` | |
| `GlobalUpgrades` | `globalUpgrades` | |
| `DailyDeals` | `dailyDeals` | |
| `ProjectPct` | `constructionProgress` | `[fomorian, razorback, unknown]` |
| `KnownCalendarSeasons` | `calendar` | |
| `Events` | `news` | |
| `Tmp` (JSON string) | cycles, `archimedeas`, kinepage, ... | A stringified JSON blob DE stuffs misc state into; must be `JSON.parse`d again |
| `Time` | `timestamp` | Unix seconds |

Raw shape conventions (Mongo export style):

```json
{
  "_id": { "$oid": "6a92fe7ed7a8857cc14101e5" },
  "Activation": { "$date": { "$numberLong": "1788019200000" } },
  "Expiry":     { "$date": { "$numberLong": "1788105600000" } },
  "Reward": "/Lotus/Types/Game/MissionDecks/SortieRewards",
  "Seed": 2088,
  "Boss": "SORTIE_BOSS_TYL",
  "Variants": [ { "missionType": "MT_RESCUE", "modifierType": "SORTIE_MODIFIER_EXIMUS", "node": "SolNode99", "tileset": "GrineerSettlementTileset" } ]
}
```

Everything is an internal identifier: nodes are `SolNode99`, mission types `MT_RESCUE`, factions `FC_GRINEER`, items `/Lotus/Types/Items/MiscItems/WaterFightBucks`, challenges `/Lotus/Types/Challenges/Seasons/...`. Translating these needs the lookup tables in `warframe-worldstate-data` (npm), which is exactly what WarframeStat.us does for you. Only go here directly if you need something the parser drops, or the lowest possible latency.

---

## 3. warframe.market

Base: `https://api.warframe.market/v2` (current, `apiVersion: 0.25.0`). The `/v1` API still answers but returns `Deprecated` on some routes (e.g. `/v1/items/{slug}/orders`); do not build on it. Docs: https://42bytes.team/docs/wfm-api (v2 reference) and the `#api` channel on the warframe.market Discord.

- Reads need no auth. Writes (placing orders, profile) need a JWT from `POST /v2/auth/signin`; not needed for this app.
- Headers: `Platform: pc | ps4 | xbox | switch | mobile` (default `pc`), `Language: en` (also `ru, ko, fr, de, sv, zh-hans, zh-hant, es, pt, pl, uk, it`), `Crossplay: true|false`.
- Rate limit: the documented limit is roughly 3 requests/second per IP; no `RateLimit-*` headers are returned, you just start getting HTTP 429. Cache aggressively. The item list changes rarely; poll `GET /v2/versions` and only refetch `/v2/items` when `data.collections.items` changes.
- Responses are wrapped: `{ "apiVersion": "0.25.0", "data": ..., "error": null }`.

| Endpoint | Returns |
|---|---|
| `GET /v2/items` | All 3,840 tradable items (slim). `{ id, slug, gameRef, tags[], i18n: { en: { name, icon, thumb } } }` |
| `GET /v2/item/{slug}` | Full item: adds `setRoot`, `setParts[]`, `ducats`, `reqMasteryRank`, `tradingTax`, `tradable`, `vaulted`, `maxRank`, `i18n.en.{description, wikiLink}` |
| `GET /v2/items/{slug}/set` | The item plus all its set parts |
| `GET /v2/orders/item/{slug}` | All visible orders for the item |
| `GET /v2/orders/item/{slug}/top` | Best 5 buy and 5 sell orders from online/in-game users. This is the one to use for "current price". |
| `GET /v2/orders/recent` | Latest orders across the site |
| `GET /v2/orders/user/{slug}` | A user's orders |
| `GET /v2/versions` | Collection versions (cache invalidation) |
| `GET /v1/items/{slug}/statistics` | Price history (still v1; v2 equivalent pending). `payload.statistics_closed["48hours" \| "90days"][]` |

`slug` is lowercase snake_case of the English name: `nikana_prime_set`, `nikana_prime_blade`, `primed_flow`, `serration`. Mods and arcanes have per-rank orders (`rank` field on the order). `gameRef` is DE's `uniqueName`, which is the join key to `warframe-items` and WarframeStat.us item records.

Order object:
```json
{
  "id": "69c2af6d795a0d8e54aaf55c",
  "type": "sell",
  "platinum": 68,
  "quantity": 4,
  "perTrade": 1,
  "rank": 0,
  "visible": true,
  "createdAt": "2026-03-24T15:36:13Z", "updatedAt": "2026-08-30T02:23:17Z",
  "itemId": "56c3bbfc5d2f0202da32e943",
  "user": {
    "id": "...", "ingameName": "25.Yoisak_Mutsumi", "slug": "...", "avatar": "user/avatar/...webp",
    "reputation": 36, "platform": "pc", "crossplay": true, "locale": "zh-hans",
    "status": "ingame" | "online" | "offline",
    "activity": { "type": "UNKNOWN", "details": "unknown", "startedAt": "..." },
    "lastSeen": "2026-08-30T02:03:18Z"
  }
}
```

Statistics row (v1, hourly for 48h, daily for 90d):
```json
{ "datetime": "2026-08-30T01:00:00.000+00:00", "volume": 1,
  "min_price": 70, "max_price": 70, "open_price": 70, "closed_price": 70,
  "avg_price": 70, "wa_price": 70, "median": 70, "moving_avg": 69.2,
  "donch_top": 70, "donch_bot": 69, "id": "..." }
```

Images: `https://warframe.market/static/assets/{icon}` using the `icon` / `thumb` path from `i18n`.

---

## 4. WFCD/warframe-items

Repo: https://github.com/WFCD/warframe-items. npm: `warframe-items` (v1.1269.87 at time of writing; a bot bumps the version on every game update, so pin and update deliberately). Data is scraped from DE's public export (`PublicExport`), DE's official drop tables, and the wiki, then merged.

Two ways to consume it:

1. **npm package** (84 MB unpacked, includes all languages and images metadata):
   ```ts
   import Items from 'warframe-items';
   const items = new Items({ category: ['Warframes', 'Primary'] , i18n: ['en'] });
   ```
   Too big to ship to the browser or to a Convex function bundle. If used, load it in a build step or a Node script that writes a trimmed JSON into Convex.
2. **Raw JSON per category** from the repo (`data/json/*.json`), fetchable from `https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/{Category}.json`:

   | File | Size |
   |---|---|
   | Warframes.json | 3.0 MB |
   | Primary.json / Secondary.json / Melee.json | 11 / 8.3 / 9.5 MB |
   | Mods.json | 5.7 MB |
   | Relics.json | 8.6 MB |
   | Arcanes.json | 303 KB |
   | Resources.json | 555 KB |
   | Node.json | 164 KB (star chart nodes, for translating `SolNode99`) |
   | Also: Arch-Gun, Arch-Melee, Archwing, Enemy, Fish, Gear, Glyphs, Misc, Pets, Quests, Railjack, SentinelWeapons, Sentinels, Sigils, Skins, i18n (52 MB) |

   The sizes are large because every item embeds its full `drops[]` and `components[]` (each component is itself a full item with its own drops). For this app, run an ingest script that keeps only the fields you render.

Item record fields (Melee example; warframes add `health, shield, armor, power, sprintSpeed, abilities[], passiveDescription, sex, color`; mods add `polarity, rarity, baseDrain, fusionLimit, levelStats[], compatName, isAugment, transmutable`):

```
name, uniqueName, description, category, type, productCategory, tags[],
masteryReq, masterable, tradable, isPrime, vaulted, vaultDate, estimatedVaultDate, introduced{name,url,date}, releaseDate,
imageName, wikiaUrl, wikiaThumbnail, wikiAvailable,
buildPrice, buildTime, buildQuantity, skipBuildTimePrice, consumeOnBuild,
components[] ({ name, uniqueName, itemCount, imageName, drops[], ducats?, tradable }),
drops[] ({ location, type, rarity, chance }),
polarities[], stancePolarity, disposition (1-5 riven disposition),
damage{}, damagePerShot[20], totalDamage, criticalChance, criticalMultiplier, procChance, fireRate,
attacks[] ({ name, speed, damage{}, crit_chance, crit_mult, status_chance, slide?, slam? }),
range, blockingAngle, comboDuration, followThrough, windUp, slideAttack, slamAttack, slamRadialDamage, slamRadius,
heavyAttackDamage, heavySlamAttack, heavySlamRadialDamage, heavySlamRadius, omegaAttenuation, slot
```

Images: `https://cdn.warframestat.us/img/{imageName}` (e.g. `NikanaPrime.png`) or the repo's `data/img/` directory. `uniqueName` is the stable primary key across all four sources (`gameRef` on warframe.market, `uniqueName` on WarframeStat.us items, `/Lotus/...` strings in the official world state).

Note the `tradable` flag here means "tradable in-game as a whole item" (Nikana Prime = false, since you trade the parts), which differs from warframe.market's `tradable` (the set is listed). Use warframe.market's `/v2/items` list as the authority on what has a market.

Related WFCD packages worth knowing: `warframe-worldstate-parser` (the parser behind WarframeStat.us; runnable locally against the official endpoint), `warframe-worldstate-data` (the SolNode / MT_ / FC_ translation tables), `warframe-drop-data` (drop tables only, ~10 MB), `warframe-patchlogs`.

---

## Suggested architecture for this app

- **World state**: one Convex cron every 60 s calls `https://api.warframestat.us/pc?language=en`, diffs against the stored document, and writes only the slices that changed (fissures, alerts, invasions, sortie, archonHunt, nightwave, voidTrader, events, syndicateMissions, cycles, steelPath, dailyDeals, globalUpgrades). Clients subscribe via Convex queries, so the app never hits the API from the browser. Compute countdowns client-side from `expiry`.
- **Arbitration**: hide when `typeKey === "Unknown"` or `expired`.
- **Items**: one-off ingest script (Node) over `warframe-items` JSON, trimmed to the fields you render, stored in Convex tables keyed by `uniqueName`. Re-run on game updates (watch `buildLabel` in world state).
- **Prices**: on-demand action calling `/v2/orders/item/{slug}/top`, cached in Convex for 5 to 10 minutes per slug, with a 3 req/s throttle. Refresh `/v2/items` only when `/v2/versions` `collections.items` changes.
- **Official endpoint**: keep as a fallback if WarframeStat.us is down; parse with `warframe-worldstate-parser` if you ever need to.
