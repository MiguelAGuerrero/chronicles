# Chronicles

A walk recorder for people who explore towns on foot with no plan. It records the
streets you walk, keeps the photos, voice memos and notes you take along the way,
and replays the walk afterward as a souvenir. This is v0, "the chronicle," from the
Explorer App Concept: start, walk, capture, stop, replay. The fog clears when you stop.

One Expo codebase targets iOS, Android and the web. On a phone it is the full app;
the web build is a fallback that runs the same loop with the limits a browser imposes.

## Run it

```bash
npm install          # also copies the maplibre-gl worker into public/
npm run web          # dev server for the browser
npm run export:web   # static build in dist/, servable by any static host
npm test             # street derivation, snapping, fix filtering and replay timing
npm run typecheck
npm run lint
npm run e2e:web      # headless walk end to end against dist/ (mocked GPS, fake streets)
```

The web build is deployed to GitHub Pages at https://miguelaguerrero.github.io/chronicles/
on every push to `main`, by `.github/workflows/pages.yml`.

Notes for agents working on this repo, including decisions and known traps, are in
[AGENTS.md](AGENTS.md).

Native needs a development build (not Expo Go): the map is a native module and
background location is unavailable in Expo Go on iOS.

```bash
npx expo run:ios     # or: eas build --profile development
```

## Mobile and web

| | Phone (iOS / Android) | Web fallback |
|---|---|---|
| Recording | Background location task, keeps running with the screen off | Live tracing while the app is open and visible; holds a screen wake lock. Hiding the page or locking the screen pauses it, and the gap is shown when you come back |
| Resume | An open walk is re-attached at launch | An open walk is re-attached on reload |
| Voice memos | Keep recording with the phone locked | Record while the page is visible |
| Photos | System camera | Camera on phones; a file picker on desktop |
| Storage | SQLite (`expo-sqlite`); media in the app's Documents folder, referenced by relative path | IndexedDB; media as Blobs in their own store, photos downscaled to 2048 px |
| Map | MapLibre React Native v11 | maplibre-gl JS |

Everything is local. There are no accounts and nothing leaves the device, as the
concept doc specifies for v0.

## How it works

- **Trace is the source of truth.** Raw fixes are appended to `TracePoint` and never
  altered. Accuracy, staleness and speed gates are applied when reading, and a bad
  first fix cannot lock out the good ones after it.
- **Streets come from the map tiles, derived on the device.** After stop, the replay
  opens at once and its first beat reads the streets: the camera steps across the
  walk's area at z14 behind a cover and reads the road, road-name and place layers.
  - Each line is clipped to its own tile and copies are stitched back together on
    tile edges, so the same street piece gets the same id whichever tiles loaded.
  - Ways are cut where they cross or meet, found geometrically because tile
    simplification drops the shared node. Crosswalks don't cut streets, sidewalks
    alongside a street merge into it, and blocks over 200 m are cut further.
  - A piece that runs off the edge of the loaded tiles is left for a later walk.
- **Versioned cache.** Segments are tagged with the tile build they came from. When
  OpenFreeMap serves a new build, the segment cache is dropped and each walk is
  re-snapped from its trace the next time its replay opens. History is recomputed,
  never patched.
- **Snapping.** A segment counts as walked when at least half of its length, away
  from the junction at each end, lies within 20 m of the trace. Gaps over 60 s are
  not interpolated across.
- **Replay.** Five beats in fixed order and fixed length: the fog clears with the
  new-streets count, the path runs, captures interrupt, the card, then name it and
  write the epilogue.
  - Beats two and three take 30 s whatever the walk's length. Gaps in the trace
    collapse to a short hop.
  - Each capture gets its own moment, at least 1.5 s; past that, groups become
    contact sheets. Voice memos play during their own moment.
  - With reduced motion the camera holds still. Screen readers hear each beat, and
    on phones they start on the card.
- **Log.** Reads walks and a per-walk summary written when the walk is snapped,
  never the traces or the media.

## Layout

```
index.js                  entry: registers the background task before the router loads
src/app/                  screens (Expo Router): log, walk, replay/[id]
src/components/map/       WalkMap.native.tsx and WalkMap.web.tsx, shared props
src/lib/db/               index.native.ts (SQLite) and index.web.ts (IndexedDB), versioned migrations
src/lib/recorder/         index.native.ts (background task) and index.web.ts (live browser geolocation)
src/lib/media/            where captured files are kept, per platform
src/lib/session.ts        start, stop and launch-time reconcile of the open walk
src/lib/streets.ts        tile features to street segments
src/lib/snapper.ts        trace to visited segments
src/lib/finish.ts         derive, snap and summarize a walk
src/lib/tiles.ts          tile build detection and cache invalidation
src/lib/replay.ts         ceremony timing
```

Files with `.native` and `.web` suffixes are picked by Metro per platform; the
plain `index.ts` next to them exists only so TypeScript has one module to check.

## Known gaps

- **Native is untested on a device.** The native code type-checks and lints against
  the installed SDK 58 packages but has not been built or run. The concept doc's first
  milestone, a pocketed walk whose trace survives the screen being off, is still open.
- **Recording uses expo-location, not the planned Swift module.** expo-location
  does not relaunch an app the system terminated; the recorder keeps the same
  contract so the module can replace it later.
- **Tiles are OpenFreeMap (OpenMapTiles schema), not your own Protomaps PMTiles
  bucket.** Only `src/lib/streets.ts` and the map components know the schema.
- **The "walked" threshold (50%) is a starting guess**, still an open decision in
  the concept doc. It is `WALKED_THRESHOLD` in `src/lib/snapper.ts`.
- **Streets are counted by name**, so a "Main Street" in another town counts as the
  same street. Keying streets by area is a design decision still to make.
- **Segment lookups scan by bounding box.** The concept doc's `grid_cell` index is
  deferred until the cache is large enough to matter.
- **Web storage is not marked persistent**, so Safari may clear it after about 7 days
  without a visit.
