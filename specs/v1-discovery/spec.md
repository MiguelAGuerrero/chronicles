<!-- Mirror of the Claude Docs tab "v1: discovery" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# v1: discovery

Oct 31, 2026 · @Miguel Guerrero

v1 lets the city answer back: scan for about six hidden marks near you, ambient alerts on a phone for something just ahead on an unwalked street, and reminders you pin to your own captures. The rationale is in Explorer App Concept (Discovery: scan and proximity; Memory: revisit, recall, retrace); this tab is the decisions, criteria and tests, in the shape of v0.5: memory and places.

## Status and decisions

Spec drafted Oct 31; the owner answered every open question the same day. Slice 1 (places data, D1–D10) is built, audited and deployed. Audit fixes: POIs only from z14 tiles (parent tiles stand in while z14 loads); unnamed places kept only for subclass artwork and viewpoint, not unnamed zoos or attractions; names folded with NFC and a locale-free lowercase; a POI straddling a rounding line (two keys) is offered once. Deferred: an index for Offered (read whole, fine for thousands); two unnamed artworks in one \~10 m cell count as one place (accepted). Culture also takes art\_gallery › art\_gallery, the galleries' other subclass value. Slices 2 (scan), 4 (remind me here) and 3 (ambient, phone only) are built test-first, audited, fixed and deployed (Oct 31). Scan audit: one map read at a time for scans and routes; failed reads change nothing; a home re-scan replaces only home marks within 1 km. Reminders audit: a flag set mid-walk waits for the next walk; fires reach the screen in front, else one notification per walk. Ambient audit: each place's 50% coin is drawn once per walk (a toss every batch would always land); an ambient mark holds the next hint back only until reached; the device course must agree with the trace. Deferred: storing the street on a dismissed mark; Undo for Dismiss; clearing flags of deleted captures. Decided: the walk options button stays in the bottom strip, left of Pause (owner, Oct 31). None of the native paths (location task checks, background tile fetch, notifications) have run on a device.

- **Decided: build all three.** Scan, ambient alerts, and remind me here (owner, Oct 31).
- **Decided: eight broad categories** (owner, Oct 31):
  - art (murals, sculptures)
  - food & drink
  - shops
  - history & landmarks
  - parks & green spaces
  - culture (galleries, museums, libraries)
  - viewpoints & oddities
  - nightlife
- **Decided: preferences** are more, normal or less per category, with no "never". They are asked at the first scan and editable later (owner, Oct 31).
- **Decided: platforms** (owner, Oct 31). On the web, scan works while the page is open. Ambient alerts are phone-only, since the web is a fallback.
- **Decided: reminders** show in-app on the walk screen on both platforms, plus a notification on a phone when the app is in the background (owner, Oct 31).
- **Decided: history & landmarks includes places of worship** (churches, temples, mosques) as historic buildings, alongside monuments, ruins, town halls and cemeteries (owner, Oct 31).
- **Decided: the spec's extra rules** (owner, Oct 31): a same-named place within 50 m counts as offered (D6); no mark within 60 m of the scan point (S5); no reminder during the capture's own walk (R2); the ambient gate's numbers live in `AMBIENT_RULES` (A6).
- **Decided: all seven open questions**, as recorded at the end of this tab (owner, Oct 31).
- **Unchanged rules:** local-only; native first; no badges, streaks or totals; the lows stay in; sources behind interfaces, no dataset hard-coded; spec-first and test-first.
- **Already built and reused:** navigation (v0.5 slice 4), expo-notifications (`lib/notify`), the heading cone (`headingOf`), and the walk screen's live z14 street reads (`collectView`).

## What the tiles carry

The tiles can fill seven of the eight categories from day one. Art is present, as `tourism=artwork`, but thin: the tiles can't tell a mural from a sculpture, and many pieces have no name. Oddities have almost no tags at all.

How the OpenMapTiles `poi` layer works, as built by planetiler-openmaptiles (the build OpenFreeMap serves):

- **Zoom.** Every POI enters at z14. Railway stations, halts and ferry terminals start at z12, and large universities at z10.
- **No thinning at z14.** z14 is the tiles' top zoom, so z14 tiles carry every POI. `rank` only orders them inside a 64 px label grid (named first, then by a class rank), for label density. Nothing is dropped.
- **Polygons become points.** A park or a museum drawn as an area arrives as one point: its centroid when convex, else a point on its surface.
- **Fields.** `name` (and `name:xx`), `class`, `subclass`, `rank`, `level`, `indoor`, `layer`, `agg_stop`. There is no brand, opening hours, `artwork_type` or wikidata. So a chain café looks like an independent one, and a bar is offered at noon.
- **Class rule.** Where the schema has no broader class, `class` equals `subclass` (`restaurant`, `museum`, `bakery`, `theatre`). One class can mix things: `art_gallery` holds artworks, galleries, arts centres and art shops. The adapter reads both fields.
- **No stable ids.** Places are keyed by category + name + rounded position, as the main tab's data model says. The 64 px tile buffer puts one POI in several tiles, so the key also dedupes.

| Category | Tile class › subclasses | Missing or weak |
| --- | --- | --- |
| Art | `art_gallery` › `artwork` | Mural vs sculpture is not in the tiles. Many pieces are unnamed. Memorial statues are absent (`historic=memorial` isn't mapped) |
| Food & drink | `restaurant`; `cafe`; `fast_food` › `fast_food`, `food_court`; `ice_cream`; `bakery`; `shop` › `coffee`, `chocolate`, `confectionery`; `grocery` › `deli`, `delicatessen`, `marketplace` | No brand, so chains count. Supermarkets and convenience stores are left out by choice |
| Shops | `shop` › `antiques`, `second_hand`, `charity`, `gift`, `florist`, `boutique`, `jewelry`, `toys`, `outdoor`, `photo`, `stationery`; `clothing_store` › `clothes`, `bag`; `library` › `books`; `music` › `music`, `musical_instrument`; `art_gallery` › `art` | Errand shops (phones, hardware, chemists, laundry, cars) are left out by choice. Bookshops share the `library` class with libraries |
| History & landmarks | `monument`; `castle` › `castle`, `ruins`; `town_hall` › `townhall`, `courthouse`; `cemetery` › `cemetery`, `grave_yard`; `place_of_worship` › its religion (`christian`, `jewish`, `muslim`, …) | The largest gap: memorials, plaques, archaeological sites, forts and other historic buildings are not in the layer. Only `historic=monument`, `castle` and `ruins` are. Places of worship count here as historic buildings (owner, Oct 31); the tiles carry no age, so a new chapel counts like an old cathedral |
| Parks & green spaces | `park` › `park`; `garden`; `dog_park`; `picnic_site` | Nature reserves, woods, beaches, peaks and notable trees (`natural=*`) are not in the layer |
| Culture | `museum`; `art_gallery` › `gallery`, `arts_centre`; `library` › `library`; `theatre`; `cinema` | Well covered |
| Viewpoints & oddities | `attraction` › `viewpoint`, `attraction`; `aquarium`; `zoo` › `zoo`; `theme_park` | Oddities barely exist: no fountains, clocks or curiosities. `attraction` is a catch-all, tagged unevenly. Viewpoints are often unnamed |
| Nightlife | `bar` › `bar`, `nightclub`; `beer` › `pub`, `biergarten` | No opening hours |

Everything else in the layer is left out: transit, offices, schools, health, cars, ATMs, toilets, sport pitches and lodging. Art and viewpoints are the categories hurt most by the rule that unnamed places are left out, so both are kept when unnamed (owner, Oct 31).

## Architecture in brief

Discovery follows v0.5's places pattern: pure logic behind interfaces, one adapter that knows the tile schema, and truth kept apart from cache.

- **`PlaceSource`** (`lib/discovery/types.ts`) hands out named places with a category and a point for an area. Tiles are the first source. A richer one (an art pack, a downloaded region) plugs in later without touching the picker.
- **The category adapter** (`lib/discovery/tilePois.ts`) is the only file that knows OpenMapTiles `poi` classes. It mirrors `areas/tilePlaces.ts`, and its mapping is the table above.
- **Pure modules** hold the picker, the ambient gate and the recall check. They are tested against in-memory sources, and only the adapter tests touch real tile data.
- **Storage** goes through the shared `Db` interface: the next SQLite migration on native, the next IndexedDB version on web, with the same fields.

| Table | Key fields | Kind | Notes |
| --- | --- | --- | --- |
| Place | key, name, category, lat, lon, build | Cache | key = category + normalized name + position rounded to 4 decimals (about 10 m). Purged and re-read with streets on a tile build change |
| Offered | place\_key, offered\_at, origin | Truth | Every place ever offered, by scan or ambient, so nothing is offered twice. Never purged |
| Mark | id, walk\_id (null when planned from home), place snapshot (key, name, category, lat, lon), origin (scan, ambient), state (open, found, dismissed), created\_at, resolved\_at, capture\_id | Truth | The snapshot keeps a mark whole after a cache purge |
| Recall | capture\_id, frequency, until, last\_fired\_at, fired\_count | Truth | The main tab's table, unchanged |
| Preferences | meta `discovery_prefs`: category → more, normal or less | Setting | Absent until the first scan asks |

Reused, not rebuilt:

- **Navigation.** Go here on a mark is an ordinary destination (`routeTo`, `RouteSource`).
- **Notifications.** `lib/notify` (expo-notifications), with permission asked at first need, as for pause.
- **The heading cone.** `headingOf` gives "ahead" for ambient alerts.
- **Live street reads.** `collectView` (z14 only, once per 100 m moved) and `collect` gain the `poi` layer, so places are cached as a side effect of reads the app already makes.

## Slice 1: places data

Places are cached from the tiles the app already reads, keyed without dataset ids, and rebuilt like streets.

Acceptance criteria:

- D1. Places are read from the `poi` layer at z14, in the same reads as streets: the walk screen's live reads (`collectView`), the read on stop (`snapWalk`), and the read around a scan circle (`collect`). On native, the vector source gets an invisible `poi` layer so its features load, as for streets.
- D2. Below z14 nothing is cached (`complete: false`), and on web only features from z14 tiles are kept (`feature._z`).
- D3. The category adapter maps class and subclass to one of the eight categories, as in the table above. Any other class or subclass is left out.
- D4. Places with no name are left out, except artworks and viewpoints, which are kept and revealed as "Public art" and "A viewpoint" (owner, Oct 31).
- D5. A place's key is category + normalized name (trimmed, case-folded) + position rounded to 4 decimals. The same POI from two tiles, or from two reads, is one row. An unnamed artwork or viewpoint is keyed by category + rounded position.
- D6. For the never-twice rule, a place with the same category and name within 50 m of an offered one counts as offered, so a POI nudged in OSM is not offered again.
- D7. Place rows carry the tile build. On a build change they are purged with street segments and re-read by the next read. Offered and Mark rows are untouched.
- D8. Offered keeps every place offered by scan or ambient, across all walks, and is never cleared by a purge or a re-scan.
- D9. A 3.6 km downtown read (about 16k features) still derives streets and places in under a second.
- D10. Nothing leaves the device: places come only from the tiles the map already loads.

Planned tests (unit in `src/lib/__tests__/discovery.test.ts`; e2e in `scripts/e2e-web.js`, whose fake z14 grid gains a `poi` layer):

| Criterion | Test | Kind |
| --- | --- | --- |
| D1 | places: the walk's live read caches the grid's POIs | e2e |
| D2 | places: a read below z14 caches nothing; non-z14 features are dropped | Unit |
| D3 | places: each category's classes map, places of worship to history & landmarks; bus stops, offices and supermarkets are left out | Unit |
| D4 | places: unnamed POIs are left out, except artworks and viewpoints | Unit |
| D5 | places: one POI in two tiles' buffers is one row; the key ignores case and spaces | Unit |
| D6 | places: a same-named POI moved 40 m counts as offered; 60 m away does not | Unit |
| D7 | places: a new build purges Place rows and keeps Offered and Mark | Unit |
| D8 | places: Offered survives a purge and a re-scan | Unit |
| D9 | places: the 16k-feature fixture derives in under 1 s | Unit |
| D10 | places: no request leaves the page beyond tiles during a walk with a scan | e2e |

## Slice 2: scan

A scan drops about six question marks within 500 m; each is learned only by walking to it, and closes with a capture or a dismiss.

The circle is 500 m because the farthest mark should be roughly a 10–15 minute walk. 500 m in a straight line is 650–750 m on city streets (a detour factor of 1.3–1.5). That is about 10 minutes at 4.5 km/h, and closer to 15 with a stop or a wrong turn.

Acceptance criteria:

- S1. A Scan edge button on the walk screen scans around you. On the home, a long press at z12 or closer offers "Scan here" beside "Walk here".
- S2. A scan reads the z14 tiles of a 500 m circle behind "Scanning…" with Cancel, adds the cached places, and keeps those inside the circle.
- S3. A scan offers 6 marks when the circle has enough places. Categories are drawn by weight: more 2, normal 1, less 0.5. At least 1 mark is a wildcard, drawn ignoring preferences, and 2 when 6 are offered. The radius, count and spacing live in SCAN\_RULES.
- S4. A matched mark and a wildcard look and behave the same. Nothing stored or shown tells them apart.
- S5. Marks are at least 100 m apart, and none is within 60 m of where the scan was made.
- S6. A scan never offers a place already in Offered. Every offered place is written to Offered at once.
- S7. A mark is a "?" pin. Within 60 m (an accepted fix) its pin shows the category icon and the name. An unnamed artwork shows "Public art", an unnamed viewpoint "A viewpoint".
- S8. A capture within 60 m of an open mark resolves it as found and links the capture. Two marks in reach: the nearer one.
- S9. Dismiss in a mark's sheet resolves it as dismissed. The replay shows it as a low ("Passed on: a mark near Wickenden St"), never hidden.
- S10. A re-scan replaces the walk's open marks and keeps the resolved ones. The replaced places stay in Offered.
- S11. Marks from "Scan here" on the home have no walk. The next walk started adopts them. Left unresolved, they expire silently after 14 days and stay in Offered.
- S12. Go here in a mark's sheet navigates to it. The top bar reads "Mark" until it is revealed, then its name.
- S13. The replay shows a found mark's name and category with its capture. The card counts finds by category ("2 food & drink · 1 art") and marks found and dismissed. No total appears anywhere else.
- S14. The first scan asks preferences first: eight rows of more, normal and less, all normal, then Scan. They are editable from the home. A change never alters open marks.
- S15. Too few places: as many marks as fit, with "Only N spots nearby". None: "Nothing to find here yet". Tiles that fail: "Couldn't read the map here", and nothing changes.
- S16. On the web, scan works while the page is open, with the same code. S17 (owner, Nov 2, after a scan offered a Domino's). Chains are not discoveries. A scan and an ambient hint leave out places whose name matches a default chain list. The list is data, kept per category, so Subway the sandwich shop is left out but Subway Art Supply is not. Food courts are never places. Tests: noise.test.ts (unit). S18–S23 (owner, Nov 2: scans kept offering food and bars). A ? mark is for an attraction or a unique place. The ordinary activity of an area shows as its busy streets instead. S18. Only these become marks, from a scan or a hint: public art; galleries, arts centres, museums and theatres; monuments, castles and ruins; viewpoints, attractions, aquariums, zoos and theme parks; named parks and gardens. Food, shops and nightlife never become marks. They still count toward busy streets. S19. Cinemas, dog parks, picnic sites, art shops and chains are never marks. S20. Places of worship, town halls, courthouses, cemeteries and libraries become marks only when their name marks them as historic or notable. The word list is kept as data: old, historic, colonial, burial or burying ground, churchyard, cathedral, basilica, abbey, mission, meeting house, state house, athenaeum, and so on. "St. Mary's Church" stays out; "Old North Church" and "Cathedral of St. John" are kept. S21. A scan, on a walk or from the home, does both. After its marks, it reads the 1.5 km around where it was made, with the tile decoder and no camera moves. It shows the busy strips and pockets in magenta, remembered like "What's good here" (replacing an area centred within 1 km). A failed or cancelled sweep keeps the marks. S22. The scan's note says both, for example "2 marks nearby · 1 busy street". S23. The preferences list only the five attraction categories. The chains switch is gone, since no mark can be a chain. Audited and deployed (Nov 2). The fixes: the phone's database keeps whether a place can be a mark; places cached before that are not marks until read again; the sweep runs after the scan ends, so Stop and the map are never held; a current area within 1 km is shown rather than read again or replaced; the walk map draws only areas within 3 km. Deferred: using the map's own rank as the notable signal, names in non-Latin scripts, theme parks and indoor attractions. Tests: scanAudit.test.ts (unit) and the e2e.

Planned tests:

| Criterion | Test | Kind |
| --- | --- | --- |
| S1 | scan: the edge button scans; a home long press offers Scan here | e2e |
| S2 | scan: only places inside 500 m are candidates | Unit |
| S3 | scan: 6 marks; weights 2, 1, 0.5 over 10k draws; 1–2 wildcards | Unit |
| S4 | scan: a mark's stored and rendered fields are the same for wildcards | Unit |
| S5 | scan: marks 100 m apart, none within 60 m of the center | Unit |
| S6 | scan: offered places never return; a scan writes Offered | Unit |
| S7 | scan: a "?" pin reveals its name within 60 m; an unnamed artwork shows Public art | e2e |
| S8 | scan: a photo within 60 m resolves the nearer mark as found | Unit, e2e |
| S9 | scan: dismiss resolves; the replay shows the low | e2e |
| S10 | scan: re-scan replaces open marks and keeps resolved ones | Unit |
| S11 | scan: home marks attach to the next walk and expire after 14 days | Unit, e2e |
| S12 | scan: Go here on a mark routes, labelled Mark until revealed | e2e |
| S13 | scan: the card counts finds by category, found and dismissed | Unit |
| S14 | scan: the first scan asks preferences; edits keep open marks | e2e |
| S15 | scan: too few, none and failed reads | Unit |
| S16 | covered by the e2e above, which runs on web | e2e |

## Slice 3: ambient (phone only)

Ambient alerts are a distance check inside the background location task: at most three a walk, for something ahead on an unwalked street, named only on arrival.

**The crux.** The background task cannot move the map, so it cannot read new tiles. Places must already be cached ahead of you. Two ways:

- **A. Decode tiles in JS, without the map** (decided, owner, Oct 31), as the main tab's architecture intended. Fetch the z14 tile you are in and its 8 neighbours from the TileJSON's tile URL, and decode them with `pbf` and `@mapbox/vector-tile`. Both are already in `node_modules` as maplibre-gl dependencies (5.1.2 and 3.0.0), and would become direct ones. OpenFreeMap serves z/x/y tiles, so `pmtiles` is not needed. A z14 tile is about 1.8 km wide at Providence's latitude, so a fetch is needed only when you enter a new tile. Background fetching while iOS keeps location running is unverified on a device. Decided: pbf and @mapbox/vector-tile become direct dependencies, with no pmtiles (owner, Oct 31).
- **B. Use only places cached while the screen was on (not chosen).** No new dependency, but a pocketed walk, the main case, caches only what was on screen before the phone went into the pocket. Ambient would go quiet after the first few hundred metres.

Acceptance criteria:

- A1. Ambient exists only on a phone. The web shows no ambient setting.
- A2. It is opt-in per walk, from the walk screen, with a quiet-walk toggle that silences ambient and reminders. An optional auto-scan setting runs a scan when a walk starts.
- A3. Checks run in the background location task, on each batch of accepted fixes (`filterFixes`), never on a timer. The same check runs in the foreground.
- A4. A candidate is within 150 m, and ahead: its bearing within ±45° of your heading. The heading is the device's course when iOS reports it as accurate, else the bearing from a fix 20–30 m back. With neither, there is no alert.
- A5. A candidate is on or beside an unwalked street (within 30 m of a piece with no VisitedSegment and not walked this walk), and never offered before.
- A6. Budget: at most 3 alerts a walk, at least 10 min apart. At walk start a draw (25%) gives the walk no alerts at all, and each eligible candidate then passes a coin (50%). The numbers live in `AMBIENT_RULES`.
- A7. The notification gives category, distance (to 10 m) and direction, never the name: "Some art, 120 m ahead, on your left". The tiles can't say "a mural" (see What the tiles carry), so each category has one plain noun phrase.
- A8. One at a time: no alert while a scanned mark is pursued (navigating to it, or closing within 150 m of an open one), or while an ambient mark is open. In front, a pill replaces the banner.
- A9. An alert becomes an ambient mark with a "?" pin. Tapping the notification opens the walk screen on it, with Go here.
- A10. The name is revealed on arrival, within 30 m. The mark closes like a scan mark: found by a capture within 60 m, or dismissed.
- A11. Entering a new z14 tile fetches and decodes it and its neighbours in the background, caching streets and places with the tile build. A failed fetch leaves the cache as it was.

Planned tests (unit against the pure gate, one e2e for the web; on a phone, the rest is checked by hand):

| Criterion | Test | Kind |
| --- | --- | --- |
| A1 | ambient: the web walk screen has no ambient toggle | e2e |
| A2 | ambient: off by default; quiet walk silences ambient and recalls | Unit |
| A3 | ambient: the gate reads accepted fixes only | Unit |
| A4 | ambient: 150 m and ±45°; course vs bearing from 20–30 m back; no heading, no alert | Unit |
| A5 | ambient: a walked street or an offered place disqualifies | Unit |
| A6 | ambient: 3 a walk, 10 min apart; seeded draws give some walks none | Unit |
| A7 | ambient: wording has category, distance, side, no name | Unit |
| A8 | ambient: silent while a scan mark is pursued or an ambient mark is open | Unit |
| A9 | ambient: an alert writes an ambient mark and Offered | Unit |
| A10 | ambient: revealed at 30 m, closed by a capture or dismiss | Unit |
| A11 | ambient: a decoded tile fixture yields the same places as the map read | Unit |

## Slice 4: remind me here

A capture you flag comes back when a later walk passes within 75 m, carrying its own content; it needs no tile data and works offline.

Acceptance criteria:

- R1. The viewer has "Remind me here" on any capture. It sets a frequency (once, every visit, at most weekly, at most monthly; once by default) and an optional until-date.
- R2. A flagged capture fires within 75 m of an accepted fix during a walk. It never fires in the walk that recorded it, and at most once per walk.
- R3. In front it shows in-app on the walk screen, on both platforms. On a phone with the app in the background it is a notification from the location task. On the web it fires only while the page is open.
- R4. It carries the content: the note's text (its first 120 characters), a photo's thumbnail where the platform shows one, or "Voice memo, Oct 20" ("Video, Oct 20"). Tapping opens the capture in the viewer, and a memo or video plays.
- R5. "At most weekly" waits 7 days from `last_fired_at`, "at most monthly" 30 days.
- R6. "Once" clears the flag on its first fire. After the until-date the flag ends silently, and the capture stays an ordinary memory.
- R7. One notification at a time: a reminder never shows beside an ambient alert. When both are due, the reminder goes first and the alert waits. Reminders don't use the ambient budget. Two reminders in reach show as one: "2 memories here".
- R8. Every flagged capture has "Stop reminding me", in the viewer and as a notification action. Quiet walk silences reminders.
- R9. A reminder resolves when viewed or dismissed, and `fired_count` and `last_fired_at` are written.
- R10. Nothing leaves the device; reminders need no network.

Planned tests:

| Criterion | Test | Kind |
| --- | --- | --- |
| R1 | recall: the viewer flags a capture with frequency and until | e2e |
| R2 | recall: fires within 75 m; not in its own walk; once per walk | Unit |
| R3 | recall: the walk screen shows the reminder in front | e2e |
| R4 | recall: note text, photo thumbnail and memo wording | Unit |
| R5 | recall: weekly and monthly floors | Unit |
| R6 | recall: once clears; past the until-date it is silent | Unit |
| R7 | recall: never beside an ambient alert; two merge into one | Unit |
| R8 | recall: stop reminding me clears; quiet walk silences | Unit, e2e |
| R9 | recall: viewing writes fired\_count and last\_fired\_at | Unit |
| R10 | recall: fires with the network off | e2e |

## Slice 5: explore (replaces scan and ambient)

Discoveries surface as you walk, with nothing to plan (owner, Nov 1). A walk starts quiet; turning Explore on in the walk's options makes it an exploring walk. Every neighborhood you walk quietly gets a checklist of its attractions. A "?" appears only when one is within about 100 m, in eye view, and the count shows on the home afterwards. Built test-first and audited (Nov 1). Audit fixes: a town's checklist reaches 1.5 km at most, places beyond it are uncounted orphans; a later read never rebuilds or takes from a built area; one area is one level and name within 1 km, since a town's point moves with zoom; route reads run once per route; a reload never lets a capture find a second place; the web reads items by latitude; found pins are small and let taps through; the replay counts what it passed only after exploring began. Deferred: unstamped captures finding places, a place moved by a new build found twice, the pocket alert with the screen off (native), the home preview's kind filter and view restore.

Acceptance criteria:

- E1. There is no Scan or Explore this area button and no auto-scan. A walk starts quiet (E9). An Explore button beside Start walk on the home, or the Explore switch in the walk's options card, makes a walk explore (owner, Nov 1). The old scan preferences are replaced by E16–E18.
- E2. When a walk's latest accepted fix is in an area with no checklist for the current tile build, the app reads the 1.5 km around the fix once, with the tile decoder (no camera moves, no cover). That one read builds both the checklist (places that pass isMarkable, S18–S20) and the busy-streets analysis. It never fetches twice. It runs on quiet walks too, invisibly, so captures can still find places.
- E3. Each kept place goes on the checklist of its nearest neighborhood point within 1 km, the v0.5 placement rule. With none, it goes to the town or city within the walks' reach (3 km or 10 km). With neither, the place has no checklist, but its "?" still shows as you walk past. A place is on one checklist.
- E4. A checklist is fixed for its tile build and dated. There is no Refresh button. When the build changes, the checklist is rebuilt quietly the next time you enter the area. Finds are kept, the count may change, and "list from \<date>" shows the new date.
- E5. A failed or partial read builds nothing and changes nothing; it is tried again after 2 min and 100 m walked. Offline, no "?" marks show. Building never holds the map, Stop or navigation. Reads happen only on a new area or a build change.
- E6. While exploring, a "?" shows for a checklist place only within your range of the latest accepted fix (E20; 100 m by default), at most 8 at once, nearest first (NEAR\_CAP). Marks fade in and out at the edge. Nothing farther is drawn.
- E7. Within 60 m the "?" shows the category icon and the name, with S7's labels for unnamed art and viewpoints. Walking past only names a place; it never counts as found.
- E8. Found means a capture (photo, memo, note or video) within 60 m of a checklist place; with two in reach, the nearer. A found place stays drawn on the walk at any distance, and shows in its neighborhood's place view on the home.
- E9. A quiet walk is navigation plus captures (owner, Nov 1). It hides every discovery layer: "?" marks, magenta busy streets, the "On \<strip>" chip, the dead-zone pill and the pocket haptic. Navigation, captures, reminders, the trace and the fog stay. Its background reads build checklists but save no busy streets (owner, after the audit). A capture still finds a place, quietly.
- E10. The home shows no "?" marks and no found places on the overview. A neighborhood's place view shows "12 of 87 · list from Nov 1" and its found places. No ring, badge, streak or percentage, and nothing on the walk screen.
- E11. The replay shows a found place's name and category with its capture. The card lists the places found on this walk. Its low is the places revealed (within 60 m) but not captured: "Passed 3 places you didn't stop for". The card shows no checklist count.
- E12. Go here in a revealed place's sheet navigates to it; the top bar shows its name.
- E13. Checklists and finds are their own records, not Marks, and are kept: a tile-build purge never clears them. A checklist copies what it needs (key, name, category, kind, place) from the derived place cache.
- E14. On upgrade, scan and ambient Marks are no longer read or drawn. The rows stay (they are truth). Found ones stay in their walks' replays.
- E15. On the web, exploring works while the page is open, with the same code.
- E16. Settings has a "What I'm into" filter with 8 switches, all on: public art; museums and galleries; theatres; monuments and ruins; historic churches; cemeteries; parks and gardens; viewpoints and attractions. The walk's options card links to it. A choice lasts until changed (owner, Nov 1).
- E17. A kind switched off gets no "?" marks on the walk. It stays on the checklist and in the count, so "12 of 87" never moves with the filter. Switching it back on shows its marks at once.
- E18. A capture near a hidden place still finds it, and the replay shows the find.
- E19. Pocket alert: an optional soft haptic, once per place, when a "?" comes into your range. It is a setting, off by default, never a notification banner, and silent on a quiet walk.
- E20. Range: settings has a "?" range slider, 60–300 m in 20 m steps, 100 m by default (owner, Nov 1). It never goes below the 60 m naming distance. It lasts until changed and applies from the next fix. The 8-mark cap still holds.
- E21. The slider shows a live "aggro range" preview: a small map centred on your position (else the end of your last walk), with the ring redrawn as you drag and the checklist's "?" marks that would fall inside it. Offline, the ring shows over a plain scale. The ring is never drawn on the walk map.
- E22. On the way: while navigating on an exploring walk, every checklist place within your range (E20) of the route ahead shows as a faint, unnamed "?" (owner, Nov 1). It becomes a normal "?" once within range of you, and named at 60 m. Places behind you drop off as you pass. A re-route redraws them.
- E23. Route marks are their own layer, capped at 20 nearest along the route, so they never take the 8 nearby slots (E6). A quiet walk shows none. When a route starts, areas along it with no checklist are read then, by E2's rules, one read per area.

Retired by this slice: S1–S6, S9–S12, S14, S15, the marks half of S21, S22 and S23; all of slice 3 (A1–A11, ambient hints and the background tile fetch); landing's Start here pin (in L9), L10, L13 and L16 (Walk here, Scan here and Walk the loop from a pin, the loop's legs, the scan on arrival).

Kept: S7, S8, S16–S20; S21's busy-streets read, now run by E2, as information only (magenta strips and pockets, no pin, no card); the "On \<strip>" chip, the dead-zone pill and What's good here; slice 4 (remind me here); quiet walk.

Planned tests:

| Criteria | Test |
| --- | --- |
| E3, E4, E6–E9 | explore.test.ts (unit, pure: membership, frozen counts, near and cap, reveal, find, quiet) |
| E2, E5 | exploreBuild.test.ts (unit, decoder fixture via mvtFixture.ts) |
| E13, E14 | db tests (unit: kept stores, retiring open marks) |
| E1, E6, E10, E11 | scripts/e2e-web.js (no Scan button, ? within 100 m only, home fraction, replay finds) |
| E12, E15 | scripts/e2e-web.js |
| E16–E18 | explore.test.ts (unit: filter hides marks, count unchanged, hidden finds) and scripts/e2e-web.js (settings switch) |
| E9, E19 | explore.test.ts (unit: quiet hides every layer, haptic once per place, off by default) and scripts/e2e-web.js (a walk starts quiet; Explore switch) |
| E20, E21 | explore.test.ts (unit: range clamped to 60–300, steps of 20, used by E6 and E19) and scripts/e2e-web.js (slider redraws the preview ring; no ring on the walk map) |
| E22, E23 | explore.test.ts (unit: corridor by range, drop-off behind, cap 20, separate from 8, none when quiet) and scripts/e2e-web.js (faint marks along a route, re-route redraws) |

Decided (owner, Nov 1): busy streets found by E2 show in magenta on walks automatically, as information. A neighborhood whose checklist is empty is left out of the home sheet's counts (Claude's default; say if you'd rather see "0 of 0").

The 8 kinds split today's history and culture categories more finely, so tilePois.ts needs a kind per place beside its category. That is the one new data mapping in this slice.

## Slice 6: notifications on the web, and their settings

The web app becomes installable, so its notifications can be tried on a phone, and both platforms follow one set of decisions through one contract (owner, Nov 1). Notifications stay local: nothing is sent to or through a server. Built test-first and audited (Nov 1). Audit fixes: a tap with a screen in front opens the capture at once; a cold open with a walk still open lands on the walk; a phone keeps a tap that launched the app; permission is asked first in the tap; a kind switched off never prompts, and turning the pause reminder off cancels a pending one; the test never says Sent for nothing; old hint notices are cleared at stop. The switches save as they change. Deferred: the Android channel's importance (the test may not pop up as a banner), and unit tests of the web transport (the e2e drives the real service worker).

Acceptance criteria:

- NT1. The web app can be added to a phone's home screen: a manifest (name, icons at 192 and 512 px, standalone display, start URL and scope under the base path) and Apple home-screen tags.
- NT2. A service worker at the base path is registered on load. Without one (an old browser), only notifications are lost.
- NT3. One notification contract for both platforms. The app says what to notify (kind, id, title, body, data, optional actions); a platform transport says how (expo-notifications on phones, the service worker on the web). Reminder and pause code never imports a platform API.
- NT4. Settings gains a Notifications section with two switches, both on by default: Remind me here, and Pause reminder. A kind switched off sends no notification; the walk screen's own card and sticky reminder still show on screen.
- NT5. Permission is asked when first needed (a reminder set, the first pause, a switch turned on, or the test button), never at launch. When it is denied, the section says so and how to allow it.
- NT6. "Send a test notification" in the section shows a real reminder-style notification within a few seconds, whatever is on screen.
- NT7. Remind me here on the web: a reminder that fires while the page is hidden but alive shows a notification with the capture's content; on screen it is the in-app card, as on phones. One per walk, a newer one replacing the last.
- NT8. Tapping a reminder notification opens the app on that capture, playing (R4), on both platforms. On the web it focuses an open window, else opens one.
- NT9. "Stop reminding me" is on the notification where the platform offers actions (phones, Android Chrome, desktop). iOS web shows none; the viewer stops it.
- NT10. Pause reminder on the web: after 10 min paused, a notification if the page is hidden; cancelled on resume or stop. It can only fire while the page is alive, and iOS suspends a backgrounded page, so on an iPhone it is best effort; the section says so.
- NT11. Stopping a walk clears its notifications on both platforms.
- NT12. AGENTS.md lists the web transport as a web exception, with its reason.

Planned tests:

| Criteria | Test |
| --- | --- |
| NT3, NT4, NT7, NT10 | notify.test.ts (unit: the gate by kind and setting, what is sent for a reminder and a pause, in front versus hidden, through a fake transport) |
| NT8, NT9 | notify.test.ts (unit: a tap and an action routed the same way from either platform's event) |
| NT1, NT2, NT4-NT6 | scripts/e2e-web.js (manifest linked and served, service worker active, switches kept, the test notification shown) |

Native, unverified on a device: the phone transport behind the new contract, and the test notification.

## How v1 is built

The same six steps as v0.5, one slice at a time: spec, failing tests, build, then one adversarial audit plus a UI/UX review, regression tests before each fix, and deploy to main after the full suite passes. Native code not yet run on a device is flagged in every report.

Proposed order: 1, 2, 4, then 3. Reminders need no tiles, and ambient waits for the library decision.

| Slice | Tested by | Needs a phone build to verify |
| --- | --- | --- |
| 1. Places data | Unit; e2e (the fake z14 grid gains a `poi` layer) | The SQLite migration, and the native `poi` read through `querySourceFeatures` |
| 2. Scan | Unit for the picker; e2e for the screens | MapLibre RN "?" pins and the home long press |
| 3. Ambient | Unit for the gate and the decoder; one e2e (absent on web) | All of it: checks in the background task, notifications, background tile fetches, iOS course accuracy |
| 4. Remind me here | Unit; e2e for the in-app reminder | The background notification, its thumbnail and its "Stop reminding me" action |

## Open questions for the owner

1. **Background tile reading:** decode z14 tiles in JS without the map (fetch, `pbf`, `@mapbox/vector-tile` as direct dependencies; no `pmtiles`), or rely only on places cached while the screen was on? Recommended: decode in JS. Without it, ambient goes quiet on a pocketed walk, which is its main case. Decided: decode z14 tiles in code, with pbf and @mapbox/vector-tile as direct dependencies and no pmtiles (owner, Oct 31).
2. **Art coverage:** the tiles carry `tourism=artwork` (class `art_gallery`, subclass `artwork`), but can't tell a mural from a sculpture, and many pieces are unnamed. Recommended: scan and ambient offer art where the tiles have it, worded "art", never "mural". Keep unnamed artworks and viewpoints as "Public art" and "A viewpoint", an exception to the no-name rule. Plan a richer art source for later behind `PlaceSource`, such as a script-built pack carrying `artwork_type`, like the boundary pack. Decided: art is offered where the tiles have it, worded "art", never "mural"; unnamed artworks and viewpoints are revealed as "Public art" and "A viewpoint"; a richer art source comes later, behind PlaceSource (owner, Oct 31).
3. **Scan radius and mark count:** 500 m, 6 marks, at least 100 m apart? Recommended: yes, versioned as `SCAN_RULES` and tuned after ten walks with scans. Decided: 500 m, 6 marks at least 100 m apart, versioned as SCAN\_RULES (owner, Oct 31).
4. **Do found marks count toward anything?** Recommended: no. Finds are counted only on that walk's replay and card, with no totals, no home counts and no history of finds, as restraint asks. Decided: finds are counted only on that walk's replay and card (owner, Oct 31).
5. **Direction wording when the course is unreliable:** use the bearing from a fix 20–30 m back, and with neither, hold the alert? Recommended: yes. Never say "ahead" without a heading, and never fall back to compass words. Decided: directions only with a reliable heading (owner, Oct 31).
6. **"Scan here" from the home, with no walk yet:** marks with no walk attach to the next walk started. Should they expire? Recommended: they attach to the next walk, and expire silently after 14 days unresolved, staying in Offered. Decided: marks planned from home attach to the next walk and expire after 14 days (owner, Oct 31).
7. **Can a reminder fire outside a walk?** The main tab defers wake-up regions. Recommended: no for v1, walks only. Revisit coarse wake-up regions once session-only reminders have been lived with. Decided: reminders fire only during walks (owner, Oct 31).

## Sources

Read on Oct 31 (master and main branches):

- [OpenMapTiles poi layer schema (poi.yaml)](https://github.com/openmaptiles/openmaptiles/blob/master/layers/poi/poi.yaml): classes, subclasses and fields
- [OpenMapTiles poi mapping (mapping.yaml)](https://github.com/openmaptiles/openmaptiles/blob/master/layers/poi/mapping.yaml): which OSM tags enter the layer
- [OpenMapTiles poi.sql](https://github.com/openmaptiles/openmaptiles/blob/master/layers/poi/poi.sql) and [class.sql](https://github.com/openmaptiles/openmaptiles/blob/master/layers/poi/class.sql): zooms and rank
- [planetiler-openmaptiles Poi.java](https://github.com/openmaptiles/planetiler-openmaptiles/blob/main/src/main/java/org/openmaptiles/layers/Poi.java): min zooms, the 64 px label grid, polygon centroids
