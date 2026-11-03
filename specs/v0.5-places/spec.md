<!-- Mirror of the Claude Docs tab "v0.5: memory and places" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# v0.5: memory and places

Oct 31, 2026 · @Miguel Guerrero

v0.5 reads the chronicle by place. Half of the list already shipped in v0; the headline that remains is a places history: every neighborhood, town, city and state you walked in, starred on the home map; tapping a star lists its walks. Everything here stays on the phone and is rebuilt from the trace.

## Status of the v0.5 list

Six pieces shipped early in v0. Two are planned, and the rest wait for a reason named below.

| Item | Status | What exists, or why |
| --- | --- | --- |
| Place index ("what happened here") | Built in v0 | Long press on the walk map, tap on the replay card; every capture within 44 px at the current zoom (15 to 150 m), across all walks, with its walk context |
| "Unwalked streets near me" | Built in v0 | A toggle on the walk screen; named streets only, within 1 km by real distance |
| Export of keepers to the camera roll | Built in v0 | Save a single photo or video from the viewer, with its caption baked in |
| Pause | Built in v0, beyond the list | Pause stops recording; a pause is a break in the trace everywhere; a reminder after 10 min |
| Standstill smoothing | Built in v0, beyond the list | 30 s bins; a stay of 2 min or more within 25 m collapses to one point, so standing still adds no distance |
| Photo captions | Built in v0, beyond the list | Stored as data, baked in only when saved out |
| Places history view | Planned, the headline | The areas you walked in, on a map and in a list; the rest of this tab |
| Navigate (walk me back is one use) | Planned as slice 4 (owner, Oct 31); see Navigate (slice 4) | Routes computed on the device, inside a walk: back along this walk's trace, or over cached streets to a pin, a point or a star. No turn-by-turn, no voice |
| Completion % per neighborhood | Deferred until real boundaries (owner, Oct 31) | Needs a neighborhood's full street list, which needs a boundary the tiles don't carry (see below) |
| Nearby places from the pois layer | Past v0.5 (owner, Oct 31) | Nothing in v0.5 shows them; discovery and capture stamping are their first users |
| Downloadable regions (.pmtiles extracts) | Past v0.5 (owner, Oct 31) | The app reads OpenFreeMap's hosted tiles, not a planet file of your own; the ambient cache already covers areas you have seen |
| Zip backup | Deferred (the owner's call) | Code exists (`writeWalkBundle`), nothing in the UI reaches it; waits for the export system's own control, tested on a phone |
| Static walk card | Past v0.5 (owner, Oct 31) | It is the first shareable thing; it fits with the export system, not before it |
| Place table (POIs) | Past v0.5, with nearby places | Built when discovery starts |
| Region table | Past v0.5, with regions | Built with downloadable extracts |

## Places history view

A place is an area you walked in: a neighborhood, a town or city, a state. Not a point of interest. Areas nest, state › city › neighborhood, and each one gets a star once a walk passes through it.

- **Map:** zoomed out, a star per state; zoom in and the stars become cities, then neighborhoods.
- **List:** the same areas as an expandable tree, with walks, streets walked, and first and last visit.
- **Both lead back to walks.** A tapped star or row lists its walks; each opens its replay.

A star means "walked here" and nothing else. No levels, no totals to beat, no percent of a state.

## Where the area hierarchy comes from

Recommendation: neighborhoods and towns from the tiles' `place` points, assigned to the trace piece by piece; states by containment in a small bundled Natural Earth file. Nothing new leaves the phone, and every row rebuilds from the trace.

What the tiles carry (OpenMapTiles schema, as OpenFreeMap builds it with Planetiler):

- **`place`** is points only: class country, state, province, city, town, village, hamlet, borough, suburb, quarter, neighbourhood; with `name`, `rank` and `capital`. Suburbs and larger appear from z11, neighbourhoods at z14. v0's `pickArea` already reads them at stop.
- **`boundary`** is lines with `admin_level` 2 to 10 (level 8, usually a town or city line, from z11; 9 and 10 from z12). Its `name` is for aboriginal-lands polygons only, so an admin line has no name and no polygon. It can say "a line was crossed", never "which town is this".

| Option | Walk spanning two neighborhoods | When map data updates | Storage, bundle, licence | Verdict |
| --- | --- | --- | --- | --- |
| A. Nearest `place` point, per walk (v0 today) | One name for the whole walk, the one nearest its middle | Re-picked on re-snap | Nothing new | Fine for titles, too coarse for a history |
| B. Nearest `place` point, per piece of trace | Each 50 m of active trace takes the nearest point of each class; the walk is listed under both, with metres in each | Re-derived on re-snap; a renamed or moved node changes the answer, the trace doesn't | Nothing new; one z11 read for city points, which sit far from a walk's own z14 tiles | **Recommended for neighborhood and town** |
| C. B plus `boundary` crossings | As B, but a candidate across an `admin_level` 8 line from the sample is skipped, so a walk near a town line isn't pinned to the next town's center | As B | Nothing new; z11+ lines, one more read | Recommended refinement, a cut candidate |
| D. Bundled Natural Earth admin-1 polygons | Exact containment per sample, but at 1:10m scale (lines off by about 1 km) | Static until the app ships a new file; tag rows with its version | Public domain; built from the 10m edition (the 50m one misses Manhattan, Hoboken, Miami Beach), the US pack simplified to about 300 m is 577 KB | **Recommended for states only** |
| E. Who's On First | Containment, including neighborhood polygons in many cities | Static until re-bundled | Per-country SQLite builds, large (GB scale for the US, approximate); mixed licences per source, check before bundling | Too big to bundle; maybe a downloadable per-region pack later |
| F. OSM admin polygons (bundled or per region) | True containment where cities are mapped | Static per extract | ODbL: attribution, and share-alike on a derived database; hundreds of MB worldwide | Later, with downloadable regions |
| G. Platform reverse geocoder (expo-location `reverseGeocodeAsync`) | Per sample, exact names | Server-side, invisible | Sends each position to Apple or Google | **Ruled out: conflicts with local-only** |
| H. Offline geocoder over GeoNames points | Nearest city with its state code | Static | CC BY 4.0; tens of MB for cities1000 (approximate) | No neighborhoods, still nearest-point; B already does this from tiles |

How the recommendation behaves:

- **Two neighborhoods.** The walk counts in both. Each area gets its metres, first and last time, and streets walked; the walk's `area` (its title) is the one with the most metres.
- **Outside any named neighborhood.** No neighbourhood, suburb or quarter point within 1 km: the walk sits directly under its town. No town within 3 km (a city point within 10 km): directly under its state. The list shows it as "Elsewhere in \<town>".
- **Map data renames or moves a place.** Area rows are cache tagged with the tile build. When the build changes, the walk re-derives its areas at its next re-snap; the old star goes and the new one appears with the same walks. History never lives in the area rows.
- **Cost.** No new download for neighborhoods and towns. One bundled states file, public domain. One extra low-zoom read at stop.

### Sources stay swappable (owner, Oct 31)

No dataset is hard-coded, and native and web share one data model. As built in slice 1:

- The assignment logic depends on two interfaces only: PlaceCandidate (named points with a level and a reach) and BoundarySource (which country and state contain a point).
- Map tiles reach it through one adapter; the OpenMapTiles class names live only there.
- Boundaries ship as the app's own "boundary pack" format, built from a dataset by a script. Another dataset, or a downloaded region, is just another pack.
- Keys are level + name + parent, never a dataset's ids.
- Area and WalkArea go through the shared Db interface (SQLite on phones, IndexedDB on web), with the same fields.

Measured while building:

- Natural Earth's 50m admin-1 leaves Manhattan, Hoboken and Miami Beach outside every state, because its coastline is coarse. The pack is built from the 10m edition instead: US only, simplified to about 300 m, 577 KB.
- A point within 1 km outside every outline (a pier, a beach) takes the nearest state.
- Outside the US, a walk's state comes from the map's state points until a pack is added for that country.

## Data model

No new truth. Two new cache tables and one cache column, all written by `snapWalk` beside segments and the summary, and all dropped and rebuilt when the tile build or the area rules change.

| Table or field | Key fields | Kind | Notes |
| --- | --- | --- | --- |
| Area (new) | key, level (state, town, neighborhood), class, name, parent\_key, lat, lon, build | Cache | key = level + name + parent key, so a node that moves a little keeps its star; lat, lon is the star's spot (the place point, or the state's label point) |
| WalkArea (new) | walk\_id, area\_key, metres, first\_t, last\_t, build | Cache | One row per walk per area at every level; the list and the map read only this, Area and WalkSummary, never traces |
| VisitedSegment.area\_key (new column) | area\_key | Cache | The neighborhood (or town) at the piece's midpoint; gives "streets walked" per area without a trace read |
| Walk.area (existing) | area | Walk field, filled from cache | Stays the title area; now the neighborhood with the most metres in WalkArea, so titles and the tree agree |
| Place (planned, POIs) | key, name, kind, lat, lon | Cache | Unchanged by this tab; points of interest, not areas. Deferred with nearby places |
| Region (planned) | id, bbox, file\_path, archive\_date | Downloads | Unchanged; a region could later be named after the Area it covers |

Rebuild rule: a walk whose `snapped_build` is null (new build, or `SNAP_RULES` bumped) re-derives its WalkArea rows when its replay next opens, as streets do today. Add an `AREA_RULES` version so the radii above can change without a tile change. An Area row with no WalkArea left is deleted.

## Map view

One level of stars at a time, chosen by zoom, so the map never shows a state and its towns at once.

| Zoom | Stars show | Tap opens |
| --- | --- | --- |
| Below z6 | States | The state's sheet; "Show towns" zooms to fit its towns |
| z6 to z10 | Towns and cities | The town's sheet; "Show neighborhoods" zooms in |
| z11 and up | Neighborhoods, plus "Elsewhere in \<town>" at the town's spot | The neighborhood's sheet |

- **A star is the same size and colour everywhere.** It doesn't grow with walks or streets. Stars within 44 px merge into one with a count, as capture pins do (`useZoomPins`).
- **The sheet:** name and its parents ("Fox Point · Providence · Rhode Island"), walks, streets walked, first and last visit, then its walks newest first, by title and date.
- **A walk opens its replay**, as from the log: a re-watch that moves on by itself. The places map draws no traces, so it never loads them in bulk.
- **From the other side:** the replay card's area name and a walk row in the home sheet's area name open that area on the places map.
- **Offline:** stars come from the database, so they draw even where tiles aren't cached; the basemap there is blank.

## List view

Replaced (owner, Oct 31): no tree; the home's sheet lists walks (see Home map). ~~The same areas as a tree: state › town › neighborhood › walks. Rows are collapsed below the top level, except when there is only one state, which opens to its towns.~~

## Completion % per neighborhood

Recommendation: wait. A percentage needs every named street inside the neighborhood, and the tiles give a neighborhood a point, not an edge.

- **Without polygons** any denominator is invented: a circle or a Voronoi cell around the point moves the number whenever a neighboring point is added to OSM, the CityStrides complaint the main tab already names.
- **It also needs streets you never walked near**, so the app would read tiles for the whole area, not just the walk's surroundings.
- **What ships instead:** "streets walked" per area, a count that only grows and never depends on an edge.
- **When to revisit:** with downloadable regions, if OSM admin polygons (option F) come along; offer % only where a real boundary exists, and never for states.

## Prior art

Each shows one piece of the places view; the lesson is mostly what to leave out. From search results and general knowledge, not a hands-on review.

| App | What to take | What to leave |
| --- | --- | --- |
| [CityStrides](https://en.wikipedia.org/wiki/CityStrides) | Progress grouped by city, from official boundaries | Leaderboards; completions lost when boundaries or streets change |
| Wandrer | Areas nested down to county, opened from the map | Points and percent as the headline |
| [Google Maps Timeline](https://www.techradar.com/phones/googles-2024-timeline-update-is-like-spotify-wrapped-for-your-travels) | World › country › cities, each with its visit dates; moved onto the phone in 2024 | Auto-detected visits; yearly recaps |
| Swarm | A map of everywhere you have been, browsable by city | Stickers, mayorships, streaks: the reward economy the main tab rules out |
| Been | The zoomed-out pleasure of marked states and countries | "You've seen 12% of the world" |

The gap: none of them nest neighborhoods under towns from your own walks, offline, and open the walk itself from the star.

## How v0.5 is built

One vertical slice at a time, spec first, tests first. A slice is done when its tests, the typecheck, lint and the full existing suite pass, and its audit findings are triaged.

| Step | What happens | Done when |
| --- | --- | --- |
| 1. Spec | Numbered acceptance criteria, each testable, in this tab, before any code | The owner has read the criteria and their planned test names |
| 2. Tests | One failing test per criterion: a unit test (`npm test`, tsx --test, pure modules with no React Native imports, fixtures well inside one z14 tile) or a step in the headless e2e (`scripts/e2e-web.js`, mocked GPS, fake z14 GeoJSON grid) | Every new test fails for the right reason |
| 3. Build | The smallest code that passes them | New tests, `npm run typecheck`, `npm run lint`, `npm test` and the e2e all pass |
| 4. Audit | One adversarial pass that tries to break the slice (concrete failure scenarios, with severity), plus one UI/UX review; report-only | Every finding is triaged accept, defer or reject, with a reason; architectural ones go to the owner as a question with a recommended option |
| 5. Fix | Each accepted finding gets a regression test first, then the fix | The full suite passes again |
| 6. Deploy | Web goes to `main` (GitHub Pages) | Only after step 5 passes; native code not yet run on a device is flagged in every report |

### Slices

| Slice | Tested by | Cut candidates | Needs a phone build to verify |
| --- | --- | --- | --- |
| 1. Area hierarchy data (source, tables, rebuild) | Unit | Boundary crossings (option C); the bundled states file, falling back to state points; backfill of v0 walks | The SQLite migration, and the wide read: it moves the camera at z10 behind the replay's cover, the same way collect does |
| 2. Places map view | e2e, unit for star levels | Star merging, "Show towns" zoom, the trace preview | Yes: MapLibre RN stars and taps |
| 3. Places list view | Cut (owner, Oct 31): no tree | The whole slice | No; plain React Native |
| 4. Navigate (walk me back is one use) | Unit for the routers and the navigator, e2e | Home long-press, re-route throttling polish | Yes: live location while navigating, the MapLibre RN route layer |
| 5. Completion % per neighborhood | Deferred (owner, Oct 31); spec only if revisited | The whole slice | No |
| 6. Regions and offline extracts | Deferred past v0.5 (owner, Oct 31) | The whole slice | Yes: file system and `pmtiles://file` sources |

Also past v0.5 (owner, Oct 31), with no slice here: nearby places from the pois layer, and the static walk card.

Slice status (Oct 31):

- Slice 1 (area data) is built and audited. 15 unit tests cover criteria 1–11, 26 and the adapters; one e2e check covers criterion 27 (a walk placed in Fox Point › Providence › Rhode Island, with Providence 2.9 km away found by the z10 read).
- Its audit had 13 findings. 9 were accepted and fixed, each with a regression test first:
  - towns stay in their state
  - one parent per neighborhood
  - zero-distance walks get country and state
  - no state-only titles
  - boroughs count as towns
  - JSON keys
  - a walk whose places couldn't be read re-snaps
  - islands are kept and the coast reach is 3 km
  - the pack loads lazily
- Deferred to the tune-after-ten-walks pass: neighborhoods beyond the street tiles, and villages thinned out at z10.
- Rejected: 300 m border precision and a sub-50 m sample offset.
- Slice 2 (home map) is built spec-first and now in its adversarial audit and UI/UX review.
- Slice 3 (places list view) is cut by the owner's decision: no tree.
- Slice 4 (navigate) is built spec-first and audited: one adversarial pass and a UI/UX review, 28 findings in all. Accepted and fixed, each with a regression test first:
  - a walk started from the home routes on its first fix
  - errors clear the saved destination
  - same-block routes go along the block
  - walk me back joins the trace only within 150 m
  - the end of the streets counts as arriving
  - failed re-routes read the streets again
  - the street read is cancellable and scales with its area
  - the spot card no longer covers the capture row
  - a ring marks the destination
  - the route is drawn only ahead of you
  - announcements come in steps, not on every fix
  - errors stay 6 s
  - the End pill's contrast is fixed
  - "Walk here" is used throughout the home, with "Walk started · recording"
- Slice 4, owner's call (Oct 31): a heading cone on the walker, with the map kept north-up.
- Slice 4, deferred: bridges and tunnels still join the streets they cross. The fix changes how street pieces are cut, so it needs its own change with a cache purge.
- Slice 4, rejected: a 30 m corner cut across a pause. Linking across a pause is what keeps walk me back working after resuming nearby.
- The native parts haven't run on a device, including the SQLite migration and the native z10 read, and for slice 4 live location while navigating, the route layer, and the cone on phones.

### Places history view: acceptance criteria

Area assignment

1. Given a walk that stays nearest one neighborhood point, when it is snapped, then it has one WalkArea row at each level: that neighborhood, its town, its state.
2. Given a walk with about 600 m nearest neighborhood A and 400 m nearest B in the same town, when it is snapped, then it has rows for A and B with metres within 50 m of each, one row for the town, and `Walk.area` is A.
3. Given a walk with no neighbourhood, suburb or quarter point within 1 km of any sample, then it has no neighborhood row, a town row, and the list shows it under "Elsewhere in \<town>".
4. Given no town or village within 3 km and no city within 10 km, then it has only a state row, listed as "Elsewhere in \<state>".
5. Metres inside a pause, across a gap of more than 60 s, or inside a standstill must add nothing to any area.
6. Fixes dropped by `filterFixes` must never assign an area.
7. A sample inside a state's polygon must take that state, even when another state's point is nearer.
8. Two neighborhoods with one name under different towns must be two areas.
9. Given a new tile build in which neighborhood A is renamed A2, when the walk's replay next opens, then its rows point at A2, A is deleted once no walk refers to it, and the walk counts are unchanged.
10. Given a new build in which A's point moved but kept its name and town, then A keeps its key and its star moves.
11. Until a walk re-snaps after a build change, its old rows must still show; the view is never blank because of an update.

Stars

12. Below z6 the map must show state stars only; from z6 to z10 town stars only; from z11 neighborhood and "Elsewhere" stars only (country stars below z3 once criterion 26 applies).
13. Stars within 44 px of each other must merge into one star with a count.
14. Every star must be the same size whatever its walks or streets.

List

15. Replaced (owner, Oct 31): no tree; see H1–H10. ~~The tree must run state › town › neighborhood › walks, every level ordered by last visit, newest first, ties by name.~~
16. Replaced (owner, Oct 31): no tree; see H1–H10. ~~A walk across two neighborhoods must appear under both and count once in their town.~~
17. Replaced (owner, Oct 31): no tree; see H1–H10. ~~Streets walked must count distinct named streets per area, once across walks.~~
18. Replaced (owner, Oct 31): no tree; see H1–H10. ~~Each row must show walks, streets walked, and first and last visit.~~

Empty states

19. With no stopped walks, the map and the list must show one line, "Walk somewhere and it is starred here", and no permission prompt.
20. A stopped walk with no areas yet (offline at stop) must be listed under "Not placed yet", and placed when its replay next opens online.
21. The open walk must not appear until it is stopped.

Links

22. Tapping a walk in a sheet or the list must open its replay as a re-watch that moves on by itself; going back returns to the same zoom or the same expanded rows.
23. Tapping the area name on the replay card or a walk row in the home sheet must open the places map at that area's level.
24. The places view must read only walks, summaries, Area and WalkArea, never traces or media.

Placement and levels

25. Given stopped walks with no areas and an online map, when Places opens for the first time, then every stopped walk is placed in one pass behind a "Placing your walks" line. A walk it can't place (offline, or its tiles fail) stays under "Not placed yet" and is retried at the next opening. Only one pass runs at a time, and leaving the view midway keeps the walks already placed.
26. A country row must be stored for every walk. The map and the list must show the country level only once walks span two or more countries; then country stars show below z3 and the tree starts at country.
27. Placing a walk must also read the `place` layer at z10 around the walk, because town (3 km) and city (10 km) points usually lie outside the z14 tiles read for its streets. A town point 2.5 km from the walk, outside its street tiles, must still be found.

### Planned tests

| Criterion | Test | Kind |
| --- | --- | --- |
| 1 | `area: a walk in one neighborhood gets one row per level` | Unit |
| 2 | `area: a walk across two neighborhoods counts in both, metres split` | Unit |
| 3 | `area: no neighborhood within 1 km hangs the walk under its town` | Unit |
| 4 | `area: no town nearby hangs the walk under its state` | Unit |
| 5 | `area: pauses, gaps and standstills add no metres` | Unit |
| 6 | `area: filtered fixes never assign an area` | Unit |
| 7 | `area: states come from containment, not the nearest state point` | Unit |
| 8 | `area: same-named neighborhoods in two towns stay apart` | Unit |
| 9 | `area: a renamed place re-keys on re-snap and the old area goes` | Unit |
| 10 | `area: a moved place keeps its key` | Unit |
| 11 | `area: old rows stay until the walk re-snaps` | Unit |
| 12 | `places: star level follows zoom` | Unit |
| 13 | `places: stars within 44 px merge with a count` | Unit |
| 14 | `e2e places: stars are one size` | e2e |
| 15 | `places: tree orders by last visit, then name` | Unit |
| 16 | `places: a two-neighborhood walk appears under both, once in its town` | Unit |
| 17 | `places: streets walked are counted once per area` | Unit |
| 18 | `e2e places: a row shows walks, streets and visit dates` | e2e |
| 19 | `e2e places: empty state on a fresh install` | e2e |
| 20 | `e2e places: an offline walk waits under Not placed yet` | e2e |
| 21 | `e2e places: the open walk is not listed` | e2e |
| 22 | `e2e places: a walk opens its replay and back keeps the view` | e2e |
| 23 | `e2e places: the replay card's area opens the places map` | e2e |
| 24 | `places: the model is built from walks, summaries and areas alone` | Unit |
| 25 | `places: bulk placement runs one pass at a time, keeps what it placed and retries the rest` | Unit |
| 25 | `e2e places: first open shows Placing your walks, then the tree` | e2e |
| 26 | `places: the country level shows only once walks span two countries` | Unit |
| 27 | `area: a town point outside the street tiles is found by the z10 read` | Unit |

### Home map (slice 2)

The app opens on the places map, and the walk log screen is removed (owner, Oct 31). The design follows AllTrails and Google Maps:

- The map fills the screen.
- A bottom sheet peeks with "N walks · M places" and a Walks button.
- Dragging or tapping it up lists walks, or a star's walks.
- One Start walk button floats bottom center above the sheet.
- No tab bar.

Previous walks are reached from the sheet's Walks button. The home opens fitted to your places, with no location prompt until a walk starts.

There is no places tree (owner, Oct 31). Places are only stars on the map, and tapping one lists its walks in the sheet. The criteria below replace 15–18.

- **H1.** The app opens on the places map, fitted to every place walked, with no permission prompt until a walk starts.
- **H2.** With no stopped walks: a world view, the line "Walk somewhere and it is starred here", and Start.
- **H3.** One Start button, bottom center above the sheet. With a walk open it reads "Return to your walk". Start errors show as they did on the log, with Open Settings when relevant.
- **H4.** A sheet peeks with "N walks · M places". Dragging it up, or tapping Walks, lists every stopped walk, newest first, with title, date, distance and new streets. Dragging down, or tapping Map, returns.
- **H5.** A walk opens its replay as a re-watch; back returns to the same map view and sheet state.
- **H6.** A star opens that place's walks in the sheet, headed by its name and parents, with its walks count and distance walked there. Streets walked per area waits; nothing maps streets to areas yet.
- **H7.** Stars by zoom as in criteria 12–14 and 26: neighborhoods and "Elsewhere in \<town>" from z11, towns from z6, states below, countries below z3 once two countries are walked. They merge within 44 px with a count. Every star is the same size.
- **H8.** Walks not yet placed are listed under "Not placed yet". The first opening places them in one pass behind "Placing your walks", and a failure waits for the next launch (criterion 25).
- **H9.** The open walk shows nowhere until it stops (criterion 21).
- **H10.** The home reads only walks, summaries, Area and WalkArea, never traces or media (criterion 24).

Planned tests:

- Unit, in `src/lib/__tests__/places.test.ts`: level by zoom; the open walk and unplaced walks in no star; "Elsewhere" where the walk was; a walk in two neighborhoods counts once in its town; merging within 44 px and one size; a place's title, parents, walks and metres; unplaced walks; sheet counts; the fit covers neighborhoods, not a far town point; bulk placement one pass at a time.
- e2e, in `scripts/e2e-web.js`: home opens empty with Start; the walk becomes a star; a star lists its place's walks with parents; the walks list opens a re-watch; done returns to the one home with the list as it was.

### Navigate (slice 4)

"Walk me back" is one use of a general navigate feature, like Apple or Google Maps navigation (owner, Oct 31). It will also serve the next release's suggested spots.

- **Routes are computed on the device:** from your own trace for walk me back, and from a street graph built from the streets the app already derives from cached tiles for any other point. Nothing leaves the device.
- **It runs inside a walk,** and the walk keeps recording. From the home map, "Go here" starts a walk with that destination.
- **Destinations:** the walk's start, a capture pin, any point on the map (long press, then "Go here"), a star on the home map.
- **Guidance:** the route drawn on the map, with distance left; an "Off your route" chip, and re-routing after 50 m off; an arrival line; an End button. No turn-by-turn, no voice.
- **Loops** in your own trace are skipped where it passed within 30 m of itself.

Acceptance criteria:

- **N1.** Walk me back: the route runs from where you stand back along this walk's own trace to its start, or to a capture's pin. It starts at the trace point nearest you.
- **N2.** Loops are skipped: where the trace passed within 30 m of itself, the route cuts across. It is never longer than the trace, and every point of it lies within 30 m of the trace.
- **N3.** To any other point, the route runs over cached streets, shortest by length. It joins the nearest street within 150 m of each end. Before routing, the app reads the streets for the area between the two ends (z14, behind "Finding a route").
- **N4.** With no street within 150 m of either end, or no connection between them: "No walking route found nearby", and nothing else changes.
- **N5.** A destination more than 10 km away in a straight line: "Too far to walk from here".
- **N6.** The route is drawn bold over the map, in blue with a white edge. The trace, pins and walker stay visible.
- **N7.** A top bar shows the distance left along the route and the destination's name ("1.2 km · Fox Point"). It updates with each accepted fix.
- **N8.** More than 50 m from the route for two accepted fixes in a row shows "Off your route" and re-routes from where you are, at most once every 15 s.
- **N9.** Within 30 m of the destination: "You're here: \<name>" for 4 s, a success haptic, and navigation ends. The walk keeps recording.
- **N10.** End stops navigation at any time. Hold to stop ends the walk, and its navigation with it.
- **N11.** Entry points:
  - "Walk me back" (an edge button), which goes to the start
  - a pin's viewer: "Go here"
  - a long press on the walk map: a small sheet with "Go here", plus "What happened here (N)" when captures are near
  - on the home map, a star's sheet "Go here", or a long press then "Walk here", which starts a walk navigating there
- **N12.** Recording, pause, captures, fog and streets work as before while navigating. Paused, the bar holds its distance.
- **N13.** The destination is kept with the open walk, so a reload resumes navigating, with the route computed again.
- **N14.** Local-only: routes are computed on the device from the trace and the cached streets. Nothing is sent anywhere.
- **N15.** Route sources sit behind one interface (RouteSource: trace, streets), so a later source (suggested spots, downloaded regions) plugs in without touching the navigator.

Planned tests:

- Unit, in `src/lib/__tests__/nav.test.ts`: the trace route backward; loops skipped, staying on walked ground; to a pin; the street route: shortest on a grid, a 150 m join, no route when disconnected; too far; distance left; off route after two fixes; re-routing at most every 15 s; arrival within 30 m.
- e2e, in `scripts/e2e-web.js`: walk me back draws a route and counts down; arriving at the start shows "You're here"; a long press, then Go here, routes over streets; End clears it; a star's Go here starts a walk navigating there.

## Open questions for the owner

1. **Hierarchy source:** tile `place` points per piece of trace, with states from a bundled Natural Earth file? Recommended: yes; boundary crossings (option C) as a follow-up, not in the first cut.
   - **Decided:** yes. Tile `place` points per piece of trace, states from a bundled Natural Earth admin-1 file; boundary crossings (option C) come later, not in the first cut (owner, Oct 31).
2. **Bundle a states file at all?** Recommended: yes, one public-domain file of a few hundred KB for the countries you walk in; state points alone mislabel walks near a state line.
   - **Decided:** yes (owner, Oct 31). Measured: the US pack is 577 KB, not a few hundred KB.
3. **Levels shown:** state, town, neighborhood only, or also country and county? Recommended: those three; country appears only once a second country is walked; no county, the tiles have no county points.
   - **Decided:** state, town, neighborhood; country appears only once a second country is walked; no county (owner, Oct 31).
4. **A walk across two neighborhoods:** counts in both, title from the one with most metres? Recommended: yes.
   - **Decided:** yes, it counts in both and its title comes from the one with the most metres (owner, Oct 31).
5. **Radii for "nearest":** neighborhood 1 km, town 3 km, city 10 km? Recommended: start there, versioned as `AREA_RULES`, and tune after ten walks.
   - **Decided:** yes: 1 km, 3 km, 10 km, versioned as `AREA_RULES`, tuned after ten walks (owner, Oct 31).
6. **Where Places lives:** a "Walks | Places" switch in the log, a tab bar, or a header button? Recommended: the switch in the log.
   - **Decided:** a "Walks | Places" switch in the log (owner, Oct 31).
   - **Superseded (owner, Oct 31):** the home is the places map with a bottom sheet; the log is gone.
7. **Backfill of v0 walks:** place them all at once behind a cover on first open of Places, or one by one as each replay opens? Recommended: all at once, online, with a "Placing your walks" line; the rest wait under "Not placed yet".
   - **Decided:** all at once, online, with a "Placing your walks" line; the rest wait under "Not placed yet" (owner, Oct 31).
8. **Completion % per neighborhood:** wait for real boundaries? Recommended: yes; ship "streets walked" per area instead.
   - **Decided:** it waits for real boundaries; streets walked per area ships instead (owner, Oct 31).
9. **Retrace scope for v0.5:** this walk's own trace backward only? Recommended: yes; cross-walk entries later.
   - **Decided:** this walk's own trace only (owner, Oct 31).
   - **Superseded (owner, Oct 31):** walk me back is one use of a general navigate feature, routed on the device over the trace or cached streets; see Navigate (slice 4).
10. **Defer nearby places, downloadable regions and the walk card past v0.5?** Recommended: yes; nothing in v0.5 shows POIs, the hosted tiles plus ambient cache cover offline for now, and the card waits for the export system.
    - **Decided:** yes, all three move past v0.5 (owner, Oct 31).

## Sources

Read:

- [OpenMapTiles place layer schema](https://github.com/openmaptiles/openmaptiles/blob/master/layers/place/place.yaml)
- [OpenMapTiles boundary layer schema](https://github.com/openmaptiles/openmaptiles/blob/master/layers/boundary/boundary.yaml) and [boundary.sql](https://github.com/openmaptiles/openmaptiles/blob/master/layers/boundary/boundary.sql)
- [Planetiler OpenMapTiles: Boundary.java](https://github.com/openmaptiles/planetiler-openmaptiles/blob/main/src/main/java/org/openmaptiles/layers/Boundary.java) and [Place.java](https://github.com/openmaptiles/planetiler-openmaptiles/blob/main/src/main/java/org/openmaptiles/layers/Place.java), the zoom levels OpenFreeMap's tiles follow

From search results only. Option D is measured (577 KB); the Who's On First, OSM and GeoNames sizes remain estimates:

- [Natural Earth Admin 1: states, provinces](https://www.naturalearthdata.com/?p=1723), public domain
- [Who's On First: get started](https://whosonfirst.org/getstarted)
- [CityStrides on Wikipedia](https://en.wikipedia.org/wiki/CityStrides)
- [TechRadar on the 2024 Google Maps Timeline](https://www.techradar.com/phones/googles-2024-timeline-update-is-like-spotify-wrapped-for-your-travels)
