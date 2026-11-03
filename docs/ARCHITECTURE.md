# Chronicles: architecture

A codemap: where the code that does X lives, what the code you are looking at
is for, and the invariants it must keep. Decisions and their history are in
`AGENTS.md`; the product is in `docs/PRODUCT.md`; how to test is in
`docs/TESTING.md`. Files are named, never line numbers.

## Bird's-eye view

Chronicles is a local-only companion for wandering towns on foot: one Expo
codebase for iOS, Android and the web (a fallback). Three tabs are the loop:
Explore before (busy areas, places to find), Navigate during (Start, the
capture row, a live view of a minimized walk), Chronicle after (stars where
walks were, Walks | Days, replays). A walk screen opens over the tabs while
recording: a live dot and trace, capture buttons, navigation inside the walk,
Explore's "?" marks, memories from earlier walks. Stop opens the replay: five
beats in fixed order (streets read, fog clears, the path runs with a stop at
every capture, the card, name it). Nothing leaves the device: no accounts, no
backend, no simulation.

## Codemap

`(pure)` marks a module `npm test` can import: no React, React Native, Expo or
map import, directly or through what it imports (type-only imports don't
count). Everything else is a platform module. `x.native.ts` / `x.web.ts`
beside a plain `x.ts` is a platform split (see Invariants).

### `index.js` and `src/app/` (routes; Expo Router)

```
index.js                     entry: imports lib/recorder (defines the background location task) before expo-router/entry
src/app/_layout.tsx          root stack: the tabs first, then walk and replay over them; reconciles the open walk at launch; sets the audio mode
src/app/(tabs)/_layout.tsx   the three tabs, Explore · Navigate · Chronicle; Navigate opens first
src/app/(tabs)/index.tsx     Navigate: the drawer (Start at its foot, settings above), the capture row, LiveWalk (a live view of a minimized walk)
src/app/(tabs)/explore.tsx   Explore: remembered busy areas (magenta), each area's places to find and finds, no counts; long press = What's good here / Walk here
src/app/(tabs)/chronicle.tsx Chronicle, the home: stars by area at the level for the zoom, moment pins from z11, the HomeSheet (Walks | Days), old-walk placement
src/app/walk.tsx             the walk screen: live trace and dot, fog, captures, navigation bar, Explore marks, memories, reminders, options, hold-to-stop
src/app/replay/[id].tsx      a walk's replay: the five beats, stops at captures, the card, naming; first watch waits, re-watches advance
src/app/day/[key].tsx        a day's replay: flies pin to pin through loose moments, plays each walk's own path, a quiet card
```

### `src/components/`

```
Screens' building blocks
  ui.tsx                     theme (AA colours), Button (press scale), HoldButton, LiftIn, Banner
  Modal.tsx                  the only Modal to import: renders react-native-web's Modal only while visible (portal leak)
  SwitchRow.tsx              a setting row that flips from anywhere on it; the Switch only shows state
  icons.tsx                  Ionicons through one Icon, KIND_ICON / KIND_LABEL per capture kind
  Ticking.tsx                text that ticks itself every second so its parent doesn't re-render
  ScreenError.tsx            what a screen that threw shows instead of a blank page
  webStyles(.web).ts         web-only page fixes: pinned viewport, long-press guards (nothing on native)
  pwa(.web).ts               web manifest and Apple home-screen tags, under the base path
Home / tabs
  HomeSheet.tsx              the three-height bottom sheet (Animated + responders), Walks | Days, a place's walks, a day's timeline
  StarView.tsx               a star for a place; all one size; the 8 busiest carry names
  OpenWalk.tsx               the open walk kept above the tabs: walk, pauses, live trace, useOpenWalk / useOpenWalkInfo
  RecordingBar.tsx           the bar above the tabs while a walk is minimized: time, distance, camera, Stop, › back to the walk
  MomentBar.tsx              MomentBar (loose moments from Navigate) and CaptureRow (captures for the open walk)
  LocateButton.tsx           Locate me, an edge button
  StartDialog.tsx            Navigate's settings in one dialog opened from the summary line under Start
  GapCard.tsx                a filled or offered stretch: Keep, Not this way
  LandingMarks.tsx           a strip's name beside it on the map
  ExploreSettings.tsx        what I'm into, the "?" range (ring preview), the pocket alert: a panel, not a modal
  NotificationSettings.tsx   the kind switches, permission state, the test notification
Captures
  CaptureView.tsx            CaptureViewer (full-screen photos and videos over a strip; cards for notes and memos; More menu) and CaptureContent (plays memos and videos)
  CapturePinView.tsx         the round capture pin, grouped count, faint (memory) and found variants
  MarkPinView.tsx            an Explore "?" mark: unknown, named, found
  Caption.tsx                CAPTION_STYLE, captionMetrics, captionTop, CaptionBar, CaptionEditor (an overlay inside the viewer)
  Baker(.native|.web).tsx    bakes a caption into a saved photo: react-native-view-shot on native, canvas on web
  MemoryPreview.tsx          a memory pin's quick preview above the capture row
  ReminderCard.tsx           a flagged capture come back on the walk screen
  RemindEditor.tsx           Remind me here: how often, until when (drawn inside the viewer's Modal)
  WalkActions.tsx            a finished walk's More: remove media, delete the walk
  ConfirmCard.tsx            asks before a delete (an overlay, not a Modal)
  UndoToast.tsx              the Undo pill; only the newest mounted host shows it
  Enter.tsx                  plays one of the four entrances once at mount (lib/enter decides which)
Map
  map/types.ts               the shared WalkMap contract: props, handle, colours (FOG_STYLE, HOTSPOT, COLORS), GeoJSON builders, planViews, useZoomPins, pressRadiusM
  map/WalkMap.web.tsx        maplibre-gl: sources and layers, DOM Markers for pins, collect/collectView, data-* attributes for the e2e
  map/WalkMap.native.tsx     MapLibre RN v11: the same props; Markers; querySourceFeatures through invisible layers
  map/ScaleBar.tsx           the scale bar (lib/scaleBar decides its length)
```

### `src/lib/`

```
Recording and traces
  recorder/                  Recorder contract (types.ts); index.native.ts: expo-location background task; index.web.ts: navigator.geolocation + wake lock; emitter.ts: status (pure)
  session.ts                 the walk lifecycle: startWalk, stopWalk, pauseWalk, resumeWalk, reconcileOpenWalk; one open walk, re-entry guards
  geo.ts            (pure)   distances, projector, FixFilter and filterFixes (accuracy, staleness, speed), isBreak, splitAtGaps, settleJitter, dwellsOf / smoothDwells
  rides.ts          (pure)   readTrace: gates, rides, walked vs kept fixes; liveRuns, rideRuns, traceDistances, ridingAt
  liveDot.ts        (pure)   the dot's Kalman filter (LiveDot), DotStore, motion hints
  glide.ts          (pure)   the dot's glide between fixes, on a given clock
  steps.ts          (pure)   StepDetector: walking vs still from acceleration
  walkMotion.ts              askMotion, restoreMotion, useWalkMotion (expo-sensors permission; samples through motionSource/)
  motionSource/              motion samples: DeviceMotion on native, the devicemotion event on web
  useLiveTrace.ts            the walk screen's live trace: reads raw fixes every 2 s, feeds the DotStore, reports gaps and rides
  useGlidingWalker.ts        runs the glide as a render loop outside React
  traceEnds.ts      (pure)   where a walk began and ended
  gpsLog.ts         (pure)   the raw readings as text for Share GPS log
  lastFix.ts        (pure)   the last fix Navigate read, in memory
Streets, snapping, fog
  streets.ts        (pure)   OpenMapTiles road features to street pieces (deriveSegments, streetKey); the only file that knows the road schema
  snapper.ts        (pure)   trace to visited pieces: BUFFER_M, WALKED_THRESHOLD, STREET_MIN_M, along-not-across
  finish.ts                  snapWalk: derive, snap, place and summarize a walk behind the replay's first beat; pickArea, walkBounds
  tiles.ts                   ensureTileBuild (TileJSON build detection, purge on change), STREET_CODE, SNAP_RULES
  tileBuild.ts      (pure)   reads the build from a TileJSON within a time limit
  tileMath.ts       (pure)   z14 tile rectangles and edges
  db/segmentBounds.ts (pure) a piece's bbox and the z14 tile it is filed under
  summary.ts                 loadReplay (ReplayData for the replay) and suggestTitle
  backlog.ts                 placeBacklog: places old walks in one pass through the home map
  mapReads.ts       (pure)   one camera read at a time (mapReadLock)
Places and areas (v0.5)
  areas/types.ts    (pure)   PlaceCandidate, BoundarySource, Area, WalkArea: the whole contract
  areas/assign.ts   (pure)   places a trace by its 50 m pieces; the title place
  areas/rules.ts    (pure)   AREA_RULES and the reaches
  areas/tilePlaces.ts (pure) the OpenMapTiles place classes (the only file that knows them)
  areas/boundaryPack.ts, boundaries.ts (pure)  the boundary-pack format and the packs shipped (US)
  places.ts         (pure)   the home map's stars from walks, Area and WalkArea only
  zoomOut.ts        (pure)   when the walks list zooms out
Navigation (inside a walk)
  nav/types.ts      (pure)   Waypoint, Route, RouteSource
  nav/rules.ts      (pure)   NAV: reach to a street, too far, off route, arrival
  nav/graph.ts      (pure)   a small walking graph with A*
  nav/traceRoute.ts, streetRoute.ts (pure)  the two RouteSources: along this trace; over derived streets
  nav/navigator.ts  (pure)   routeTo: first source that can, or why none
  nav/store.ts               the destination in meta `nav`
  nav/useNavigation.ts       routing, re-routing, arrival and the street read on the walk screen
  nav/handoff.ts    (pure)   Open in Maps: picks the maps app and its links per platform and browser
  nav/openInMaps.ts          opens them with Linking.openURL straight from the tap
Filling gaps
  gaps/rules.ts     (pure)   GAP_RULES: what counts as a gap, the paces, the budgets
  gaps/infer.ts     (pure)   gapsOf, the likely way over street pieces (A*), certain / offered / nothing
  gaps/index.ts              reads a gap's tiles in code, memoized per build, walk and gap
  gaps/useLiveStretches.ts   the open walk's inferred and decided stretches (lives in OpenWalkProvider)
  tileCollector.ts           reads the tiles near a walk in code, no camera moves (re-snap after a decision)
Discovery and Explore (v1)
  discovery/types.ts (pure)  Place, Offered, Mark, Recall, PlaceSource, Kind, CategoryId
  discovery/tilePois.ts (pure) the OpenMapTiles poi classes, markable, kindFor (the only file that knows them)
  discovery/places.ts (pure) placeKey, normalization, same-place rules
  discovery/noise.ts (pure)  MARK_CATEGORIES, chains.json and notable.json rules
  discovery/categories.ts (pure) the eight categories: labels, icons
  discovery/tileDecode.ts (pure)  one vector tile decoded in code (pbf + vector-tile)
  discovery/tileFetch.ts     fetches and caches decoded tiles per build
  discovery/recall.ts (pure) Remind me here's rules; recallCheck.ts: the check per fix, saveRecall / stopRecall, meta `recall_open`
  explore/explore.ts (pure)  checklists, membership, visibleMarks, routeMarks, findFor, foundList, passedLine
  explore/exploreRun.ts      one explore read (decoder, z14 + z11) and the build check
  explore/useExplore.ts      Explore on the walk screen
  explore/exploreTab.ts (pure) what the Explore tab shows for the view
  explore/settings.ts        what I'm into, range, pocket alert (meta)
  explore/momentFind.ts      a loose moment finds a place
Landing (v1.5)
  landing/analyze.ts (pure)  strips, pockets, the landing point, by density
  landing/read.ts            What's good here: decoder reads, remembered areas
  landing/view.ts   (pure)   LANDING_CODE, LandingRow / LandingView, staleness
  landing/walk.ts   (pure)   the strip chip and the dead-zone nudge
Memories, moments, days
  memories.ts       (pure)   faint pins from earlier walks: memoryReader, groupFirst
  here.ts                    capturesHere: What happened here, across walks
  days.ts           (pure)   days from capture and walk times, never stored; dayPlan
  locate/                    one fix for a loose moment: expo-location on native, navigator.geolocation on web
  useLocate.ts               the Locate tap
Captures and media
  useCaptures.ts             photo, video, memo and note capture; the voice queue; placing; UNDO_MS
  captureBus.ts     (pure)   news of a capture kept or patched, between the bar, the row and the walk screen
  media/                     where files are kept: Documents (relative paths) on native, Blobs in IndexedDB on web; resolveMedia
  media/thumb.ts             the 240 px copy with expo-image-manipulator; thumbPlan.ts (pure) decides when
  useMediaUri.ts             a capture's media as a playable URI
  pins.ts           (pure)   pinsFor: grouping captures by screen distance
  momentPins.ts     (pure)   moments outside walks as pins (Navigate, Chronicle) and Chronicle's fit around them
  export/bundle.ts           writeWalkBundle (deferred; nothing in the UI reaches it); export/ per-platform keepers
Deletion
  deletion/core.ts  (pure)   what each delete takes; pending.ts (pure): the Undo window on a given clock
  deletion/index.ts          the one Undo window wired to timers and storage; useDeletions.ts: useHidden / useVisible
Notifications
  notify/core.ts    (pure)   Notice, NoticeTransport, routeResponse: the contract
  notify/index.ts            notifier, the kind switches (meta `notify_off`)
  notify/transport.native.ts expo-notifications; transport.web.ts: the service worker (public/sw.js); webNotice.ts (pure): its message and URL
  openers.ts        (pure)   stacked listeners for a tapped notification, newest first
Motion (animation)
  motionTokens.ts   (pure)   MOTION timings, PRESS_SCALE, durationFor
  motion.ts                  useReducedMotion, nativeDriver, feedback(kind): every haptic goes through here
  enter.ts          (pure)   which change gets which of the four entrances
  haptics.ts                 expo-haptics behind feedback()
Session, screens and small helpers
  walkNav.ts, walkGate.ts (pure)  showWalk(): the one way to the walk screen, gated
  walkEvents.ts     (pure)   the open walk changed (started, paused, resumed, stopped)
  openWalkLoad.ts   (pure)   latest-wins loader for the open walk
  useStartWalk.ts, startPlan.ts (pure)  Start and Walk here: the plan's meta, then the walk screen
  useTabMap.ts               a tab's map taken down while the tab isn't in front
  memoGate.ts       (pure)   a memo recording anywhere blocks a start
  settleWithin.ts   (pure)   await a promise, but never longer than ms
  recordingBar.ts, quietLines.ts, format.ts, scaleBar.ts (pure)  the bar's line, counts as words, distances and times, the scale bar's length
  audioMode(.native|.web).ts setAudioMode: expo-audio on native, navigator.audioSession on web
  focus.ts                   focusOn(ref) (findNodeHandle doesn't exist on web)
  perfCount.ts      (pure)   opt-in counters when window.__perf is set
  id.ts             (pure)   newId
  types.ts          (pure)   the data model (below)
  db/                        the Db contract (types.ts), SQLite (index.native.ts), IndexedDB (index.web.ts), row mappers (placeRow, exploreRow), DERIVED_STORES / KEPT_STORES (stores.ts)
```

## Invariants and boundaries

- **Truth vs. cache.** Walk, TracePoint and Capture are truth, append-only
  apart from the walk's own fields, a capture's placement at stop, and the
  deletes in `deletion/`. Pause and Still are kept truth beside them.
  StreetSegment, VisitedSegment, WalkSummary, Area and WalkArea are a cache,
  tagged with the tile build, and can be dropped and rebuilt. Recompute from
  the trace; never patch derived data.
- **Raw fixes are stored unfiltered.** `readTrace` (`rides.ts`) applies the
  gates at read time: accuracy over 50 m, staleness before the walk began,
  rides, then `FixFilter` per walked stretch (speed over 7 m/s, re-anchoring
  when the first accepted fix was the outlier), then jitter and still spells.
  Always pass the walk's `started_at`, pauses and stills. Walked-only
  consumers (snapping, walk me back, the solid line) use `tr.walked` with
  `tr.breaks`; walked-and-ridden consumers (places, placing captures, the
  replay's dot) use `smoothKept(tr)` with the pauses only.
- **Platform splits.** `x.native.ts` / `x.web.ts` sit beside a plain `x.ts`
  that only re-exports the native one for TypeScript. Metro picks per
  platform; the plain file is never bundled. The shared interface lives in a
  `types.ts` next to them.
- **Lifecycle lives in `session.ts`:** one open walk, re-entry guards, and a
  launch-time reconcile called from `app/_layout.tsx`. Stop writes `ended_at`
  and `open: false` first, then stops the recorder, then opens the replay.
  Streets are derived later, behind the replay's first beat (`snapWalk`).
- **The background location task is defined when the bundle loads**, from
  `index.js`, before `expo-router/entry`. Never move it into a route.
- **Versioned cache** (`tiles.ts`). `ensureTileBuild()` reads the dated build
  from OpenFreeMap's TileJSON; on a change it purges `DERIVED_STORES` and
  nulls each walk's `snapped_build`, so the walk re-snaps when its replay next
  opens. Visited rows and summaries are kept until then, so the walks list and
  new-street counts keep working. `STREET_CODE` (bump when `streets.ts` derives different pieces from
  the same tiles) drops the street cache once and re-snaps every walk.
  `SNAP_RULES` (bump when `snapper.ts`, `AREA_RULES` or a boundary pack's
  edition changes what counts) re-snaps and re-places every walk through the
  `snap_rules` meta. `LANDING_CODE` (`landing/view.ts`, bumped by hand) marks
  remembered busy areas stale; they are drawn dimmed until analyzed again.
- **Storage.** SQLite: all writes go through the single queue in
  `db/index.native.ts` with `withExclusiveTransactionAsync`; schema changes go
  in `MIGRATIONS`, tracked with `PRAGMA user_version`. IndexedDB: bump
  `VERSION` and add an `oldVersion < N` step in `migrate()`. Never edit an
  existing migration. `DERIVED_STORES` (`street_segment`, `place`,
  `explore_read`) are cleared by `purgeDerived`; `KEPT_STORES` (`offered`,
  `mark`, `recall`, `checklist_area`, `checklist_item`, `find`) never are.
- **Screens read rows, never traces or media.** Chronicle reads walks,
  summaries, Area, WalkArea and capture rows; `backlog.ts` is its one read of
  traces. Media is reached only through `resolveMedia`.
- **The `npm test` rule.** Tests import only pure modules, because `tsx --test`
  cannot load React Native. That is why `tileMath.ts` is split from
  `tiles.ts` (which imports the db), `thumbPlan.ts` from `media/thumb.ts`,
  `deletion/pending.ts` from `deletion/index.ts`, and so on: keep the rule in
  a pure file and wire it in a platform one.
- **Always-rules that are boundaries:**
  - Never import `Modal` from react-native; use `components/Modal`.
  - Never import Reanimated (it is in node_modules through expo-router);
    animation is React Native's own Animated through `lib/motion`.
  - Every haptic goes through `feedback(kind)` in `lib/motion`; every duration
    comes from `motionTokens.ts`.
  - Always `setAudioMode` from `lib/audioMode`, never `setAudioModeAsync`.
  - Going to the walk screen is `showWalk()` (`walkNav.ts`), never
    `router.push('/walk')`.
  - Only `tilePlaces.ts`, `tilePois.ts` and `streets.ts` know the tile schema;
    no dataset is hard-coded in `areas/assign.ts`.
  - Reminder and pause code call `notifier`, never a platform API.
  - Every write to a reminder goes through `saveRecall` / `stopRecall`.

## Web exceptions to "native first"

Every feature is built on the Expo modules the phone app uses. Web gets its
own code only where no Expo module covers the feature on web:

- **Map:** maplibre-gl (`map/WalkMap.web.tsx`). MapLibre RN has no web build.
- **Storage:** IndexedDB (`db/index.web.ts`, `media/index.web.ts`).
  expo-sqlite's web build needs `SharedArrayBuffer`, which needs cross-origin
  isolation headers GitHub Pages can't send; expo-file-system has no web build.
- **Location:** `navigator.geolocation` (`recorder/index.web.ts`,
  `locate/index.web.ts`). expo-location's web watch emits fixes under the
  browser's watch id but looks callbacks up by its own, swallows errors and
  never asks for high accuracy.
- **Caption baking:** canvas (`Baker.web.tsx`). react-native-view-shot has no
  web build.
- **Notifications:** a service worker (`public/sw.js`, through
  `notify/transport.web.ts`). expo-notifications has no web build. Local
  only; scheduled notices are page timers.
- **Audio mode:** `navigator.audioSession` (`audioMode.web.ts`). expo-audio's
  web `setAudioModeAsync` is an empty function, so `playsInSilentMode` never
  reached the web, and iPhone browsers played memos and videos silently. The
  Audio Session API (Safari 16.4+) is the web's equivalent: `playback` plays
  with the ringer off, and `play-and-record` is used while a memo records.
  Always go through `setAudioMode` in `lib/audioMode` (a lint rule enforces it).
- **Motion samples:** the browser's `devicemotion` event
  (`motionSource/index.web.ts`). expo-sensors 58's web DeviceMotion has no
  `addListener`; its permission and availability calls are still used.
- **Which maps app** (Open in Maps): on web, `nav/openInMaps.ts` reads
  `navigator.userAgent` and `maxTouchPoints`, since `Platform.OS` is just
  `web` and no Expo module says which phone a browser runs on. The link
  itself goes through React Native's `Linking`, as on a phone.
- **Browser fixes** with no native counterpart: `webStyles.web.ts` (pinned
  viewport, long-press guards) and the muted-autoplay fallback.

Before adding web-only code, check `node_modules/<module>/build/*.web.*` for
a web implementation, and add the exception to this list and to `AGENTS.md`
with its reason.

## Data model

Truth (`lib/types.ts`):

- `Walk`: id, started_at, ended_at, title, epilogue, open, area, snapped_build.
- `TracePoint`: walk_id, t, lat, lon, accuracy_m, speed, course. Raw, unfiltered.
- `Capture`: id, walk_id (null for a loose moment), t, lat/lon (null until
  placed), kind (photo | video | voice | text), file_path, body, segment_id,
  caption, caption_y, thumb_path.
- `Pause`, `Still`: walk_id, started_at, ended_at.
- `GapDecision` (`gap_fill`, kept): a stretch kept or dismissed, with its line, so a map update never moves it.

Cache (`lib/types.ts`, `areas/types.ts`): `StreetSegment` (id, name,
kind_detail, length_m, geometry, build), `VisitedSegment` (segment_id,
walk_id, covered_fraction, first_t, street_key), `WalkSummary` (distance_m,
ride_m, duration_ms, new_streets, streets_walked, photos, videos, voices,
notes, streets_read), `Area` and `WalkArea`.

Discovery and Explore (`discovery/types.ts`, `explore/explore.ts`): `Place`
(cache, per build, `markable`), `Offered`, `Mark`, `Recall` (kept),
`ChecklistArea`, `ChecklistItem`, `Find` (kept), `ExploreRead` (derived).
Landing (`landing/analyze.ts`, `landing/view.ts`): `AreaAnalysis` (strips,
pockets, landing), stored as `LandingRow` in the `landing` store (kept across
builds, shown stale). Navigation (`nav/types.ts`): `Waypoint`, `Route`,
`RouteSource`; the destination is meta `nav`.

Meta is a key/value table (`getMeta` / `setMeta`): `tile_build`, `tile_url`,
`snap_rules`, `nav`, `start_mode`, `explore_walk`, `explored:<walk>`,
`explore_hidden`, `explore_range`, `explore_haptic`, `notify_off`,
`recall_open`, `day_watched:<key>`.

Migrations: SQLite has 14 (`PRAGMA user_version`), IndexedDB is at `VERSION`
12. SQLite 14 and IndexedDB 12 add `gap_fill`. The most recent: SQLite 10 `ride_m` on summaries; 11 nullable
`Capture.walk_id` and `Find.walk_id` (tables rebuilt) plus `capture_t`; 12
`thumb_path`; 13 the `still` table. IndexedDB 9 the capture `lat` index; 10
the capture `t` index; 11 stills. `thumb_path` needed no IndexedDB bump: it
stores the record whole.

## Cross-cutting

- **Reactivity budget.** Steady walking renders the walk screen about 1.4
  times a second and the map component 0.8; the e2e fails above 2.5 renders/s
  for the walk screen, 1.05 `setData:cone`/s and 0.6 `setData:trace`/s in its
  busy window, and bounds Navigate's live view at 1.0/s. `perfCount`
  (`lib/perfCount.ts`) counts renders (`render:walk`, `render:map`,
  `render:navigate`, `render:navigate-walk`, `render:bar`, `render:home`,
  `render:explore`), map `setData:<source>`, `camera` and `fit` only when the
  page defines `window.__perf`. The clock and memo timer tick in their own
  components (`Ticking`); the screen's `now` ticks every 5 s; the trace is a
  history source re-sent once per 100 fixes plus a live tail (`splitTrace`);
  the map updates `view` only when zoom moves 0.05 or latitude 0.01°.
- **Web memory on iPhone.** Maps use `pixelRatio` ≤ 2,
  `maxTileCacheZoomLevels: 2`, `fadeDuration: 0`; one live map at a time (a
  tab's map is taken down while the tab isn't in front, `useTabMap`); the
  photo resize shrinks its canvas to 0 after use; cached street pieces are
  read by z14 tile (IndexedDB `tile` index), never `getAll()`.
- **The map.** maplibre-gl's worker is copied into `public/` by
  `scripts/copy-maplibre-worker.js` (postinstall) and pointed at with
  `setWorkerUrl`, prefixed with `EXPO_BASE_URL`. `fitBounds` is driven by a
  `fitKey` counter, applied only when it changes after mount. Street and place
  reads use `querySourceFeatures` on both platforms (native through invisible
  layers so the source's tiles load); only features from z14 tiles count.
- **Where the e2e hooks in.** The app writes `data-testid` on controls and,
  on the web map, `data-zoom`, `data-center`, `data-walker`, `data-ends`,
  `data-trace-end`, `data-trace-opacity`, `data-rides`, `data-ring`,
  `data-ids` (memory pins) and `data-at` (the puck's spot, only with
  `window.__perf`). The e2e injects its own probes with `addInitScript`
  (`window.__perf`, `__enters`, `__lifts`, `__audioSessions`, the geolocation
  watch counters); the app reads none of them.
