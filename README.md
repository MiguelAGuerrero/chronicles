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
npm test             # snapper, street derivation and replay timing
npm run typecheck
```

Native needs a development build (not Expo Go): the map is a native module and
background location is unavailable in Expo Go on iOS.

```bash
npx expo run:ios     # or: eas build --profile development
```

## Mobile and web

| | Phone (iOS / Android) | Web fallback |
|---|---|---|
| Recording | Background location task, keeps running with the screen off | Live tracing while the app is open and visible; holds a screen wake lock. Hiding the tab or locking the screen pauses it, leaving a gap in the trace |
| Resume | Open walk is resumed at launch | Open walk is resumed on reload |
| Storage | SQLite (`expo-sqlite`), media in the app's Documents folder | IndexedDB, media stored as data URLs |
| Map | MapLibre React Native v11 | maplibre-gl JS |

Everything is local. There are no accounts and nothing leaves the device, as the
concept doc specifies for v0.

## How it works

- **Trace is the source of truth.** Raw fixes are appended to `TracePoint` and
  never altered; accuracy and speed gates are applied when reading.
- **Streets come from the map tiles.** On stop, the map camera steps across the
  walk's area at z14 and reads the road, road-name and place layers. Ways are split
  where they cross or meet (found geometrically, because tile simplification drops
  the shared node on straight streets), sidewalks running alongside a named street
  are merged into it, and blocks longer than 200 m are cut further.
- **Snapping.** A segment counts as walked when at least half of its length lies
  within 20 m of the trace. Gaps over 60 s are not interpolated across.
- **Replay.** Five beats in fixed order and fixed length: the fog clears with the
  new-streets count, the path runs, captures interrupt (nearby captures share one
  pause, voice memos play), the card, then name it and write the epilogue.
  Beats two and three always take 30 s, whatever the walk's length.

## Layout

```
src/app/                  screens (Expo Router): log, walk, replay/[id]
src/components/map/       WalkMap.native.tsx and WalkMap.web.tsx, shared props
src/lib/db/               index.native.ts (SQLite) and index.web.ts (IndexedDB)
src/lib/recorder/         index.native.ts (background task) and index.web.ts (live browser geolocation)
src/lib/media/            where captured files are kept, per platform
src/lib/streets.ts        tile features to street segments
src/lib/snapper.ts        trace to visited segments
src/lib/replay.ts         ceremony timing
```

Files with `.native` and `.web` suffixes are picked by Metro per platform; the
plain `index.ts` next to them exists only so TypeScript has one module to check.

## Known gaps

- **Native is untested on a device.** The native code type-checks against the
  installed SDK 58 packages but has not been built or run. The concept doc's first
  milestone, a pocketed walk whose trace survives the screen being off, is still open.
- **Recording uses expo-location, not the planned Swift module.** expo-location
  does not relaunch an app the system terminated; the recorder keeps the same
  contract so the module can replace it later.
- **Tiles are OpenFreeMap (OpenMapTiles schema), not your own Protomaps PMTiles
  bucket.** Only `src/lib/streets.ts` and the map components know the schema.
- **The "walked" threshold (50%) is a starting guess**, still an open decision in
  the concept doc. It is `WALKED_THRESHOLD` in `src/lib/snapper.ts`.
- Photos use the system camera through `expo-image-picker`; on desktop browsers that
  opens a file picker.
