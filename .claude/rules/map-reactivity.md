---
paths:
  - "src/components/map/WalkMap*.tsx"
  - "src/components/map/types.ts"
  - "src/lib/perfCount.ts"
  - "src/lib/{useGlidingWalker,useLiveTrace,liveDot,markNames}.ts"
  - "src/components/ceremony/useCeremonyLoop.ts"
  - "src/components/map/sent.ts"
  - "src/app/replay/*.tsx"
  - "scripts/{perf-walk,perf-explore,perf-replay}.js"
  - "src/lib/__tests__/map/{storefrontNames,storefrontNamesAudit,storefrontNamesUi,perfCount}.test.ts"
---
# Map: the reactivity budget, web memory and Explore's storefront names

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
    RN serializes a source's data on every render (`JSON.stringify` in its
    `GeoJSONSource`, checked in v11.5; its own `memo` never holds with inline
    `<Layer>` children). **The budget is the web's.** Native (native map frames,
    NF1-NF7): every source is a memo component handed its data and primitives,
    never an inline object; the glide runs into a frame store (`useGlideFrames`)
    read only by `ConeSource`, `PointsSource` and `GlideFollow`, three leaves
    because layer order is mount order; pins are memo lists that read presses
    from a handlers ref. `mapFrames.test.ts` reads the source for this shape.
    The React Compiler is on (decision 0207), but `WalkMap` itself is one of the
    functions it skips (its `eslint-disable` lines): the explicit memo stays.
  - Line sources use `LINE_SOURCE` (`tolerance: 1, buffer: 64`) on both maps, the ids in `LINE_SOURCE_IDS`
    (`map/types.ts`, NF5).
  - Profiling shows the app's own JavaScript under 2% of a desktop core; the
    rest is the map drawing. Fewer updates is what helps.
  - **A setState with the value already held still renders** when React can't
    bail out early (an effect's cleanup, an update queued beside others): the
    Storefronts layer's `setReading(false)` and re-listed rows, and the complexes
    hook's empty result, each cost Explore a render per switch (fix DC12). Set
    state only when it changed; `scripts/perf-explore.js` and the `dense`
    journey count `render:explore`.
  - **No source is sent what it already holds** (replay ceremony RC4): every `setData` on the web map goes through
    one gate (`sendData`, asking `nextSend` in `map/sent.ts`): not the same object, not another object of the same
    content (read in full: a line's middle counts), not empty when it is empty. A send is a worker round trip and a
    reload of that source's tiles; the replay sent four empty collections thirty times a second. `perfCount`
    `setData:<id>` counts sends that happened. A new source's data goes through `setData(id, data)` like the rest;
    `engine.test.ts` fails a second `.setData(` in the file.
  - **A replay's frames reach the map through its handle, never as props** (`replayFrame`, RC1-RC3): the walker is
    the live walk's DOM puck, the camera a `jumpTo` every frame, the line revealed by a paint property, and one
    `map.redraw()` draws them in the frame they were set (a marker moves at once, the canvas a frame later otherwise).
    The screen passes `replay` and no `walker` or `follow` meanwhile; a `trace` it goes on giving (the walk's
    replay: its first beat's, faint) is drawn only as far as the frames say (`traceShown`, replay-ceremony ui 7), by
    a paint property and never a send. Native takes the same frames into a
    store its own dot and lines read (unverified on a device).
  - **Nothing reads layout per camera move.** The canvas's size is measured on `load` and `resize` (`canvasSize`):
    the pins' move listener (`pinViewOf`) and the view's `track` work from it. A read of `clientWidth` between two
    frames' style writes lays the page out twice a frame once the camera moves every frame.
  - While a replay drives the camera, the view (`setView`: the scale bar, the pins' grouping) reaches React at most
    twice a second (`REPLAY_VIEW_MS`); the zoom changes nearly every frame there.
- **Explore in a dense city** (decision 0160, `scripts/perf-explore.js`,
  `docs/TESTING.md`): measure on the dense downtown before tuning.
  - **Storefront names are the map's own text** (DC1-DC6): one `storefront-names` symbol
    layer (`storefrontNameLayers`, `storefrontNamesGeoJSON` in `map/types.ts`), a point per
    strip at its label point turned along its street (`landing/names.ts`),
    `text-allow-overlap` and `text-ignore-placement` false, `symbol-sort-key`
    the view's order (heaviest first; no weight reaches the view, L9), one
    size and colour for all. `text-font` is `STOREFRONT_NAME_FONT`, a font the base
    style's glyphs serve; the e2e's fake style has `glyphs` and the harness
    serves one OFL glyph file. **Trap:** `line-center` placement drew nothing
    (a strip's pieces don't meet end to end, and most strips are shorter than
    their name at z15).
  - **Where the names sit** (DC16): over everything on Explore
    (`storefrontNamesOver`), so maplibre places them before the base map's labels;
    elsewhere under the first base label layer (web finds it; native names it,
    `BASE_FIRST_LABEL`), so a road keeps its own name and the trace draws over.
    The selected area's name and every "?" pin reserve their room in a second,
    invisible layer over the names (`storefront-names-room`: `text-allow-overlap`
    true, so two pins side by side both keep theirs; DC14, DC17). A name its
    point can't hold slides along its street (`text-variable-anchor` center,
    left, right with a 2.6 em radial offset) only when it runs near level:
    maplibre shifts a variable anchor in screen x, never along `text-rotate`,
    so a turned name has its own layer, centred or left out
    (`storefront-names-turned`, audit 1). Explore's controls (`storefrontNamesClearOf`) and
    the canvas's edges are room too, sent again at each `moveend` and resize
    (web, audit 11). With the layer off nothing is sent, rooms included
    (audit 8). The walk maps name only within 800 m of you
    (`storefrontNamesNear`, DC18), and every map from zoom 13 (`minzoom`). **Trap:** `text-padding` takes
    no data expression: maplibre refuses the layer with a console error (the
    `dense` journey's "no console errors" caught it). The style spec package
    is not a declared dependency, so no unit test can validate a layer.
  - **A switch redraws nothing it already showed** (smooth-switches SS1-SS10, decision 0166; the `switches` journey on
    the harness's `smallWorld`, at 4x CPU, each switch paired with the same move by the camera alone):
    - The `strips` and `pockets` sources are sent only when `landing.graded` or `landing.pockets` change, never because
      the names near the selected area did (web effect deps; native memo keys): each `setData` drops the source's tiles.
    - Explore bumps `storefrontNamesSwitch` as a selection's move starts: the web map clears the names once and sends them once
      at that move's `moveend`, a frame on (a move cut short by the next ends before that one starts). Nothing else
      clears them (SS10). Native keeps the old timing (DEFERRED).
    - Area markers (web) are kept by id and re-rendered in place; `marker:area` counts only new ones.
    - **Traps the journey found:** a hook that sets state when nothing changed renders Explore mid-move (the atlas
      loop's `townsKnown`, the complexes retry); and the row of cards changed height with the selection, resizing the map mid-move (fix carousel-height: every
      card reserves its lines and footer). A move started from a script (`easeTo` in `page.evaluate`) got almost no frames in headless Chromium:
      the journey's control is started by a key (`window.__easeNext`, then F9), as a switch is.
  - **E2E hooks** (only with `window.__perf`): `data-storefront-names` (written at
    `idle`), `data-storefronts-given`, `data-storefronts-over`, `data-idle`,
    `window.__zoomTo`, `__storefrontNamesIn`, `__storefrontNamePoint` (only where the canvas
    is what a finger meets), and `perfMark` stamps `mark:moved`,
    `mark:settled`, `mark:storefronts-read`.
- **Web memory on iPhone:** the maps use `pixelRatio` ≤ 2,
  `maxTileCacheZoomLevels: 2` and `fadeDuration: 0`. The photo resize shrinks
  its canvas to 0 after use (iOS caps canvas memory per tab). Cached street
  pieces are read by z14 tile (IndexedDB v7 `tile` index, backfilled), never
  with `getAll()` over the store. The walk's fog read is never discarded by the
  next fix, and visited ids are read once per walk screen.
