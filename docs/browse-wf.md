# browse.wf live page

What `https://browse.wf/live` fetches, what it shows, and what it has that Voidwatch does not. Probed with curl on 2026-08-30. The site is open source, the raw data is free to use with credit (their About page says so). Nothing here calls DE or WarframeStat.us, everything goes through their own hosts.

## 1. Network endpoints

The page is static HTML (20 KB, served from Cloudflare cache, Last-Modified 2026-07-27) plus `common.js` (2.7 KB) and `typestripped/live.js` (66 KB). All calls are `GET`, all send `access-control-allow-origin: *`, no auth. Sizes are bytes as fetched.

| Endpoint | Purpose | Cache | Size | Shape |
|---|---|---|---|---|
| `oracle.browse.wf/worldState.min.json` | trimmed DE world state | `max-age=10` | 34.5 KB | DE's raw JSON with only `Events, Goals, Alerts, Sorties, LiteSorties, ActiveMissions, VoidTraders, VoidStorms, DailyDeals, Conquests, Tmp` kept. Same `$oid` and `$date.$numberLong` conventions as DE. |
| `oracle.browse.wf/min` | change detector | `max-age=30` | 129 B | `{version, latestEvent, latestRedtext, darvoSold, invasions, alerts, goals, fissures}`, counts and epoch seconds. |
| `oracle.browse.wf/invasions` | invasions with mission types | `max-age=59` | 2.4 KB | `{activation, expiry, invasions:[{id, node, ally, allyPay:[{ItemCount, ItemType}], missions:["Capture","Exterminate"]}]}`, two rows per invasion (one per side). Mission types are not in DE's file, the oracle collects them from the game. |
| `oracle.browse.wf/bounty-cycle` | fixed board bounties | `max-age=8998` | 2.3 KB | `{expiry (ms), rot, vaultRot, zarimanFaction, bounties:{ZarimanSyndicate, EntratiLabSyndicate, HexSyndicate:[{node, challenge, ally?}]}}`. Per node challenge paths, again not in DE's file. |
| `oracle.browse.wf/dicts/<lang>.json?<OS_DICT_VERSION>` | strings DE omits from the export (menu labels, conquest modifiers, Duviri moods) | version query busts cache | 25 KB | flat `{"/Lotus/Language/...": "text"}` |
| `browse.wf/warframe-public-export-plus/dict.<lang>.json` | full language dictionary | Cloudflare HIT | 3.8 MB | flat path to string map |
| `browse.wf/warframe-public-export-plus/ExportRegions.json` | star chart nodes | HIT | 444 KB | keyed by `SolNode…`, gives `name, systemName, missionName, faction, minEnemyLevel, maxEnemyLevel, systemIndex` |
| `browse.wf/warframe-public-export-plus/ExportChallenges.json` | bounty challenge text | HIT | 233 KB | keyed by challenge path, `name, description, requiredCount` |
| `browse.wf/warframe-public-export-plus/ExportMissionTypes.json`, `ExportFactions.json` | lookups | HIT | small | keyed by `MT_…` and `FC_…` |
| `browse.wf/sp-incursions.txt` | Steel Path Incursion schedule | HIT, Last-Modified 2025-01-14 | 100 KB, 1337 lines | `epochDaySeconds;SolNode,SolNode,… (6 nodes)` one line per day, runs to 2028 |
| `browse.wf/arbys.txt` | arbitration schedule | HIT, Last-Modified 2024-12-25 | 940 KB, 44056 lines | `epochHourSeconds,SolNode` one line per hour, about five years ahead |
| `browse.wf/supplemental-data/arbyTiers.js` | arbitration node tiers S to F (credited to Arbitration Goons) | Last-Modified 2026-04-21 | small | `window.arbyTiers = {SolNode: "S"}` |
| `browse.wf/<uniqueName>` | item resolver, e.g. `/Lotus/Weapons/Tenno/…` | HIT | 1 to 5 KB | item JSON with `name, icon, compatName, damagePerShot, resultType, era, category` used to name Baro, Darvo and alert rewards |
| Images | `content.warframe.com/PublicExport<icon>!<hash>` when the export has a hash, else `media.invisioncic.com/Mwarframe/pages_media/<forumName>.png`, else `browse.wf<icon>` | immutable | 20 to 100 KB | PNG |
| `cdn.jsdelivr.net/npm/bootstrap@5.3.3` | CSS and JS | CDN | | |

Polling: a 500 ms scheduler checks deadlines. `min` is fetched every 60 s and triggers a `worldState.min.json` refetch only when `latestEvent`, alert, goal or fissure counts change, otherwise the world state is refetched at the earliest expiry among sortie, archon hunt, Darvo, Baro, alerts and fissures (fissures also re-render locally at each expiry). `invasions` refetches at its own `expiry` (about 15 minutes) or when `min.invasions` changes. `bounty-cycle` refetches at its `expiry`, then every 60 s until the server rolls over. Arbitration and incursions never refetch, they are computed from the schedule files by hour and day. Weekly things roll on a local timer. On error each fetch retries after 5 s. Badges tick every 100 ms.

## 2. Sections and their sources

| Section | Source |
|---|---|
| Environments: Plains day and night, Cambion Fass and Vome | computed from `bounty-cycle.expiry` (night is the last 50 min of the 150 min cycle) |
| Orb Vallis warm and cold | computed, epoch 2018-11-10 08:13:48 UTC, 1600 s cycle, 400 s warm |
| Duviri mood | computed, `floor(now / 2h) % 5`, names from oracle dict |
| Zariman faction | `bounty-cycle.zarimanFaction` |
| News | `Events` from world state, localized `Messages`, `Community` flag colors it, `Prop` is the link |
| Darvo's Deal | `DailyDeals[0]` plus item resolver, stock kept fresh from `min.darvoSold` |
| Arbitration | `arbys.txt` row for the current hour, tier from `arbyTiers.js`, names from `ExportRegions` |
| Alerts | `Alerts`, rewards via item resolver |
| Events | `Goals[].Desc` through oracle dict, names only, no progress |
| Sortie | `Sorties[0].Variants`, modifier names from a static table in `live.js` |
| Archon Hunt | `LiteSorties[0]`, boss colored Amar, Nira, Boreal |
| Steel Path Incursions | `sp-incursions.txt` row for the current UTC day, six nodes, level shown as node level plus 100 |
| Vendors: Steel Path Honors | static 8 item list indexed by week since epoch 1736121600 (2025-01-06 00:00 UTC) |
| Vendors: Iron Wake | a checkbox only, no offering data |
| Weekly Missions: Help Clem, Ayatan Treasure Hunt, Netracells (5 boxes), Break Narmer (1 plus 6 bonus), Descendia (2) | checkboxes only, week from the same epoch as Circuit, stored in localStorage |
| The Circuit (Normal and Steel Path) | two static tables in `live.js`, 11 frame triples and 9 weapon quintuples, indexed by week since epoch 1734307200 (2024-12-16 00:00 UTC) |
| Baro Ki'Teer | `VoidTraders[0]`, `Node` and `Manifest`, items sorted mods, weapons, other |
| KinePage | `Tmp.pgr[lang]` |
| Bounties: rotation A, B, C, vault rotation, Holdfasts, Cavia, Hex boards | `bounty-cycle`, challenge text from `ExportChallenges`, Hex ally from a static name table |
| Void Fissures (Normal), (Steel Path) | `ActiveMissions` split on `Hard`, tier from `Modifier` |
| Invasions | `oracle/invasions` |
| Deep Archimedea, Temporal Archimedea | `Conquests` (`CT_LAB`, `CT_HEX`), `difficulties[].deviation` and `risks`, `Variables` personal modifiers, text from oracle dict |
| Void Storms (Railjack) | `VoidStorms` |

Not on the page at all: Nightwave, Varzia, Kuva siphons, calendar 1999, Palladino's stock, invasions progress percentage, bounties for Cetus, Fortuna, Deimos, global boosters, Simaris target.

Notifications are browser toasts driven from the same refresh loop (new alert, new sortie, nightfall in 30 s, new bounties, new week). Completion checkboxes are per `_id` or per week key in `localStorage`.

## 3. Specific answers

Steel Path Incursions: not derived from DE's feed. They ship `sp-incursions.txt`, a precomputed day by node schedule (six nodes per UTC day, covering 2025-01-13 to 2028-09) that someone recorded or reverse engineered from the game's seeded rotation. The page takes `floor(now / 86400)` and looks up the row. Missions are Steel Path so levels are node level plus 100. We could mirror the file (100 KB) and do the same lookup.

Teshin's weekly Steel Path Honors item: a hard coded 8 entry cycle in `live.js` (Umbra Forma Blueprint, 50,000 Kuva, Kitgun Riven, 3 Forma, Zaw Riven, 30,000 Endo, Rifle Riven, Shotgun Riven), `week = floor((now - 2025-01-06) / 7d)`, item `week % 8`. No API involved. Verified against `wiki.warframe.com/w/The_Steel_Path`, section Weekly Rotating Offer: same eight items in the same order, and the wiki's epoch of 2020-11-16 is 216 weeks before 2025-01-06, a whole number of 8 week loops, so the two agree. `lib/teshin.ts` is that function.

Palladino (Iron Wake): nothing but a per week completion checkbox. They do not show her stock.

Circuit weekly rotation: two static arrays in `live.js`, 11 warframe triples and 9 weapon quintuples, indexed by `week % length` from epoch 2024-12-16. DE also publishes this as `EndlessXpSchedule` in worldState, which is the safer source since DE has reset the cycle before.

1999 calendar: not shown. The oracle strips `KnownCalendarSeasons` from `worldState.min.json`, so the page has no calendar data.

## 4. They show, we do not

Voidwatch today (`lib/contracts/worldstate.ts`): fissures with Steel Path and storm flags, alerts, invasions, sortie, archon hunt, Baro, Nightwave, cycles (cetus, vallis, cambion, earth, duviri, zariman), bounties including the fixed boards from drop tables, Archimedea deep and temporal.

| They show | Source | Effort |
|---|---|---|
| Steel Path Incursions (6 nodes per day) | `browse.wf/sp-incursions.txt` static schedule | small, copy the file into `convex/ingest`, lookup by UTC day, node names from our region data |
| Arbitration with node tier | `browse.wf/arbys.txt` plus `arbyTiers.js` | small, 940 KB file, keep the next few thousand hours only, hourly lookup |
| Teshin Steel Path Honors item | static 8 week cycle, epoch 2025-01-06 | trivial, one function |
| Circuit normal and Steel Path choices | static tables, or DE `EndlessXpSchedule` | small, read `EndlessXpSchedule` from DE (already in our fallback fetch) |
| Darvo's Deal with live stock | DE `DailyDeals` | small, one card, item name via our item table |
| News ticker | DE `Events` with localized `Messages` | small, a strip, no lookups needed |
| Events (goal names) | DE `Goals[].Desc` | small, needs a string dictionary for `/Lotus/Language` paths |
| KinePage message | DE `Tmp.pgr` | trivial |
| Fixed board bounty challenges (Zariman, Cavia, Hex, per node with challenge text and Hex ally) | `oracle.browse.wf/bounty-cycle` plus `ExportChallenges` | medium, either consume their oracle with credit or leave our drop table version, DE's file has no challenge data |
| Bounty rotation letter and vault rotation with reward names | `bounty-cycle.rot`, `vaultRot`, static reward table | small if we take the oracle, otherwise compute from the 150 min cycle count |
| Invasion mission types per side | `oracle.browse.wf/invasions` | medium, not in DE's file, only their oracle has it |
| Duviri mood by name | computed 2 h cycle, names from oracle dict | trivial, we have the cycle, add the mood names |
| Per item completion checkboxes and browser notifications | localStorage | medium UI work, no data |

We show and they do not: Nightwave, invasion completion percentage, Cetus, Fortuna and Deimos bounties with rewards and standing, drop table reward odds on fixed boards, earth day and night, staleness and source tracking, platform field.

## 5. Notes for reuse

- Their oracle caps at 10 s on the world state and returns 34 KB instead of DE's 135 KB, and it is public with CORS. It is a viable second fallback after DE, but it is one person's server, so treat it like semlar's kuvalog: optional, never the only source.
- `min` is a good pattern for us: a tiny change token so clients skip the big fetch. Convex subscriptions already give us this, so no need to copy it.
- The static schedule files are the real value: incursions and arbitrations are otherwise only available from Cloudflare gated or scraped sources (see `docs/de-endpoints.md` section 8). We now mirror all three, trimmed, through `scripts/refresh-schedules.mjs`, with the credit they ask for in `docs/de-endpoints.md` section 5b.
