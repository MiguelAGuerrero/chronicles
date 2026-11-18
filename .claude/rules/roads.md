---
paths:
  - "src/lib/roads/**"
  - "src/lib/__tests__/roads/**"
  - "scripts/fixture-roads.mjs"
  - "scripts/measure/roads-in-tiles.js"
---
# The road engine

The app's own router for a drive between towns (RE1-RE34, decisions 0214 and 0215; the spec is `specs/road-engine/spec.md`, its plan and the measurement of real tiles `plan.md`). A second `RouteSource`-shaped engine beside the one on foot, which it never touches. Steps 1 to 4 are built (the core, the road on the outing page, guiding, spoken turns; decision 0216); speech behind the lock screen is not.

## What it is

- **Roads come through `RoadSource`** (`types.ts`): the map's tiles are the first source, a road pack the next; `Road` (kind, link, sense, points) is the pack's contract too. No dataset is hard-coded.
- **z12 is the zoom** (`ROAD_RULES.zoom`): below it no road in the tiles says which way it runs (measured, `scripts/measure/roads-in-tiles.js`). Only motorway to tertiary and their links are read; `oneway` is 1, -1 or absent.
- **Each road is cut to its own tile** (`roadsFromTile`), and the graph joins the halves again: a road's end within `joinM` (10 m) of another road's point is that point (`RoadGraph.build`). At 3 m the real tiles fall apart (84% in one part); at 10 m they hold (98%).
- **The graph is flat arrays and directed** (`graph.ts`): every point a node, edges by a road's sense. Built once, never changed; build it from roads in any order and it is the same graph (the roads are sorted first).
- **One way, by a cost per kind of road** (`way.ts`, `ROAD_RULES.cost`): a motorway's metre costs half as much again, so it is taken only when the way without it is more than half as long again. Never a speed, a time or a second way. `findWay` is a generator that yields every `yieldEvery` junctions: whoever drives it gives the screen a turn or stops it.
- **A town with no main road within `snapM` has a null leg**: a straight stretch, and the way is not `whole`. Never invent a road to it.
- **`tilesAlong` returns tiles in no order along the way** (sorted by column and row): the order of requests must not tell the tile host which end is the start (the steward's S6).

## On the page (step 2)

- **`tilesSource.ts` is the adapter** over what fetches and what decodes (both given, so a test reads no network): all or nothing, one tile decoded per turn. A test tile's values are text, so the sense is read with `Number()`.
- **`service.ts` (`createRoads`) is the only way in**: `way(points, shouldStop)` answers `found`, `long` (more than `tilesMax` tiles: nothing is read), `failed` (the read), `none` (read, and no road joins the points), or null when stopped. One read at a time; the last corridor's graph is kept in memory and reused for a corridor inside it; `forget()` when the page closes. Nothing is stored.
- **Roads are read only for a place the person picked** (RE8): `useJourney` asks when `dest` is set, the journey in view first, then the other cards'. Never on opening the app, a tab or the page; a reach with no place draws its towns joined straight.
- **The page says one line** (`roadLine`): straight-line caveat until the road is found (with "Finding the road…" beside it), then how the way is chosen; a failure says why and keeps the caveat. `outing-straight` and `outing-road` are the test ids.
- **"By road" only for a whole way** (`way.whole`): a way with a straight stretch is drawn, and its length stays "away".
- **The map gets `thinLine(path, 400)`**, never the whole path: a map source is serialised whole on every change.
- **Open in Maps takes a travel mode** (`nav/handoff.ts` `travelMode`, `mapsUrls(..., mode)`): driving past `GET_THERE_M`, walking otherwise and wherever no mode is passed.

## Guiding (step 3)

- **Turns are read from geometry** (`turns.ts`, `manoeuvres(graph, way)`): at a point of the way with another road to take, a change of heading of 40 degrees or more is Left or Right, two roads ahead are a fork ("Keep left"), a motorway begun or ended is said as that. A bend with no other road, and straight on over a crossroads, are nothing. Two same-side turns within 60 m are one (a divided road). No names, no roundabouts: the tiles give neither.
- **`driveStep(path, turns, here, left)` is the whole decision** (`drive.ts`): the turn ahead and how far; off the way (`offM`) it gives no turn and nothing else, and `again` after `againM` driven off it. It gives the screen no flag for "off": never add one (RE22).
- **`useDrive` asks the service** for the way from the fix it holds to the town, once, and again when `again`; a failed first ask ends the guiding with one line, a failed later one waits another `againM`. Nothing is stored; the plan keeps one flag, `driving: true` (`isJourneyPlan` accepts that key and no other).
- **The bar while guiding** (`useJourneyBar`, `walk.tsx`): the turn over the town, End, and nothing else to tap (RE20a). From the tap until 50 m moved it says what the map cannot know, never beside a turn (RE26). Within reach of the town the flag is dropped and the bar is the ordinary "is here".
- **Speech goes through `roads/speech.ts` only** (`expo-speech`; `canSpeak` is false in a browser with no speech synthesis, and the tap then says turns are shown, not said). `speakStep` decides: once per turn, within `sayM`, never off the way or for the road's last stretch. What was said is tracked even when muted, so unmuting says nothing late. The mute is the plan's `muted: true`.
- **Nothing is spoken behind the lock screen**: `live.here` is read only while the app is active. RE33 needs the drive step run from the background task.
- **The screen's position lags a drive by about 20 s**: `live.here` is the last kept fix, and fast fixes are kept only once they read as a ride (R1). The e2e drives at 12 m/s for 25 s before it expects a turn; a jump of the mocked GPS is never a fix.
- The presence guard reads comments too: "bar" (a kind of place) cannot be written in `src/lib/roads/`.

## Traps

- The e2e harness serves the same small streets at every zoom, so the `outing` journey sees "Couldn't find the road"; the `journey` journey serves its own z12 tiles with one main road (a page route, not the harness) and sees it found. A fresh page there has no `window.open` recorder: the journey sets its own.
- react-native-web renders `dataSet`, not `data-*` props: the page's `data-link-points` (the count of points handed to the map) is set that way.
- This feature names no e2e journey of its own (a journey belongs to one feature): after a change here, run `E2E_ONLY=journey` by hand.
- RE14 (towns chosen by the road) is deferred: `areasToward` still measures from the straight line.

- The fixture `zurichRoads.json` is nine real z12 tiles (`scripts/fixture-roads.mjs`, from tileserver-gl's `test_data.zip`); hand-made roads never show what a tile edge does. The live host (`tiles.openfreemap.org`) cannot be read from a cloud session: what differs there is unknown.
- Distances in tests are `distanceM`'s, a few metres off round numbers: compare with a tolerance.
- A real route across nine tiles looks at fewer junctions than `yieldEvery`: a test of yielding passes its own rule.
- The tiles hold no turn restrictions, no closures, and names for the larger roads only (the name layer is thin at z12).
- Native: nothing here has run on a device; there is no worker there, so the search must be driven in turns.

## From the audit (Nov 18)

- **A turn is "ahead" until the fix is `nearM` past it**, never dropped `nearM` before it: a fix jitters at a junction, and dropping early skipped to the next turn and spoke both in alternation (audit 1). `speakStep` says turns in order only: an id at or behind the last said is never said.
- **`driveStep` takes the last fix's place along the way** and looks there first (`backM` behind to `aheadM` ahead): a way that passes near itself (a hairpin, a divided road) is otherwise jumped across (audit 2).
- **A change of heading wins over a change of kind** in `turns.ts`: a motorway that ends at a T is "Left", not "Off the motorway" (audit 4).
- **The plan's `muted` is the session's**: `stepPlan` and `passBy` carry it when they drop a town; `driving` goes with the town (audit 3).
- **Off the way the bar's line is the town alone**: a distance appearing there marked the leaving (audit 8, RE22).
- **The road being driven is drawn** through the walk screen's `alternates` (audit 12): `useDrive` returns `path`, thinned.
- **The page asks for roads only once its towns are read** (`reading` gates the asks), and "Try again" bumps `roadTry` so a failed road is asked for again (audits 8, 9).
- **`forget()` ages the service**: a graph finished after it is not kept (audit 7).
- A far card with a session open passes no `onStartFar`: Start now there would overwrite the journey the session carries (`drive-in-the-outing audit 1`).
- While a session records, Explore's row lists what is around the trace, not around the fix: the e2e's far place then is Quiet Hollow, not Cranston.

