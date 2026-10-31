# Keeping the live walk screen light: research findings

Scope: maplibre-gl 6.16 (web), MapLibre RN 11.5 (native), React 19.3 with the React Compiler. I checked claims against the installed `node_modules` where I could. Several primary hosts are blocked from this cloud session: bugs.webkit.org, maplibre.org and react.dev. For those, I used search snippets or the same docs mirrored on GitHub. Items marked **[uncertain]** are unverified or depend on the version.

## Summary ranking (expected impact for Chronicles)

1. **Stop re-rendering the walk screen for each fix or tick, and break the camera → state loop.** In `src/components/map/WalkMap.web.tsx`, every follow `jumpTo` (line 476) fires `moveend`. That calls `setView` with a new object (lines 192, 203), which re-renders `WalkMap` and calls `setData('cone', …)` again (line 229). The cost is one extra React pass plus a worker re-tile per fix, on top of the publish. Move fixes into an external store and have the map subscribe to it imperatively. Put the clock in a leaf component.
2. **Split the trace into a frozen "history" source and a small "live tail" source.** Today each publish re-tiles the whole trace. On native it also `JSON.stringify`s the whole trace on the JS thread.
3. **Take the home map down during a walk on web.** Two WebGL contexts and two tile caches is the single biggest memory risk on iPhone Safari.
4. **Make distance and the copied trace runs incremental:** O(new fixes) instead of O(all fixes).
5. **Follow camera:** skip moves under ~1 px and don't feed the result back into React. On native, consider `trackUserLocation`.
6. **Tune GeoJSON source options** (`tolerance`, `buffer`, `maxzoom`) for the trace, fog and route.
7. **Pins as layers rather than DOM markers** once there are more than a few dozen. This is lower priority at today's counts.
8. **Defer UI work while hidden or backgrounded, plus GPS gating.** Mostly done already; the remaining gaps are listed below.

## 1. Map engines

**setData re-tiles everything.** maplibre-gl's `setData` posts the whole dataset to the worker's `loadData` (`src/source/geojson_source.ts:299,517` in the installed package). There, geojson-vt rebuilds its index. MapLibre Native's update guide says the same: parsing and tiling is the expensive step, and "both updates replace the whole dataset" ([MapLibre Native, update data](https://maplibre.org/maplibre-native-ffi/guides/update-data/)). The Mapbox maintainers took the same position years ago: every update is a full rebuild, and diffing was not planned ([mapbox-gl-js#1391](https://github.com/mapbox/mapbox-gl-js/issues/1391), 2015, old). Cost therefore grows with walk length, which matches the "long walk struggles" report.

**updateData (diffs).** Since maplibre-gl 5.11, `updateData` reloads only the tiles a diff touches. The PR reports **about 50% faster** on its benchmark, which updates one point in a 100k-point set ([maplibre-gl-js#6562](https://github.com/maplibre/maplibre-gl-js/pull/6562)). Follow-ups landed in 5.13 and 5.14 (#6668, #6681, #6738, per [changelog mirror](https://lists.openstreetmap.org/pipermail/rails-dev/2025-November/044851.html)). Every feature needs a unique id (`maplibre-gl.d.ts:7197`). The catch is that appending a coordinate to one LineString is an `update` of that feature, so the whole feature is re-tiled anyway. *Mapping:* only useful if the trace is stored as **chunk features**. Each chunk is one feature with an id, for example 100 fixes or one run between pauses. Each publish then sends `add` or `update` for the newest chunk only. **[uncertain]** I found no benchmark for a growing line.

**History plus live tail (recommended).** MapLibre's large-data guide suggests chunking sources "by update frequency (live versus static)" ([guide source on GitHub](https://raw.githubusercontent.com/maplibre/maplibre-gl-js/main/docs/guides/large-data.md)). *Mapping:* use a `trace-history` source that changes only when a chunk seals (every ~100 fixes, at pause or resume, and at gaps), plus a `trace-tail` source holding the open chunk. Draw both with the same two layers so they look like one line. This works on both platforms. On native it matters more, because `GeoJSONSource` sends `data={JSON.stringify(data)}` on every render (`@maplibre/maplibre-react-native/src/components/sources/geojson-source/GeoJSONSource.tsx:363`). A stable history object means React skips that prop, and native skips the re-parse.

**Simplify by zoom.** Style-spec defaults are `tolerance` 0.375 (Douglas-Peucker, in tile pixels), `buffer` 128 and `maxzoom` 18 (installed `@maplibre/maplibre-gl-style-spec/dist/latest.json`). The large-data guide recommends a lower `maxzoom` because there aren't enough pixels to need more detail. *Mapping:* for the trace, fog and route, try `tolerance: 1`, `buffer: 32–64`, and `maxzoom: 16` (it overzooms beyond that). All three are props on RN v11 `GeoJSONSource` too (lines 234–251). Expect fewer tiles and vertices per re-tile. Check tile-edge seams with a 12 px edge line, and keep `buffer` above the line's half-width. **[uncertain]** No measured numbers.

**DOM markers vs. layers.** Each maplibre `Marker` listens to `move` and `moveend` and recomputes its screen position and CSS `transform` on every camera frame (`src/ui/marker.ts:402–404, 746+`). That is layout work proportional to the number of pins, on every pan, ease and follow move. Community guidance puts the comfort limit at roughly 100–500 markers, and suggests a GeoJSON source with symbol or circle layers beyond that ([react-map-gl discussion #1435](https://github.com/visgl/react-map-gl/discussions/1435), [Geoapify](https://apidocs.geoapify.com/how-to/maps/add-map-markers/)). These are rules of thumb, not benchmarks. *Mapping:* `useZoomPins` already merges pins, so counts stay low. Keep DOM pins for now, and make sure the `createRoot` trees re-render only when pin content changes, not per fix. If counts grow, a symbol layer with `icon-allow-overlap`, plus feature-state for selection, would remove that per-frame cost.

**Location puck.** On web, the walker dot and cone are GeoJSON sources updated by `setData`. They are tiny, so cost is small. The cone is the waste, because it also re-runs on every view change (item 1). An HTML `Marker` for the dot would move with the camera at no tiling cost. A rAF-animated `setData` (as in the [Animate a line example](https://docs.mapbox.com/mapbox-gl-js/example/animate-a-line/)) is smooth but costs a re-tile per frame: avoid it. On native, RN v11 offers `UserLocation` with a native `minDisplacement` and `animated`, and the changelog deprecates `renderMode` in favour of the native puck ([v11 migration](https://maplibre.org/maplibre-react-native/docs/setup/migrations/v11)). The native puck draws without JS, but it follows the OS location, not Chronicles' filtered fix. **[uncertain]** I can't say whether it differs visibly from the snapped trace.

**Camera follow.** Neither `jumpTo` nor `easeTo` is expensive in itself. Each one renders a frame, and `easeTo` renders about 60 per second for its duration. The waste is in what follows the move: `moveend` listeners, every Marker's `_update`, and the React `setView`. *Mapping (web):* compare `map.project(next)` with the canvas center, and skip moves under 1–2 px. Change `setView` to fire only when zoom changes by more than ~0.01, or when the latitude bucket that the cone and press radius need actually changes. A short linear `easeTo` (duration ≈ the fix interval, `easing: t => t`) looks smoother but renders continuously. Use it only if battery allows, and never on a hidden page. *Native:* `Camera trackUserLocation="default"` follows natively, with no JS or bridge traffic per fix (`Camera.d.ts:190–203`). It would replace `jumpTo` via the ref, but it follows the raw OS location. **[uncertain]** I found no published cost figure for it.

**Memory.** You already cap `pixelRatio` at 2 and set `maxTileCacheZoomLevels: 2` and `fadeDuration: 0` (`WalkMap.web.tsx:128–130`). Further steps:
- **Set `maxTileCacheSize`** to a fixed number, for example 30–50 per source. Otherwise the cache grows with the viewport (`maplibre-gl.d.ts:13749`).
- **Keep the default `maxCanvasSize`** of [4096, 4096] (added in 3.2).
- **Second map:** maplibre has no "pause". A hidden map still holds its GL context, its tiles, and its listeners for `resize` and style events. Call `map.remove()` on the home map while a walk is open, and rebuild it on return. Rebuilding costs one style load, and the HTTP cache helps. This contradicts the "home map stays mounted" note, so it needs the owner's call.

## 2. React patterns

- **External store for fixes.** Keep fixes, the walker position and the trace chunks in a module-level store (`useSyncExternalStore`, or zustand with selectors). The map component subscribes **outside React** and calls `setData` and `jumpTo` directly. React state changes only for things the UI shows as text: distance rounded to 10 m, the GPS chip state, and pause. This removes the per-publish screen render entirely. **[source blocked: react.dev]** `useSyncExternalStore` re-renders only the components that subscribe, and only when the selected snapshot changes by `Object.is`.
- **Clock isolation.** Use a `<Elapsed startedAt pauses/>` leaf with its own 1 s interval, so the tick re-renders a single `Text`.
- **React Compiler.** The compiler caches JSX and derived values inside each component, keyed on its inputs. In effect it wraps children in `React.memo` and keeps callbacks stable. It cannot help when the inputs really change: new trace arrays every publish, or a new `view` object every `moveend`, defeat all of it. It also never stops the component that owns the state from re-rendering. So the fix is structural: the state must live lower down or outside React. More memoization is not the answer. **[uncertain: from memory, react.dev blocked]**
- **Batching.** React 19 batches automatically. Still, do one store update per fix, and publish the map at most once per animation frame (`requestAnimationFrame` coalescing) rather than once per effect.
- **Incremental derived data.** Hold distance as a running sum per run. Recompute only the last unsealed part: the last 30 s dwell bins, and the re-anchor window of `filterFixes`. Only append to the trace runs; never copy them. Seal finished chunks as frozen arrays, so identity checks work.

## 3. Running and mapping apps

None of the named apps publishes a usable engineering write-up on live-track rendering. Searches found only press and support pages.
- **Strava:** Strava's support page says the **screen is the main battery drain** on long recordings, and phones record more than 5 h ([Strava support, iOS battery](https://support.strava.com/hc/en-us/articles/216917177-Extending-Battery-Life-iOS)). A 2015 guest post chose Google Maps for polyline rendering speed ([Google Cloud blog](https://cloud.googleblog.com/2015/01)).
- **Komoot** renders with MapLibre on web and mobile ([MapLibre news](https://maplibre.org/news/2023-04-06-komoot-becomes-a-maplibre-silver-sponsor/)).
- **iOS Core Location.** `activityType` changes processing before fixes arrive. An Apple DTS engineer says `.fitness` and the navigation types **snap points to roads**, which distorts paths and trails ([Apple forum 768991](https://developer.apple.com/forums/thread/768991), [765927](https://developer.apple.com/forums/thread/765927)). `distanceFilter` and `desiredAccuracy` are the main battery levers, and `pausesLocationUpdatesAutomatically` saves power ([Apple docs](https://developer.apple.com/documentation/corelocation/cllocationmanager/pauseslocationupdatesautomatically)). *Mapping:* the gotcha is already recorded (`Location.ActivityType`). Weigh `.fitness` against off-street walking. Keep auto-pause off, or a pocketed walk loses fixes. **[native, never run on a device]**
- **Smoothing:** GPS distance overestimates because of jitter. Common remedies are distance gating (about 2 m), accuracy-weighted Kalman filters, and moving averages, each of which can cut corners ([GPS Visualizer filters](https://gpsvisualizer.com/tutorials/track_filters.html), [MDPI 2023](https://www.mdpi.com/1424-8220/23/5/2678)). Chronicles' read-time `FixFilter` plus dwell smoothing already covers this. A Kalman filter is optional and would mean a `SNAP_RULES` bump.
- **Simplification for display vs. storage.** Store raw fixes (already done). For display, simplify the sealed history chunks once, when they seal, rather than per publish. simplify-js runs a radial-distance pass and then Douglas-Peucker; its "high quality" mode is 10–20× slower ([simplify-js](https://mourner.github.io/simplify-js)). A Rust port measured simplify-js at about 0.27 ms for 73k points ([simplify-polyline](https://docs.rs/crate/simplify-polyline/0.3.0)), so cost is negligible at walk sizes. geojson-vt's `tolerance` already applies Douglas-Peucker for each zoom. Visvalingam suits shape-preserving thumbnails better, but it isn't needed here.

## 4. iOS Safari

- **No published per-tab number.** Apple says the WebKit limit depends on device RAM and system load, and can't be raised ([Apple forum 133449](https://developer.apple.com/forums/thread/133449)).
- **Silent kills.** WebKit bug 300782 (Oct 2025) says texture-heavy WebGL pages are killed under memory pressure and reloaded, sometimes in a loop ending in "A problem repeatedly occurred". It reports that **neither an OOM error nor `webglcontextlost` fires first**. A WebKit engineer called it a bug ([bug 300782](https://bugs.webkit.org/show_bug.cgi?id=300782), search snippet only).
- **Memory carried across navigations.** One report saw WebGL memory carry over between page navigations, growing from 180 to 338 MB ([bug 290623](https://bugs.webkit.org/show_bug.cgi?id=290623)).
- **Context loss can stick.** After a context loss, a new context sometimes can't be created until Safari restarts ([bug 289601](https://bugs.webkit.org/show_bug.cgi?id=289601)).
- **Older bugs.** A canvas-resize leak was fixed in iOS 14.3 ([Apple forum 668999](https://developer.apple.com/forums/thread/668999)). Mapbox GL JS out-of-memory crashes on iOS were hard to pin on one cause ([bug 172790](https://bugs.webkit.org/show_bug.cgi?id=172790)).
- *Mapping:* peak memory is what counts, so remove the second map, use fixed tile caches, and avoid canvas resizes. The open walk already survives a reload, so make sure a reload loop lands the user back on the walk quickly. Still handle `webglcontextlost`, though it may not fire.

## Do / don't

**Do**
- Fix the `moveend → setView → cone setData` loop. Only update `view` when zoom (or the latitude bucket) actually changes.
- Keep fixes in an external store, drive the map imperatively, and put the clock in its own leaf.
- Use a history source plus a tail source. Seal chunks every ~100 fixes and at pauses and gaps, and simplify each chunk once when it seals.
- Keep distance as a running sum and only append to trace runs.
- Skip camera moves under ~1–2 px. Coalesce map writes into one per frame.
- Set `tolerance`/`buffer`/`maxzoom` on the trace, fog and route sources, and a fixed `maxTileCacheSize`.
- Call `remove()` on the home map during a walk on web (needs the owner's call). Do nothing at all while `document.hidden` or when native AppState isn't `active`.
- Measure each change with the same 4-minute profile, and with a 60-minute one, since today's cost grows with walk length.

**Don't**
- Don't `setData` the full trace every second, or animate a source with rAF `setData`.
- Don't put fixes, the view or the walker position in the walk screen's top-level state.
- Don't rely on the React Compiler or `React.memo` while inputs are new arrays every publish.
- Don't run `easeTo` continuously on a hidden page.
- Don't grow DOM markers into the hundreds.
- Don't count on `webglcontextlost` before an iOS kill.
- Don't switch to `.fitness` without testing off-road snapping. Native has never run on a device.
