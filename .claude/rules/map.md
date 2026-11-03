---
paths:
  - "src/components/map/**"
  - "src/components/{icons,CapturePinView,MarkPinView}.tsx"
  - "src/lib/{pins,scaleBar,perfCount,mapReads,useTabMap,traceEnds,useLocate}.ts"
  - "src/components/LocateButton.tsx"
  - "scripts/{copy-maplibre-worker,perf-walk}.js"
  - "src/lib/__tests__/{scaleBar,traceEnds}.test.ts"
---
# Map

The map component (maplibre-gl on web, MapLibre RN on native), pins and icons, the reactivity budget and web memory. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## Reactivity budget and memory

- **Reactivity budget** (Nov 1, after profiling and `docs/research-reactivity.md`):
  - Steady walking renders the walk screen about 1.4 times a second (it was
    4) and the map component 0.8 (it was 4.5). The e2e fails above 2.5 in
    its busy window. `perfCount` (`lib/perfCount.ts`) counts renders, map
    `setData` and camera moves when the page defines `window.__perf`.
  - The clock and the memo timer tick in their own components (`Ticking`,
    `WalkStats`); the screen's `now` ticks every 5 s.
  - The recorder status is set only when it changes. A browser's watch error
    between good fixes isn't "waiting" until 10 s without a fix.
  - The map updates `view` only when zoom moves 0.05 or latitude moves 0.01°.
    It skips follow moves under 2 px.
  - The trace is a history source re-sent once per 100 fixes, plus a live
    tail (`splitTrace`). On native, `TraceSource` is memoized, because MapLibre
    RN serializes a source's data on every render.
  - Line sources use `tolerance: 1, buffer: 64`.
  - Profiling shows the app's own JavaScript under 2% of a desktop core; the
    rest is the map drawing. Fewer updates is what helps.
- **Web memory on iPhone:** the maps use `pixelRatio` ≤ 2,
  `maxTileCacheZoomLevels: 2` and `fadeDuration: 0`. The photo resize shrinks
  its canvas to 0 after use (iOS caps canvas memory per tab). Cached street
  pieces are read by z14 tile (IndexedDB v7 `tile` index, backfilled), never
  with `getAll()` over the store. The walk's fog read is never discarded by the
  next fix, and visited ids are read once per walk screen.

## maplibre-gl on web, MapLibre RN v11 on native

- maplibre-gl 6 loads its worker as a separate module, which Metro doesn't bundle.
  `scripts/copy-maplibre-worker.js` (postinstall) copies it into `public/`, and
  `setWorkerUrl('/maplibre-gl-worker.mjs')` points at it. Static hosts must serve
  `.mjs` as `text/javascript`. The worker URL is prefixed with `process.env.EXPO_BASE_URL`,
  so sub-path deploys work.
- On native, `queryRenderedFeatures` misses culled labels and unstyled layers. Query a
  `VectorSource` (with invisible layers so its tiles load) via `querySourceFeatures`,
  the same as `querySourceFeatures` on web.
- Calling `querySourceFeatures` on a source that doesn't exist logs an error instead
  of throwing. Check `map.getSource()` first.
- `fitBounds` is driven by a `fitKey` counter, not by the bounds array identity. On
  native, wait for `onDidFinishLoadingMap` before moving the camera.

## Icons and pins

- Icons come from `@expo/vector-icons` (Ionicons), via `src/components/icons.tsx`.
  Every icon-only button needs an `accessibilityLabel`.
- On web, pins are maplibre-gl DOM `Marker`s whose content is rendered with
  `react-dom/client` `createRoot`, using the same `CapturePinView` as native.
  Unmount the roots in a `queueMicrotask`, because unmounting inside React's commit
  warns. Clicks look the pin up by id in a ref, so they never open stale captures.
- On native, pins are MapLibre RN `<Marker>` children. Use the Marker's own `onPress`:
  on iOS the annotation's tap recognizer swallows touches meant for a Pressable inside
  it.

## Map staples (quality of life, QL1-QL12; Nov 3)

- **Start and end markers** (`lib/traceEnds.ts`, pure): every map that draws a
  trace marks the first point of the first run (a white disc, a ring in the
  trace's green) and, once the walk has ended (`ended` prop: the replay and the
  day replay), the last point of the last run (a ring in `COLORS.walked`). A live
  walk has no end marker; the dot is its end. One `ends` circle layer above the
  trace and under the walker and pins, with the trace's opacity (hidden while
  navigating). Its data is re-sent only when the ends string changes, never per
  publish. Chronicle draws no trace, so no markers. A walk begun on a ride is
  marked where the walking began (accepted).
- **Scale bar** (`lib/scaleBar.ts`, pure; `components/map/ScaleBar.tsx`): the
  longest 1, 2 or 5 × 10^n metres within 100 px at the map's own `view` (zoom and
  latitude), in the bottom-left corner, as a sibling of the map inside the
  wrap View (never inside maplibre's own DOM). Decorative: pointer events off,
  hidden from screen readers (`aria-hidden`, so an e2e locator that skips hidden
  ancestors must allow the bar itself when reaching its line). Each screen keeps
  it clear of its bottom UI with `scaleInset`: the walk screen above the capture
  row (the map's bottom edge is the strip's top, so `insets.bottom` doesn't
  apply inside it), the tabs above the sheet at its current height, the replay
  above the card. Native's `view` updates every 0.25 zoom (the existing
  threshold), so the bar is coarser there.
- **Locate** (`lib/useLocate.ts`, `components/LocateButton.tsx`): a 44 pt edge
  button on Navigate (gone with a walk open) and Explore (gone under the long
  press's card), at the walk screen's Recenter look. A tap reads one **fresh**
  fix (`locateOnce(..., { fresh: true })`: `maximumAge` 0 on web, no fix
  stamped before the ask on native). Without `fresh`, a tap within 15 s of
  Navigate's focus fix got the browser's cached position (`LOCATE_MAX_AGE_MS`),
  and the e2e's 1 km move went unseen. The fix is kept as the last fix, the dot
  moves there, and the map fits 250 m around it; nothing tracks after. A second
  tap while busy does nothing. Denied says what the recorder's start says, with
  Open Settings on a phone; a timeout says "Couldn't find your position".
- **E2E:** `E2E_ONLY=qol` runs the slice's scenario alone (~30 s). The web map
  writes `data-ends`, `data-center` and `data-walker` on its container for it.
  The fit centres the fix in the view above the drawer, so the canvas's own
  middle (`data-center`) sits off the fix by the padding: the check is "inside
  the 250 m framed", never "at the middle".
- **Native** (unverified on a device): the `ends` layer's `match` stroke colour
  on MapLibre RN, the scale bar over the native map, `locateOnce` fresh on
  expo-location, the edge button over the native sheet.
