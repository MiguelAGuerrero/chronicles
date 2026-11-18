# Plan: Explore in a dense city (DC1-DC13)

The owner reviews this before any code. Measured with `scripts/perf-explore.js` (committed `57f9208`); the numbers are in the spec's Decisions.

## 1. The names (DC1-DC6)

**Data (core, no storage change).** `LandingView.strips` and `labels` gain `weight` (the strip's or pocket's own, already stored in `analysis`); nothing new is stored, no migration, no `LANDING_CODE` bump (the view is derived at draw time).

- `src/lib/landing/names.ts` (new, core): `busyNames(view)` returns one entry per strip and per unlabelled pocket: the name, its weight, stale, and where it goes:
  - a strip: its pieces chained end to end (`chainLines`: pieces sharing an end within 2 m join; the chain holding the strip's label point `at` wins, else the longest), drawn with `symbol-placement: line-center`, so one label per strip, on the street, at the chain's middle;
  - a pocket's name: a point at its centre, horizontal.
- `src/components/map/types.ts`: `busyNamesGeoJSON(view)` (features with `name`, `sort` = −weight, `stale`), and the layer's look in one place, `BUSY_NAME_LAYOUT` / `BUSY_NAME_PAINT`: `text-field` the name, `text-font` `BUSY_NAME_FONT` (`["Noto Sans Bold"]`, a font the base style's glyphs serve), size 13, `HOTSPOT_INK` with a white 1.5 px halo (replacing the CSS text shadow), `symbol-sort-key` `sort`, `text-allow-overlap` and `text-ignore-placement` false, `text-padding` 4, `text-max-angle` 30, stale at the strips' stale opacity.
- `WalkMap.web.tsx`: a `busy-names` source and symbol layer above every app layer (so its names are placed before the base map's), `setData` only when `props.landing` changes (as `strips`); the `StripLabel` markers go. For the e2e: on the map's `idle`, `data-busy-names` lists the names drawn (`queryRenderedFeatures` on the layer), a DOM write, never a render.
- `WalkMap.native.tsx`: a `GeoJSONSource` with a `symbol` `Layer` of the same layout and paint (MapLibre RN v11 takes the style spec's keys; `text-allow-overlap`, not `text-overlap`, which native lacks); the `StripLabel` Markers go. Unverified on a device.
- `LandingMarks.tsx` (`StripLabel`) is deleted.
- **Every map with the Busy layer gets this,** not only Explore: Navigate's and the walk screen's maps draw the same `landing` prop (DC16). There the layer goes under the base map's labels and under the trace and route (placed after the base names, so a road's own name keeps its room); on Explore it goes over them. A `busyNamesOver` prop, true only on Explore.
- **The selected area's name reserves its room (DC14):** Explore passes the selected area's point and name; `busyNamesGeoJSON` adds it as a feature drawn at opacity 0 with the area label's size, first in sort order, so no busy name is placed under it.
- **No tap on a name (DC15):** the map's click handler reads no layer; a journey check taps a drawn name and sees the bare-map outcome.
- EC7's limits stay where they are (`busyNamesNear` in `atlas/carousel.ts` decides which names the map is given); collision works inside them.

## 2. The read (DC7-DC11, DC13)

- `src/lib/landing/compute.ts` (new, core): `computeRead({ bodies, tiles, zoom, overture, archive, build, centre, analyze })`: decode each tile, `deriveSegments`, `placesFromTilePois`, `refineRead`, `mergePlaces`, `activityFromTilePois` + `mergeSources`, `placesFromTiles`, `transitFromTilePois` and, when asked, `analyzeArea`. It is today's `readAround` body after the fetches, moved, so both paths run the same function (DC13).
- `src/lib/discovery/tileFetch.ts`: `fetchTileBodies` (the fetches alone, raw `ArrayBuffer`s); `fetchTiles` becomes bodies plus decode, unchanged for its other callers.
- `src/lib/landing/offPage.ts` / `offPage.web.ts` (adapter): `runCompute(input)`. On the web it posts the bodies (transferred, not copied) to a worker made with `new Worker(new URL('./compute.worker', import.meta.url))` (Expo SDK 58's web workers, which Expo marks alpha), one worker per read, terminated after. If the worker can't be made, errors, or answers nothing in 60 s, the same `computeRead` runs on the page (DC8: a page left open across a deploy asks for the old worker's file and gets a 404). Native: `computeRead` on the JS thread, with `await` between tiles and between stages (the stage split is in `compute.ts`, as an optional `yield` callback that core calls and never times; DC11).
- `src/lib/landing/compute.worker.ts`: imports only core; receives the input, posts the output.
- `src/lib/landing/read.ts` (`readAround`): fetches, then `runCompute`, then the store writes. Cancellation is checked between steps as now.
- **The store write (DC10):** `db.putSegments` on the web writes in batches of 500 pieces, one transaction each, yielding between them, and stops when the caller's `shouldStop` says so (a new optional argument; the contract case covers it on the fake, IndexedDB and SQLite). Native's queue is unchanged.
- **Starting once the map settles (DC9):** the decision is core, `busyReadDue({ on, key, tried, moving })` in `layers/state.ts`; `useBusyLayer` takes a `moving` flag, and Explore passes it from the map (true from a camera move's start, false at its settle; `onMoveState`, a new optional `WalkMap` callback fired on `movestart`/`moveend`, never per frame).
- **Web exception to native first:** the worker. `docs/ARCHITECTURE.md` lists it with its reason (no Expo module offers a background thread on the web; native runs the same code on the JS thread).

## 3. Re-renders (DC12)

Today a switch renders Explore 3 to 5 times (`perfCount('render:explore')`): the selection, then `setCam` from `zoomend` and again from `moveend` (two objects for one settle), then `setView` through `WalkMap`'s effect, then the fit settle. The fix, local: one camera report per settle (the map reports once, after `moveend`; `zoomend` stops reporting), `view` (zoom, latitude) derived from `cam` in Explore rather than a second state, and state set only when it changed. A Move map drag already reports only at its end; the journey holds it.

## 4. Tests per criterion

New e2e journey **`dense`** (`scripts/e2e/journeys/dense.js`): the dense downtown from `perf-explore.js` (moved into the harness as `denseWorld`, served only while the journey asks, like `snapWorld`), its town page with the Busy layer on. The harness's fake style gains `glyphs`, and the harness serves one glyph file, `scripts/e2e/fixtures/fonts/Noto Sans Bold/0-255.pbf` (OpenFreeMap's, Noto is OFL; the licence beside it).

| Id | Test |
|---|---|
| DC1 | e2e `dense` "DC1: busy names are drawn by the map, none as page elements" (`data-busy-names` non-empty, no strip-label marker); `landing/names.test.ts` "DC1: a name per strip and per unlabelled pocket" |
| DC2 | `map/busyNames.test.ts` "DC2: the names' layer never overlaps or ignores placement"; e2e `dense` "DC2: fewer names drawn than given in the dense downtown" |
| DC3 | `landing/names.test.ts` "DC3: one label per strip, its pieces chained", "DC3: two areas reading one street name it once" |
| DC4 | `map/busyNames.test.ts` "DC4: a heavier street sorts first", "DC4: a label is the street's name, nothing more" |
| DC5 | e2e `dense` "DC5: zooming in two levels keeps every name drawn and adds some" |
| DC6 | `carousel.test.ts` EC7 cases kept; e2e `dense` "DC6: zoomed out to 12 the map draws no busy name"; `map/busyNames.test.ts` "DC6: a stale area's names are dimmed" |
| DC7 | e2e `dense` "DC7: the read runs off the page (worker) and no long task passes 250 ms" (a long-task observer around turning the layer on; `__perf['busy:worker']`) |
| DC8 | `landing/offPage.test.ts` "DC8: a worker that fails to start, errors or stays silent falls back to the page, same result" (a fake worker factory) |
| DC9 | `layers/state.test.ts` "DC9: no read while the map moves; the read waits for the settle"; e2e `dense` "DC9: a switch's read starts after the camera settles" (`__perf` stamps) |
| DC10 | `db/dbContract.ts` "DC10: putSegments writes in batches and stops when told" (fake, IndexedDB, SQLite) |
| DC11 | `landing/compute.test.ts` "DC11: the compute yields between tiles and stages"; `docs/NATIVE_UNVERIFIED.md` item; `UNTESTED` device line |
| DC12 | e2e `dense` "DC12: a switch renders Explore at most twice", "DC12: a Move map drag renders it once" |
| DC14 | `map/busyNames.test.ts` "DC14: the selected area's name is in the names' source, invisible, placed first"; e2e `dense` "DC14: no busy name under the selected area's name" |
| DC15 | e2e `dense` "DC15: a tap on a busy name opens nothing" |
| DC16 | e2e `walk` (or `ready`) "DC16: on the walk screen busy names sit under the base names and the trace", with `E2E_SHOTS` for the UI review |
| DC13 | `landing/compute.test.ts` "DC13: the compute gives readAround's result" (fixture tiles, the old path's output recorded first) |

Unit tests go in the existing feature folders (`landing`, `map`, `layers`, `db`); `scripts/features.js` gets the `dense` journey on `layers`, `map` and `explore`, and the spec on `layers`.

## 5. Screens and controls

No control is added or changed. What changes on screen: the busy names' look (map text with a white halo instead of a CSS shadow, along the street instead of level) and which names show in a crowd. No matrix row applies (no action); the UI review (decision 0145) runs on the `dense` journey's screenshots.

## 6. Deferred

- The "?" pins and area points as map layers (the owner, Nov 12: next round, if a drag still stutters on the phone).
- Raster tiles for the busy lines (not now; vector until measured otherwise).
- Moving the IndexedDB write into the worker (the batches come first; the worker writing would bypass `db`).
- Native's read in a background thread (no Expo module for one; it yields instead).

## 7. Native that will not run on a device

The `busy-names` symbol layer on MapLibre RN (font from the style's glyphs, line-center placement, sort key); `runCompute`'s yields on Hermes. Each gets a `docs/NATIVE_UNVERIFIED.md` item.

## 8. Risks

- **Fonts:** `text-font` must be a font the base style's `glyphs` serve; if OpenFreeMap renames it, the names stop drawing with a console error. `BUSY_NAME_FONT` sits beside `MAP_STYLE_URL` with that note; `map/busyNames.test.ts` reads it from a fixture copy of the Positron style.
- **The worker on deploy:** its file carries a hash like the route chunks did (react-native-web rule, fix stale-chunk). The fallback (DC8) is what keeps an old page working.
- **Expo's worker support is alpha:** if the export can't build it, the slice keeps DC9-DC12 and ships DC7 as the page-side compute with yields, and asks the owner.
