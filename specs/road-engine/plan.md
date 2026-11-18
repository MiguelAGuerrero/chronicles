# The road engine: plan (RE1-RE34)

Written 2026-11-18 for the owner's review before any code. Nothing is built. It begins with a measurement, because the one thing
this plan cannot know from the code is whether the map's low-zoom tiles hold a road graph good enough to route on.

## The idea in one paragraph

The app already has the seams a second router needs: `RouteSource` and `Route` (decision 0017), an A* that takes a cost
(`WalkGraph.shortest`), a tile fetcher and decoder that take any zoom, a way to run a long computation in steps (`createOffPage`, a
worker on the web, yielding on native), and map props that draw a long line. What it has not: roads below the top zoom, direction
(one-way is never read), a graph that scales past a city, a cost by kind of road, or a turn. The engine is a new folder,
`src/lib/roads/`, that reads the `transportation` layer at a low zoom through an adapter, builds a directed graph in typed arrays,
finds one way with a fixed cost by kind of road, and reads manoeuvres off its geometry. The outing's planner and the session's bar
consume it; the foot router is not touched.

## Build order (five steps under this one spec; each ends shippable or is thrown away)

| Step | What it gives | Criteria |
|---|---|---|
| 0. Measure (done, below) | A script over real tiles (not in the app): at z10, z11 and z12, are the roads connected across tile edges, how many nodes, does a way come out between two towns, how long does it take. It picks the zoom and the tile bound, or says the tiles cannot carry this and the pack must come first | none (it decides RE5-RE7's numbers) |
| 1. The engine | `roads/`: the adapter, the graph, the way, its length; unit tests over an in-memory source and a pinned real tile set | RE4-RE7, RE9-RE13, RE29, RE32, RE34 |
| 2. On the page | The road drawn, distances by road, towns chosen by the road, Open in Maps for driving | RE1, RE2, RE8, RE14-RE18, RE30 |
| 3. Guiding | Manoeuvres, "Drive there", the bar's turn, finding the way again, the end at the town | RE3, RE19-RE24, RE26-RE28, RE31 |
| 4. Spoken, and behind the lock screen | "Say the turns"; native background work | RE25, RE33 |

Step 0 can end the plan: if the low-zoom tiles are not connected enough, steps 1 to 4 wait for a road pack, and the owner is asked.
Step 4 is the only one that cannot be finished without a phone.

## Step 0, the measurement: done (Nov 18)

`scripts/measure/roads-in-tiles.js` over tileserver-gl's `test_data.zip` (Zurich and about 40 km around it, a planetiler build of
the OpenMapTiles schema; `tiles.openfreemap.org` is blocked from cloud sessions, so the live host's tiles were not read). Roads kept:
motorway to tertiary and their links, each clipped to its own tile.

| Zoom | Tiles for the area | Tertiary roads | A road's direction (`oneway`) | Joined at 3 m | Joined at 10 m | Nodes |
|---|---|---|---|---|---|---|
| z10 | 9 | no | **absent** | 62% | 94% | about 7,000 |
| z11 | 16 | yes | **absent** | 75% | 96% | about 7,500 |
| z12 | 42 | yes | present (9 in 10 kept roads) | 84% | 98% | about 10,000 |
| z13 | 143 | yes | present | 93% | 98% | about 9,600 |
| z14 | 550 | yes | present | 99% | 99.6% | about 10,000 |

("Joined" is the share of road length in the largest connected part when piece ends within that distance are one junction.)

What it settles:

- **z12 is the zoom.** Below it no road carries its direction, so a dual carriageway cannot be told from a two-way road and a turn
  onto or off a motorway cannot be read. z12 has tertiary roads too, at a thirteenth of z14's tiles.
- **The tiles can carry it**: joined at 10 m, 98% of the road length is one part, in about ten thousand nodes for a city and its
  surroundings. Step 1 goes ahead on tiles; the pack is not needed first.
- **A z12 tile is about 7 km across**, so a way of 100 km is roughly 30 to 45 tiles and one of 300 km over a hundred. The bound
  (RE7) is drawn at 60 tiles, about 150 km of road, until a real phone says what a connection bears; longer journeys keep the
  straight line and Open in Maps, and say so.
- **Names are thin.** No road feature carries a name or number at any zoom; they are in the name layer, which at z12 holds a few
  hundred labels for this area against forty-six thousand at z14. A turn will often be "Left." with no road named (RE21).
- **Not settled:** the direction of travel was not routed (the share joined is of an undirected graph); the last 2% is unexamined
  (it may be roads cut by the area's own edge); the live host's build may differ; nothing was timed on a phone.

## Files

New, `src/lib/roads/` (each starts with `// @layer`):

| File | Layer | Holds |
|---|---|---|
| `types.ts` | core | `Road` (points, kind, oneWay, name, ref, link), `RoadSource` (`read(tiles, shouldStop)`), `RoadWay` (path, lengthM, legs) |
| `rules.ts` | core | `ROAD_RULES`: the zoom (12, from step 0), the kinds read, the cost by kind (RE11), the tile bound and the corridor (RE7), the edge tolerance (RE6), the time allowed (RE29) |
| `fromTiles.ts` | core | `roadsFromTile(features, z, x, y)`: the `transportation` features of one tile as `Road`s; reads `class`, `oneway`, `ramp`, `brunnel`, `name`, `ref` |
| `graph.ts` | core | `RoadGraph`: nodes and directed edges in typed arrays, numeric cell keys (`Buckets`), ends joined across tile edges within the tolerance, degree-two chains kept as one edge; `nearest(p, withinM)` |
| `way.ts` | core | `findWay(graph, from, via, to, rules)`: A* over the directed graph with the cost by kind, as a generator that yields every so many nodes (RE29); deterministic ties (RE10) |
| `corridor.ts` | core | `tilesAlong(points, rules)`: the tiles of a corridor about the towns' points, bounded (RE7) |
| `turns.ts` | core | `manoeuvres(way)`: turns from the geometry and the roads' names (RE21); `turnAhead(manoeuvres, here)` |
| `words.ts` | core | "by road", the turn lines, the one-time lines; the banned-word grep (RE13, RE20, RE26, RE32) |
| `tilesSource.ts` | adapter | `RoadSource` over `fetchTileBodies` and `decodeTile` at the engine's zoom; an in-memory source for tests (RE4, RE8) |
| `service.ts` | shell | `createRoads(deps)`: reads a corridor, builds the graph, runs `findWay` through `createOffPage`'s pattern; keeps a graph for the page or the session, nothing after (RE7, RE28, RE29) |
| `index.ts` | shell | the app's instance |
| `useDrive.ts` | view | the session's guiding: the turn ahead, finding the way again, the end (RE19-RE24) |

Touched:

- `src/lib/outing/areas.ts`: `areasToward` takes an optional path and measures a town's distance from it (RE14).
- `src/lib/outing/useJourney.ts`, `journeyWords.ts`, `components/outing/OutingPage.tsx`: the road as `map.link`, "by road", the
  reading line (RE1, RE2, RE16-RE18).
- `src/lib/outing/useJourneyBar.ts`, `src/app/walk.tsx`: "Drive there", the turn, End (RE19-RE24).
- `src/lib/nav/handoff.ts`, `openInMaps.ts`: a travel mode (walking as today; driving for a town a drive away) (RE19).
- `src/lib/discovery/tileDecode.ts`: `oneway` and `ref` are already in the tile; nothing to add to the decoder, only to what reads it.
- `src/lib/net/policy.ts`: no new host (RE30).
- `scripts/features.js`: a feature `roads` (its folder, its tests, the journeys `journey` and a new `drive-there`).
- `.claude/rules/roads.md` (new, paths narrowed to `src/lib/roads/**`), `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`.

## Data

- **Truth:** none new. A guided drive is the trace the session already records.
- **Cache:** none in this slice (D8). The graph is built from tiles each time a journey is planned and held in memory; if step 0
  shows that is too slow, a cache of roads by tile, tagged with the tile build and cleared by `purgeDerived`, is proposed then.
- **Stored:** nothing new; guiding is found again from the journey's plan (`outing_journey`, towns' points only).
- No SQLite migration, no IndexedDB version bump.

## Tests per criterion

`src/lib/__tests__/roads/` (a new feature folder), named by id; a pinned real tile set (Zurich) beside hand-made fixtures.

| Criteria | Test |
|---|---|
| RE4, RE9, RE34 | `source.test.ts`: the in-memory source; the core imports no shell and holds no outing word, clock or module state |
| RE5 | `fromTiles.test.ts`: kinds read and dropped; a one-way road in both senses of the tile's flag |
| RE6 | `graph.test.ts`: a road cut at a tile edge is one road; the real set's largest part holds nearly all its nodes |
| RE7 | `corridor.test.ts`: the tile bound; too long says so |
| RE10, RE11 | `way.test.ts`: one way, deterministic; a motorway taken only past the rule's share; never against a one-way |
| RE12 | `way.test.ts`: through the towns in order; a town with no road in reach keeps a straight stretch |
| RE13, RE20, RE26, RE32 | `words.test.ts`: the banned-word grep over every sentence |
| RE14 | `outing/areas.test.ts`: towns near the path, not the straight line |
| RE21, RE23 | `turns.test.ts`: a junction, a fork, a roundabout, a ramp; a bend is no turn; a turn behind is not ahead |
| RE22, RE24 | `drive.test.ts` (core step): leaving the way says nothing and asks for a new one after the wait; at the town it ends |
| RE28, RE29, RE31 | `service.test.ts` over fakes: stopped mid-way; out of time; nothing written; no session, no guiding |
| RE1-RE3, RE15-RE19, RE27 | journeys `journey` (the road on the page, by road) and `drive-there` (the bar, the turn, End, the capture stack) |
| RE8, RE30 | the journeys' network check: no tile at the engine's zoom before a destination is picked; the map's host only |
| RE25, RE33 | device only (`UNTESTED`, with items in `docs/NATIVE_UNVERIFIED.md`) |

## Cost

- **Reading:** a corridor of z12 tiles, each about 7 km across: 100 km of road is 30 to 45 tiles, each a request of `FETCH_MS` 10 s
  at most, all or nothing as the fetcher is; the bound (RE7) is 60 tiles. Once
  per destination, and once more when a session asks to be guided from somewhere the graph does not hold.
- **Building:** nodes and edges per tile from step 0 (unknown today); typed arrays, numeric keys, no per-vertex objects.
- **Finding:** A* over the corridor's graph, in a generator that yields; a worker on the web, turns on native (no worker there).
- **Per fix while guiding:** `turnAhead` is a walk along the way from the last index, constant per fix; nothing over the graph.
- **Per render:** the road line is simplified to a set number of points before it reaches the map (a GeoJSON source is serialised
  again on every render on native).
- **Harness:** a new `scripts/perf-roads.js` over the pinned set for build and find times; the walk screen's render budget while
  guiding rides `scripts/perf-walk.js`. Native is a device check.

## The screens, action by action

| Action | Goal, how often, where | Control | Adjacent apps | Where the owner looks first |
|---|---|---|---|---|
| See the road | once per plan, at rest | the map on the page; nothing to tap | Apple Maps draws the route on its map | the map |
| How far by road | once per plan | words on the field and the card | all show distance with time; here distance alone | the field, then the card |
| Be guided | once per town, stopped or a passenger | "Drive there" on the bar, beside Open in Maps | Apple Maps: Go | the bar |
| Read the turn | many times, at a glance, moving | the bar's two lines; no control | all: a banner at the top | the top of the screen |
| Stop guiding | rarely | "End" on the bar | all: End | the bar |
| Hear the turns | set once | a switch in the session's options | Apple Maps speaks by default | options |
| Use the maps app instead | sometimes | "Open in Maps" stays on the bar | n/a | the bar |

Defaults that make something quieter, the owner's to overrule: turns are not spoken unless switched on; nothing is shown or said on
leaving the way; no list of turns; the one-time line about restrictions is a sentence, not a dialog.

## Against precedent

- One way and no time, where every maps app lists routes by time. Reason: Never, "Several ways ranked by minutes".
- Silence on leaving the way, where they announce a new route. Reason: Never, "Nagging"; Always, "a route is a suggestion".
- No speed, limit, lane or traffic. Reason: restraint; and the tiles carry none of it.
- Roads through towns before the motorway. Reason: the owner's call, and the interesting way.
- Turns not spoken unless asked. **No reason the plan can give that outweighs a driver's eyes**: a question for the owner, below.

## What the engine cannot know (said to the owner, and once to the driver)

- **Turn restrictions** are not in the tiles: a way may ask for a turn the road forbids. A road pack could carry them.
- **Low zooms thin the roads**: small roads are absent, so the way ends at the nearest main road to a town, and a route may be
  longer than a maps app's. Step 0 measures how much.
- **Closures, traffic, tolls, heights, seasonal roads**: unknown.
- **The live tiles** cannot be read from a cloud session; what is built here is tested on a pinned real set and fixtures.

## Deferred, and why

The road pack and routing without a connection (0020, the owner's later call); a cache of roads (D8); avoid options; a time (D2);
transit and cycling; telling a car from a bus in the trace. Each goes to `docs/DEFERRED.md` when the slice is tracked.

## Native, never run on a device

Everything, as always; and in particular: finding a way on the JS thread with no worker; reading tiles while driving on a mobile
connection; the bar at speed; speech (which Expo module, checked from `node_modules` when step 4 starts); guiding behind the lock
screen from the background location task, which today only caches tiles; battery over an hour's drive.

## The owner's answers (Nov 18, decision 0216)

Turns are spoken from the tap on "Drive there", with a mute on the bar, and guiding does not ship on a phone before speech works;
the capture stack is unchanged while guiding; distance only; about 150 km (sixty z12 tiles). The motorway rule (half as long again)
and "guiding needs an open session" stay at the draft's defaults. Step 1 is built on this.

## The steward's findings (Nov 18), triaged

Ten drifts, no breach; the gate's verdict stands. All ten are taken into the spec.

| # | Finding | Triage |
|---|---|---|
| S1 | A turn that is no longer true stays on the bar after a missed turn, for the walking wait and a read | **Accepted**: RE22 (the turn line empties; a driving wait by distance) |
| S2 | Guidance ships as something to read at the wheel; "off unless switched on" misreads the Never line | **To the owner** (question 1), with the steward's shape written into RE25 as the alternative |
| S3 | "Not every turn restriction" understates (the tiles hold none) and arrives beside the first turn; "is here" may be untrue where the way ends short | **Accepted**: RE26, RE24 |
| S4 | The guiding bar contradicts itself and invites a mis-tap at speed | **Accepted**: RE20a |
| S5 | A roundabout with no named exit has nothing sayable under the ban on ordinals | **Accepted**: RE21 (the one ordinal) |
| S6 | "The tile reads the map already makes" is untrue: a corridor discloses a journey in advance | **Accepted**: RE30 reworded, and said in `net/policy.ts` |
| S7 | What the lock screen carries is unspecified | **Accepted**: RE33 (no notification of its own; background work ends with the guiding) |
| S8 | The long way is taken without a word that the app chose it | **Accepted**: RE11a |
| S9 | Cards change under the reader, and a distance by road on each invites comparing | **Accepted**: RE17, RE18 |
| S10 | The road drawn is not the one Maps will take | **Accepted**: RE19 |

The steward's silences are the questions above, and two more for the vision page itself: it has no line on sound or on safety, and
0215 amends its shape "Several routes to one point" without the page yet saying so. Both are the owner's edits.
