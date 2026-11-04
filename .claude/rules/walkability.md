---
paths:
  - "src/lib/walk/**"
  - "src/components/{Tooltip,WalkBandIcon,WalkLayerControl}.tsx"
  - "src/lib/__tests__/walkability/**"
---
# Walkability

How a street treats someone on foot, as a band shown by an icon and a tooltip, never a number (WK1-WK23, decision 0093). The spec is `specs/walkability/spec.md`.

## What it is

- **Four bands** (`walk/bands.ts`, one fixed table): `foot` ("Easy on foot", the pedestrian), `mixed` (caution badge), `car` ("Built around cars", car badge), `unknown` (draws and counts as nothing). Changing the table bumps `WALK_CODE` (in `bands.ts`, not `tiles.ts`, which a test cannot import).
- **Nothing is a score.** No number, share, rank or comparison is shown or stored for display. `areaWords` says an area in words; `bandTip` is a clause with no digit (tests check both).
- **Unmapped is not absent.** No sidewalk tag alone never makes a street `car`; only class (motorway, trunk), a speed of 70 km/h or more with nothing beside it, or an explicit `sidewalk=no` on a primary or secondary does. Overture has no "no sidewalk" tag, so on Overture alone `car` is class and speed.
- **Bands are derived on read, never stored** (`bandsFor`, `drawFor`). Only the raw tile facts are cached (`walk_tile`, derived, in `DERIVED_STORES`, SQLite migration 19, IndexedDB v16).

## Where the facts come from

- **Overture first, Overpass second** (`chain`): `overtureSegments.ts` is the only file that knows Overture's `segment` layer (class, subclass `sidewalk` and `crosswalk`, `speed_limits`, `road_flags` as JSON strings); `overpass.ts` the only one that knows Overpass's. A tile that came from Overpass is read from Overture again after 30 min.
- `reader.ts` (a shell): the device's cache first, one request at a time, 12 tiles at most, a 10 s deadline, a failed tile waits 2 min, a source never fails a read. Overpass pauses 60 s on a 429 or 504 (`overpassSource.ts`).
- **A segment reads only its own tile** (`bandsFor`, WK10): the same band whichever neighbours were read; a tile never read is `unknown`.
- **The layer treats a tile's own road ways as the street segments** (`layer.ts`), so it works over ground nobody walked. The street cache is not needed.
- The factories (`overtureSource`, `overpassSource`) take their `fetch` and archive; the app's instances are in `walkApp.ts` (it imports the db, so a test never imports it).

## What shows

- A switch (meta `walk_layer`, off by default, one setting for every map) on the Explore page map and on the Navigate map (ready and live). `WalkLayerControl` anchors from the bottom (Navigate) or the top (Explore: its map is about 200 px tall on a phone, and a card that grew upward ran off the screen).
- **The area card's line** (WK11, `useAreaWords`, `ringWords`): on the open card only (neighborhood and town), in words; read when the card opens, never for the tiles. It counts streets whose middle is inside the atlas's 800 m ring.
- **The heads-up** (specs/walkability-headsup, WH1-WH13; `ahead.ts`, `aheadWatch.ts`, `useRouteWarning.ts`): 200 m before a `car` stretch of 100 m or more on the route, once per stretch (keyed by street and place, so a reroute does not say it twice), kept 15 s past it. Silent, never touches the route. `aheadWatch` remembers the walker's last distance along the route, so stretches that arrive after the last fix are said at once.
- Tooltips are inline (`Tooltip`), never a `Modal`; their 4 s comes from `MOTION.tip`.

## Traps

- `meta.test.ts` only sees direct `getMeta`/`setMeta` calls, so `switch.ts` calls them, not `metaStore`.
- The e2e serves the exported `dist`: re-run `npm run export:web` after a UI change or the journey tests the old build.
- A fake Overture "unreadable" is a 200 with bytes that are not a PMTiles file, not a 404 (which is a console error).
- **Native, unverified:** the line layers on MapLibre RN, migration 19, the Overture and Overpass reads.
