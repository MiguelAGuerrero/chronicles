# Explore atlas: plan

The owner gave the go-ahead to build from the mock with reasonable defaults
(2026-11-03), so this plan records the build rather than waiting for review.

## Files

- `src/lib/atlas/atlas.ts` (pure): `ATLAS_RULES` (ring 800 m, steps per category,
  reach of the near read, caps), `presenceSteps`, `nearList`, `familiarity`,
  `waitingKinds`, `findsIn`, `sketchOf` / `sketchPaths`, `nextDoor`, `walkTarget`,
  `distanceWords`, `tileLabel`, `rowCurrent`, `readQueue`.
- `src/lib/atlas/read.ts`: the near read (z14 place points for neighborhoods, z11
  for towns) and the ring read (z14 tiles of one ring, decoded in code; streets
  and places cached as any read; strips by `analyzeArea`).
- `src/lib/atlas/useAtlas.ts`: loads rows, decides reads, one at a time, retries.
- `src/components/atlas/{AtlasTile,MiniMap,KindStrip,AtlasCard}.tsx`.
- `src/app/(tabs)/explore.tsx`: header, level switch, small map, grid, card.
- Storage: `atlas_area` (derived): SQLite migration 15, IndexedDB v13;
  `Db.putAtlasAreas`, `Db.listAtlasAreas`; added to `DERIVED_STORES`.
- Dependency: `react-native-svg` (the mini-maps), through `expo install`.

## Data

`AtlasArea` (cache): key (level + normalized name + point to 3 decimals), level,
name, at, reachM, build, code (`ATLAS_CODE`), listed_at, read_at, failed_at, and, once its ring is read: `steps` per category, `strips` (names),
`marks` (markable places in the ring: key, category, kind, at; never names), and a
`sketch` (projected, quantized lines with their segment ids, strips, parks).

## Tests (by criterion)

`src/lib/__tests__/atlas.test.ts`: AT1 (`nearList` order, You're here), AT3
(`distanceWords`, `familiarity`), AT4 (`presenceSteps`, same counts same steps,
ring only), AT5 (`readQueue`, retry wait, `rowCurrent`), AT6 (`sketchOf` same
scale, walked flag), AT7 and AT10 (`waitingKinds`: no names, hidden kinds),
AT8 (`nextDoor`, `walkTarget`), AT11 and AT13 (`tileLabel`: no digits but the
walked count), AT12 (`rowCurrent` on build and code), AT14 (towns reach).
`scripts/e2e-web.js`: the Explore steps rewritten for the atlas (AT1, AT2, AT5,
AT8, AT9).

## Deferred

- Green by park area (the share of the ring that is park): the decoder reads no
  park polygons yet, so green counts park places for now.
- Keep for later (planning), and photos on walked tiles.
- Water on the mini-maps (no water layer is decoded).

## Native, unverified on a device

react-native-svg on iOS and Android, migration 15, the screen's layout.
