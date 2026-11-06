---
paths:
  - "src/lib/walk/**"
  - "scripts/fixture-walkability.mjs"
  - "src/components/{Tooltip,WalkBandIcon}.tsx"
  - "src/lib/__tests__/walkability/**"
---
# Walkability

How an area treats someone on foot, judged from how the ground is built and shown as a light blue and a slate tint on the map (a cool pair, never green or orange: the vision review), with words on the area card and a silent heads-up on a route (specs/walkability, specs/walkability-urban-form UF1-UF20, specs/walkability-headsup, decisions 0093, 0096). Never a number.

## What it is

- **The unit is a cell** (`walk/cells.ts`, core): a 250 m square on a fixed grid, judged from its 450 m neighbourhood. It is judged only if that whole neighbourhood lies inside tiles that were read (a cell near the edge of what was read is left out, never guessed), so the same cell reads the same whichever other tiles are in. `walk/form.ts` is the rule and the one table of thresholds, pinned by five real fixtures (`__tests__/walkability/walkFixtures.json`, `scripts/fixture-walkability.mjs`); change a number only with the fixtures.
- **Four readings per cell:** `foot` (a light blue tint), `car` (a darker slate tint), `neither` and `empty` (drawn as nothing). Signals: street junctions per km², arterial share of street, mapped crosswalks and sidewalks, and weighted places per km². **Evidence only raises a reading**: a missing sidewalk or crosswalk tag never lowers one, and a downtown whose main streets are arterial by class reads foot where crossings or sidewalks are mapped.
- **Service ways are not streets** (alleys, parking aisles, driveways, paths, steps): they add nothing to a length, a density or a share, and their connectors are not junctions. Counting every Overture connector made a car park look like a street grid (1,405 per km² downtown, 531 at the mall).
- **Street junctions** (`junctionsFromOvertureTile`): an Overture connector that two or more streets share, read from the connectors the segments list (they sit partway along a segment, so segment ends find almost none). From Overpass (`junctionsFromWays`): a node two or more streets share.
- **Nothing is a score.** No number, share, rank or comparison is shown or stored for display. `cellWords` says what the ground is ("Streets close together, with crossings", "Streets far apart and busy", "Streets close together and far apart, side by side", or nothing), never "mostly", a count or an outcome (the vision review); the map is handed rings with a band and nothing else.
- **Cells are derived on read, never stored.** Only the raw tile facts are cached: `walk_tile` (derived, in `DERIVED_STORES`; SQLite migrations 19 and 20, IndexedDB v16), with the ways and the street junctions.
- **The street band survives in one place:** `bandOf`/`bandsFor` (`bands.ts`, `match.ts`) judge a single road (speed, class, a footway beside it) for the heads-up's fast-road stretch and the legend's tooltips. Changing that table bumps `WALK_CODE` (in `bands.ts`).

## Where the facts come from

- **Overture first, Overpass second** (`chain`): `overtureSegments.ts` is the only file that knows Overture's `segment` layer (class, subclass `sidewalk` and `crosswalk`, `speed_limits`, `road_flags` as JSON strings); `overpass.ts` the only one that knows Overpass's. A tile that came from Overpass is read from Overture again after 30 min.
- `reader.ts` (a shell): the device's cache first, one request at a time, 12 tiles at most, a 20 s deadline per tile (Overture gets 6 s of it, `chain.ts`), a request given up on is aborted, a failed tile waits 2 min, a source never fails a read. What was read this session is kept in memory, so overlapping reads ask a tile once; with the source down any older cached tile beats none; an unknown build trusts the device; a read takes `shouldStop` so a dropped screen queues nothing more. Overpass pauses on a busy answer: a 429, 502, 503 or 504 (`OVERPASS_BUSY`), a 200 whose `remark` is a runtime error (`overpassRuntimeError`: a timed-out query answers 200 with no elements, and is never kept as an empty tile), or a throw (offline, a 502 page the browser hides behind CORS, a body that isn't JSON, or the reader's 20 s deadline: the only abort there is, and it means the instance was too slow). A 400 or 500 is null without a pause and leaves the streak alone. The pause is 60 s, doubling for each busy answer in a row up to 16 min (`overpassPause`, core), never less than a Retry-After the platform can read (native; browsers hide it cross-origin), honoured up to an hour, and its date form only with GMT; a good answer resets it. Every request sent counts toward `OVERPASS_SESSION_CAP` (60), refused ones too, starting over a day after its window's first request (`CAP_WINDOW_MS`, the owner, Nov 5); past it every Overpass-only tile reads `unknown`, with no word why. The streak assumes one request at a time, which the reader's queue guarantees. A slow Overture still falls back to Overpass (WK1b, audit 12); the cap is what keeps that from flooding the public instance (fix overpass-hardening).
- **A segment reads only its own tile** (`bandsFor`, WK10): the same band whichever neighbours were read; a tile never read is `unknown`.
- **The layer treats a tile's own road ways as the street segments** (`layer.ts`), so it works over ground nobody walked. The street cache is not needed.
- The factories (`overtureSource`, `overpassSource`) take their `fetch` and archive; the app's instances are in `walkApp.ts` (it imports the db, so a test never imports it), over `net.fetch` and `net.source` (`lib/net`, decision 0100): on a phone the request names the app. Overpass keeps its own back-off, so the module never pauses it.

## What shows

- The Walkability layer is one of the map layers (`.claude/rules/layers.md`, specs/map-layers): off by default, switched from the Layers panel on the Explore page map and the Navigate map (ready and live), one setting for every map. Its legend (a swatch beside the pedestrian icon, the pedestrian with a car badge) and its note live in the panel (`LayersControl`).
- `useWalkability(centre, on)` reads the tiles within 1.5 km (and Overture's places by the same tiles, `walkPlaces`), judges the cells, and hands the map a `WalkTint`; the last picture stays while new tiles are read (`drawNow`). The web map draws two fill layers without antialiasing, so cells of one reading side by side show no seam; `data-walk` reports `foot:N|car:M` for the e2e.
- **The area card's line** (UF13, `useAreaWords`, `cellWords`): on the open card only (neighborhood and town), from the cells inside the atlas's 800 m ring, in words, read when the card opens, never for the tiles; nothing when neither dominates or most of it is empty.
- **The heads-up follows the Walkability layer** (the owner, 2026-11-05): `useRouteWarning(route, here, enabled)` reads no route tile and says nothing while the layer is off. (specs/walkability-headsup, UF15; `ahead.ts`, `aheadWatch.ts`, `useRouteWarning.ts`): 200 m before a fast-road stretch of 100 m or more (the street band) **or** a run of 300 m or more of car cells the route enters ("Next: an area built around cars", no street name); an area run overlapping a road stretch is said once, as the road. Once per stretch (keyed by street and last segment, or by the run's last cell, so a reroute does not say it twice), kept 15 s past it. Silent, never touches the route. `aheadWatch` remembers the walker's last distance along the route and resets on a new route (`route()`); `alongRoute` takes the last distance as a hint, so a route that retraces itself is read on the leg being walked; a stretch prefers the segment it is already on over a joining side street.
- A legend row is a `Tooltip`: the whole row is a 44 px button announced once as its name and its meaning, its meaning opening beneath it in the flow (never floating, never a `Modal`); it closes on its own after `MOTION.tip`, on Escape and on a second press. A map keeps its last drawing while new tiles are read; a tile's own piece of a way is judged (the same id in two tiles is two pieces) and a way's home tile is its midpoint by length (`midOf`).

## Traps

- `meta.test.ts` only sees direct `getMeta`/`setMeta` calls, so a shell (`layers/shell.ts`) calls them, not `metaStore`.
- The e2e serves the exported `dist`: re-run `npm run export:web` after a UI change or the journey tests the old build.
- A fake Overture "unreadable" is a 200 with bytes that are not a PMTiles file, not a 404 (which is a console error).
- **Native, unverified:** the fill layers on MapLibre RN, migrations 19 and 20, the Overture and Overpass reads.
- The places lift (UF6, 150 weighted places per km²) is untuned: no real places fixture exists.
