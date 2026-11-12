---
paths:
  - "src/components/map/**"
  - "src/components/{icons,CapturePinView,MarkPinView}.tsx"
  - "src/lib/{pins,scaleBar,perfCount,mapReads,useTabMap,traceEnds,useLocate}.ts"
  - "src/components/{LocateButton,CompassButton}.tsx"
  - "src/lib/compass.ts"
  - "scripts/{copy-maplibre-worker,perf-walk,perf-explore}.js"
  - "src/lib/__tests__/map/**"
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
  - **A setState with the value already held still renders** when React can't
    bail out early (an effect's cleanup, an update queued beside others): the
    Busy layer's `setReading(false)` and re-listed rows, and the complexes
    hook's empty result, each cost Explore a render per switch (fix DC12). Set
    state only when it changed; `scripts/perf-explore.js` and the `dense`
    journey count `render:explore`.
- **Explore in a dense city** (decision 0151, `scripts/perf-explore.js`,
  `docs/TESTING.md`): measure on the dense downtown before tuning.
  - **Busy names are the map's own text** (DC1-DC6): one `busy-names` symbol
    layer (`busyNameLayers`, `busyNamesGeoJSON` in `map/types.ts`), a point per
    strip at its label point turned along its street (`landing/names.ts`),
    `text-allow-overlap` and `text-ignore-placement` false, `symbol-sort-key`
    the view's order (heaviest first; no weight reaches the view, L9), one
    size and colour for all. `text-font` is `BUSY_NAME_FONT`, a font the base
    style's glyphs serve; the e2e's fake style has `glyphs` and the harness
    serves one OFL glyph file. **Trap:** `line-center` placement drew nothing
    (a strip's pieces don't meet end to end, and most strips are shorter than
    their name at z15).
  - **Where the names sit** (DC16): over everything on Explore
    (`busyNamesOver`), so maplibre places them before the base map's labels;
    elsewhere under the first base label layer (web finds it; native names it,
    `BASE_FIRST_LABEL`), so a road keeps its own name and the trace draws over.
    The selected area's name reserves its room as an invisible feature placed
    first (`busyNamesReserve`, DC14).
  - **E2E hooks** (only with `window.__perf`): `data-busy-names` (written at
    `idle`), `data-busy-given`, `data-busy-over`, `data-idle`,
    `window.__zoomTo`, `__busyNamesIn`, `__busyNamePoint` (only where the canvas
    is what a finger meets), and `perfMark` stamps `mark:moved`,
    `mark:settled`, `mark:busy-read`.
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
- **The web map's credits start closed** (owner, Nov 4). maplibre's compact
  `AttributionControl` opens itself when its credits first fill in and closes
  only on a drag, which put a banner across the bottom of a phone's map.
  `ClosedAttribution` (`WalkMap.web.tsx`) closes it once, the first time it
  turns compact; the (i) button still opens it. Always add it yourself
  (`attributionControl: false`). The e2e's fake source carries an OSM credit
  so the control is drawn (`map attribution` checks in `qol`). Native's
  MapLibre RN `attribution` prop is its own (i) button, untouched.

## The compass (CP1-CP8, decision 0082)

- Two fingers turn the map (web: touch rotate with `dragRotate`, `touchPitch` and `pitchWithRotate` off; native: `touchRotate`, `touchPitch={false}`). `onBearingChange` reports a change of half a degree; the web also writes `data-bearing`. `resetNorth()` eases the bearing to 0 (`MOTION.camera`, instant when reduced) and keeps centre and zoom (web `easeTo`, native `setStop`).
- `CompassButton` draws only while `showsCompass(bearing)` (more than 1° off north). On the live walk it is the top of the column: the `compass` slot above Walk me back while that is shown, else Walk me back's own slot (so no gap and no other button moves); on the ready screen it sits above Locate; on Explore above Locate, only while focused. A map taken down and brought back opens north-up, so Explore resets its bearing state on blur.
- `fitBounds` keeps the current bearing in maplibre; never pass a bearing to a follow or a fit.
- The e2e turns the newest web map through `window.__turn(deg)`, defined only when `window.__perf` is (a two-finger gesture can't be made headless). The `ready` scenario sets `__perf` itself.

## Swipes instead of pans (DN1-DN13, decision 0092)

- `onSwipe` turns one-finger panning off for that map only (web `dragPan: false`, `keyboard: false`; native `dragPan={false}`); every other screen passes none.
- Web: the canvas and its container get `touch-action: none` inline, or a phone's finger would scroll the page (maplibre's class leaves `pan-x pan-y` with drag-pan off). A mouse drag is followed on `window` past the map's edge, and dropped when the window blurs or the button is found up (a lost mouseup, audit 10). **Trap:** with drag-pan off, nothing in maplibre swallows the `click` a drag ends with, so a drag marks `draggedAt` as soon as it passes 8 px (even one cut off) and the click handler skips it; without that, every swipe also fired `onPress`. Shift-drag (box zoom) and a touch within 500 ms of a tap (tap-drag zoom) are never swipes (`zoomStart`, audit 2). A swipe starts from the middle of the frame's padding (`fitPadding`), never the canvas's middle (audit 5). Arrow keys on the canvas (still `tabindex=0`, labelled "Map. The arrow keys move between areas.", audit 11) are swipes; `+`/`-` zoom around that same point.
- **Trap: an ease's `padding` stays on the map.** maplibre keeps `easeTo({ padding })` as the map's padding and adds it to every later fit's own. On Explore's 200 px map the two left no room: `cameraForBounds` found no camera, and the fit silently did nothing (after a neighborhood swipe, a town swipe tinted Catasauqua but never moved, the owner's iPhone, Nov 4; discrete-navigation fix 2). `showPoint` therefore eases with an `offset`, and the web map keeps no padding: anything that needs the framed middle reads it from `fitPadding`.
- Native: `createSwiper()`, a `PanResponder` on the wrapping View that captures a one-finger move past 12 px and reports it on release (the drag; the screen reads only its direction, so the camera centre and metres a pixel it also carries are dead payload, DEFERRED), never after a long press (`swiper.held()`) or with a second finger seen (`releaseSwipe`, audit 3) (unverified on a device).

## Town borders (TB1-TB9, decision 0088)

- `WalkMap`'s `borders` prop (`BorderView` from `areas/borders.ts`): one `borders` source, three layers (`border-fill` for tinted, `border-firm` for tinted and firm, `border-lined`), from `BORDER.minZoom` (8). On web the fill goes under the first base road layer (`source-layer` transportation, else the first line, else the first label) and the lines under the first label, over the streets, since a border often runs along a road (TB10: at 7% and under the streets the owner saw nothing on a phone); on native they are the first overlay (no road id to go below; unverified on a device).
- Explore frames the tinted town's whole border (`townFrame`, TB11) through one rule, `nextFrame` (`atlas/atlas.ts`): each visit to a page (near you, a town's; opening one or going Back starts a visit) frames its areas until its town's border is known (150 m around them near you; a town's reach on its page, where its point may be all that is listed), then the whole town, and nothing undoes that within the visit (areas listed later, the borders null while the tab is blurred, Locate, a pan, coming back into a town it framed). Two separate frame-once effects raced and the areas' won, so a town's page never showed the whole town (fix explore-fit-area, Nov 4; the e2e reads the view from `data-bounds`). `useOutlineSet` retries a failed read every 30 s while mounted, and a z10 tile has 45 s (TB12).
- Data is sent again only when `borders.key` changes (the towns and their roles), never per fix or zoom; the web writes `data-borders` (`role:name|...`) for the e2e.
- Screens: Explore (`index.tsx`, yours tinted by `outlineIdHere`, the open town's by `outlineOf`), Chronicle (walked towns, `lined: false`), the walk screen (`firm` by `outlineIdAt`, no fill), the replay and a day (`useWalkBorders`). `BORDER` colours are held by `colors.test.ts` (TB8).

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
- **The reminder bell** (RB1-RB7, decision 0078): a pin with a live reminder on any of
  its captures (`pinReminded`, `lib/pins.ts`) wears an ink disc with a white bell, the
  clock's size (`pin-reminder`), top right, top left on a faint memory pin (the clock
  keeps top right). Each map reads the reminders once with `useReminded`, which re-reads
  on `onRecallsChanged` and at the next reminder's end (`nextExpiry`); every reminder
  write goes through `recallCheck` (`saveRecall`, `stopRecall`, `forgetRecalls`), so a
  write that skips it leaves a stale bell. Anything showing "reminder set" reads
  `liveRecalls`, so one past its end is none everywhere.
  - `useReminded` reads `readRecalls()` (storage), never `recallCheck`'s cache: filling that
    cache when a map mounts hid a flag written later from the next check (the e2e's
    NV8 seeded one and it never fired).
  - On web the bell is **not** in the marker key: a change re-renders the same root in
    place, so focus returns to the pin when the viewer closes and a photo keeps its
    picture. On native it is in the Marker key (unverified whether children update
    without it).

## Explore's dots (WT12-WT14, decision 0132)

- `waitingDots` is one `waiting-dots` circle layer (`WAITING_DOT_PAINT`, `waitingDotsGeoJSON` in `map/types.ts`), under the `marks` layer, on both maps: a feature's only property is its colour, so a dot carries no name, number, icon or id. Its edge is `WAITING_DOT_EDGE` (dark, 3:1 or more on the base map, a ring and a town's tint; `whole-towns audit 18` holds it). The web writes `data-waiting-dots` (positions only) for the e2e. A tap on a dot is the map's own `onPress` (no layer tap handler): the screen finds the dot within the press's reach (`dotAt`). Native's layer is unverified on a device.

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
- **The scale bar follows the units setting** (QL15, round 2): `scaleBar(mpp, maxPx,
  units)`; imperial picks feet in 1, 2, 5 × 10^n up to 2,000 ft, then miles. `meters`
  stays in metres, so the e2e's `data-m` is always metres. Both maps call `useUnits()`
  and pass it, so the bar redraws on a change.
- **A photo's pin shows its small copy** (QL26, QL27): `pinThumb(pin)` (`lib/pins.ts`,
  pure) gives the copy's ref only for a pin of one photo with a `thumb_path` other than
  `THUMB.none`, never `file_path`: a map never decodes full photos. `CapturePinView`
  resolves it with `useMediaUri` and draws a round `Image` (`pin-thumb`) inside a ring
  of the photo colour; the icon shows until it loads and comes back on error. The web
  markers' key and the native Marker keys include the ref, so a copy made after the
  pin was drawn replaces the icon (the rebuilt marker shows the icon for a moment).
  Memory pins pick up a copy made mid-walk only when their capture set changes
  (`memories.ts` sends only changed ids; deferred).
