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

Every module in `src/lib` names its layer on its first line (`// @layer
core|shell|adapter|view`); the file is the one source, so the codemap doesn't
repeat it. `core` is what `npm test` can import with no fakes: decisions and
data, importing only core (type-only imports don't count), with no clock,
randomness, timers or module state. `shell` carries out a feature's effects,
`adapter` is a platform implementation behind an interface, `view` is a React
hook. `npm test` and lint check the layers; `.claude/rules/functional-core.md`
has the rules. `x.native.ts` / `x.web.ts` beside a plain `x.ts` is a platform
split (see Invariants).

### `index.js` and `src/app/` (routes; Expo Router)

```
index.js                     entry: imports lib/recorder (defines the background location task) before expo-router/entry
src/app/_layout.tsx          root stack: the tabs first, then walk and replay over them; opens the open walk at launch under a cover (lib/launchWalk), then reconciles the recorder; sets the audio mode; notes the launch path (lib/launchRoute)
src/app/(tabs)/_layout.tsx   the three tabs, Explore · Navigate · Chronicle; Explore opens first, at / (NV2); Navigate's press opens the walk screen (NR1)
src/app/(tabs)/navigate.tsx  Navigate's entry route (/navigate): Explore beneath, then the walk screen, ready (NR1, NR3)
src/app/(tabs)/index.tsx     Explore (/): the atlas of the areas near you (tiles, the area card; 0066, 0067); long press = What's good here / Walk here
src/app/(tabs)/chronicle.tsx Chronicle, the home: stars by area at the level for the zoom, moment pins from z11, the HomeSheet (Walks | Days), old-walk placement
src/app/explore.tsx          the old /explore path: dismissTo("/") down to Explore (NV2, 0070)
src/app/walk.tsx             the walk screen, and Navigate: one screen and one map, ready with no walk open (`useReady`), else live trace and dot, fog, captures, navigation bar, Explore marks, memories, reminders, options, hold-to-stop
src/app/replay/[id].tsx      a walk's replay: the five beats; the path beat is a ceremony told over the map (lib/ceremony, components/ceremony), or the screen reader's steps; the card, naming
src/app/day/[key].tsx        a day's replay: the day's story told by the same ceremony (or the screen reader's steps), a quiet card
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
Replay ceremonies (decisions 0085, 0086)
  ceremony/Stage.tsx         draws any ceremony's frame over the map: the cut's dim, the clock and the line under it, Held, the overlays by kind
  ceremony/overlays.tsx      OVERLAYS: one view per overlay kind (the type fails the build until every kind has one); OVERLAY_ORDER
  ceremony/Bubbles.tsx       notes and memos stacking in the bottom-left corner; a memo plays while its bubble says, pauses when held
  ceremony/Cards.tsx         a photo or video card that grows from the pin and tucks into the pile; the video plays in it
  ceremony/Pile.tsx          the photos and videos so far, the last three, no count; opens them in the viewer
  ceremony/Whispers.tsx      a passed place said beside it (projected from the map's centre and zoom)
  ceremony/RollingClock.tsx  the time of day, its digits on reels
  ceremony/StepThrough.tsx   the screen reader's way: the story's moments one at a time with Continue
  ceremony/useCeremonyClock.ts  the time into a ceremony: an epoch, hold, a pause while a viewer is open, onEnd once
  ceremony/useRevealed.ts    the captures whose pins are up, one list per count
  ceremony/layout.ts         where the stage puts things (pile, card, bottom margin), project(), tiltOf
Home / tabs
  HomeSheet.tsx              the three-height bottom sheet (Animated + responders), Walks | Days, a place's walks, a day's timeline
  StarView.tsx               a star for a place; all one size; the 8 busiest carry names
  OpenWalk.tsx               the open walk kept above the tabs: walk, pauses, live trace, useOpenWalk / useOpenWalkInfo
  RecordingBar.tsx           the bar above the tabs while a walk is minimized: time, distance, camera, Stop, › back to the walk
  MomentBar.tsx              MomentBar (loose moments from Navigate) and CaptureRow (captures for the open walk)
  LocateButton.tsx           Locate me, an edge button
  StartSettings.tsx          the walk settings, shown in the ready bar pulled up (NR7)
  walk/                      the walk screen's shared geometry (layout.ts), CaptureStack, ReadyBar, useReady (the walk screen's ready state)
  GapCard.tsx                a filled or offered stretch: Keep, Not this way
  LandingMarks.tsx           a strip's name beside it on the map
  ExploreSettings.tsx        what I'm into, the "?" range (ring preview), the pocket alert: a panel, not a modal
  NotificationSettings.tsx   the kind switches, permission state, the test notification
Captures
  CaptureView.tsx            CaptureViewer (full-screen photos and videos over a strip; cards for notes and memos; More menu) and CaptureContent (plays memos and videos)
  CapturePinView.tsx         the round capture pin, grouped count, faint (memory) and found variants
  MarkPinView.tsx            an Explore "?" mark: unknown, named, found
  Caption.tsx                CAPTION_STYLE, captionMetrics, captionTop, CaptionBar, CaptionField (the editor's Text tool)
  Baker(.native|.web).tsx    renders a photo's edits and caption into a saved copy, or the lines and caption alone into a clear PNG for a video (Baker.types.ts): react-native-view-shot over EditedPicture on native, canvas on web
  edit/MediaEditor.tsx       the Edit screen (ME1-ME23): crop and rotate, filters, Markup-style drawing, text, trim; an overlay inside the viewer, its own Modal elsewhere
  edit/tools.tsx             CropFrame, DrawLayer (pen, marker, eraser), FilterStrip, TrimBar
  edit/EditedPhoto.tsx       EditedPicture (one SVG through exportPlan's transform: FeColorMatrix filter, lines) and EditedPhoto (with the caption bar, full screen)
  edit/EditedVideo.tsx       EditedVideo (the player turned and cropped by view transforms, lines and caption in a layer taking no taps, the trim kept while playing), VideoPicture, useVideoSize
  edit/EditOffer.tsx         the 6 s Edit offer after a capture: useEditOffer, EditOfferPill, EditButton
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
  recorder/                  Recorder contract (types.ts); index.native.ts: expo-location background task; index.web.ts: navigator.geolocation + wake lock; emitter.ts: status
  session.ts                 the walk lifecycle: startWalk, stopWalk, pauseWalk, resumeWalk, reconcileOpenWalk; one open walk, re-entry guards
  geo.ts                     distances, projector, FixFilter and filterFixes (accuracy, staleness, speed), isBreak, splitAtGaps, settleJitter, dwellsOf / smoothDwells
  rides.ts                   readTrace: gates, rides, walked vs kept fixes; liveRuns, rideRuns, traceDistances, ridingAt
  liveDot.ts                 the dot's Kalman filter (LiveDot), DotStore, motion hints
  glide.ts                   the dot's glide between fixes, on a given clock
  steps.ts                   StepDetector: walking vs still from acceleration
  walkMotion.ts              askMotion, restoreMotion, useWalkMotion (expo-sensors permission; samples through motionSource/)
  motionSource/              motion samples: DeviceMotion on native, the devicemotion event on web
  useLiveTrace.ts            the walk screen's live trace: reads raw fixes every 2 s, feeds the DotStore, reports gaps and rides
  useGlidingWalker.ts        runs the glide as a render loop outside React
  traceEnds.ts               where a walk began and ended
  gpsLog.ts                  the raw readings as text for Share GPS log
  lastFix.ts                 the last fix Navigate read, in memory
Streets, snapping, fog
  streets.ts                 OpenMapTiles road features to street pieces (deriveSegments, streetKey); the only file that knows the road schema
  snapper.ts                 trace to visited pieces: BUFFER_M, WALKED_THRESHOLD, STREET_MIN_M, along-not-across
  finish.ts                  snapWalk: derive, snap, place and summarize a walk behind the replay's first beat; pickArea, walkBounds
  tiles.ts                   ensureTileBuild (TileJSON build detection, purge on change), STREET_CODE, SNAP_RULES
  tileBuild.ts               reads the build from a TileJSON within a time limit
  tileMath.ts                z14 tile rectangles and edges
  db/segmentBounds.ts a piece's bbox and the z14 tile it is filed under
  summary.ts                 loadReplay (ReplayData for the replay, with where and when each passed place was passed) and suggestTitle
  replay.ts                  FOG_MS, groupCaptures, timedRuns, traceUntil, walkerAt: the replay's shared pieces
  ceremony/types.ts          Story (paths, moves, moments, breaks, travel, passes), Frame, Overlay kinds, Ceremony (decision 0086)
  ceremony/story.ts          walkStory, dayStory, storySteps; metresAt, timeAtMetres, pathDrawnAt: what happened, no timing or look
  ceremony/rhythm.ts         the rhythm ceremony (RR1-RR19): rhythmPlan (legs, stops, cuts, the soft cap), rhythmFrame, laterLine, notePause
  ceremony/registry.ts       CEREMONIES, DEFAULT_CEREMONY, ceremonyFor: a new ceremony is an entry here
  backlog.ts                 placeBacklog: places old walks in one pass through the home map
  mapReads.ts                one camera read at a time (mapReadLock)
Places and areas (v0.5)
  areas/types.ts             PlaceCandidate, TownOutline, BoundarySource, Area, WalkArea: the whole contract
  areas/assign.ts            places a trace by its 50 m pieces; the title place
  areas/rules.ts             AREA_RULES and the reaches
  areas/tilePlaces.ts the OpenMapTiles place classes (the only file that knows them)
  areas/outlines.ts          town outlines: townAt (the smallest outline holding a point, else points), withOutlines, hoodAllowed, the z12 tiles
  areas/divisionTiles.ts     Overture's divisions schema (the only file that knows it): a tile's locality outlines and points
  areas/outlineRead.ts       createOutlines: outlines read by tile and kept (`outline_tile`); outlineReader.ts is the app's instance
  areas/overtureOutlines.ts  the network side: divisions.pmtiles by byte range (z12 to decide, z10 to draw), the places' release
  areas/borders.ts           town borders to draw: bordersFor (tinted, firm, lined; simplified, 40 at most), outlineIdHere, outlineOf
  areas/useOutlineSet.ts     a screen's outlines (useOutlineSet) and a replay's or day's borders (useWalkBorders)
  areas/boundaryPack.ts, boundaries.ts         the boundary-pack format and the packs shipped (US)
  places.ts                  the home map's stars from walks, Area and WalkArea only
  placeAll.ts                placing walks one pass at a time, withTimeout (the shell beside places.ts)
  zoomOut.ts                 when the walks list zooms out
Navigation (inside a walk)
  nav/types.ts               Waypoint, Route, RouteSource
  nav/rules.ts               NAV: reach to a street, too far, off route, arrival
  nav/graph.ts               a small walking graph with A*
  nav/traceRoute.ts, streetRoute.ts         the two RouteSources: along this trace; over derived streets
  nav/navigator.ts           routeTo: first source that can, or why none
  nav/store.ts               the destination in meta `nav`
  nav/useNavigation.ts       routing, re-routing, arrival and the street read on the walk screen
  nav/handoff.ts             Open in Maps: picks the maps app and its links per platform and browser
  nav/openInMaps.ts          opens them with Linking.openURL straight from the tap
Filling gaps
  gaps/rules.ts              GAP_RULES: what counts as a gap, the paces, the budgets
  gaps/infer.ts              gapsOf, the likely way over street pieces (A*), certain / offered / nothing
  gaps/index.ts              reads a gap's tiles in code, memoized per build, walk and gap
  gaps/useLiveStretches.ts   the open walk's inferred and decided stretches (lives in OpenWalkProvider)
  tileCollector.ts           reads the tiles near a walk in code, no camera moves (re-snap after a decision)
Discovery and Explore (v1)
  discovery/types.ts         Place, Offered, Mark, Recall, PlaceSource, Kind, CategoryId
  discovery/tilePois.ts the OpenMapTiles poi classes, markable, kindFor (the only file that knows them)
  discovery/places.ts placeKey, normalization, same-place rules
  discovery/noise.ts         MARK_CATEGORIES, chains.json and notable.json rules
  discovery/categories.ts the eight categories: labels, icons
  discovery/tileDecode.ts         one vector tile decoded in code (pbf + vector-tile)
  discovery/tileFetch.ts     fetches and caches decoded tiles per build
  discovery/recall.ts Remind me here's rules; recallCheck.ts: the check per fix, saveRecall / stopRecall, meta `recall_open`
  explore/explore.ts         checklists, membership, visibleMarks, routeMarks, findFor, foundList, passedLine
  explore/exploreRun.ts      one explore read (decoder, z14 + z11) and the build check
  explore/useExplore.ts      Explore on the walk screen
  explore/exploreTab.ts the drawer's area-in-view (superseded on the tab by the atlas)
  atlas/atlas.ts             the Explore atlas: near list, presence steps (findable kinds count markable places, AG1), thin rings (AG3), sketch, familiarity, labels
  atlas/read.ts              the atlas's reads: areas near you, one ring at a time (decoder)
  atlas/useAtlas.ts          the atlas's data and its read loop, while Explore is in front
  explore/settings.ts        what I'm into, range, pocket alert (meta)
  explore/momentFind.ts      a loose moment finds a place
Activity density (AD1-AD16)
  activity/weights.ts        what counts toward density and how much, for OSM and Overture
  activity/points.ts         places as weighted points from both sources; one place once across them
  activity/release.ts        Overture's bucket, its listing, the newest release
  activity/reader.ts         OvertureReader and TileMemo: a tile once per release, deadlines, a failed archive reopened
  activity/useOvertureRelease.ts the release known, for screens that judge staleness
  activity/overture.ts       Overture's places by tile (pmtiles, byte ranges); the release check (meta)
Walkability (WK1-WK23)
  walk/types.ts              Band, WayFacts, TileFacts, WalkSource, WalkTile
  walk/bands.ts              the band table (bandOf), WALK_CODE
  walk/match.ts              bandsFor: ways to street segments by tile, EdgeGrid-style index, 35 degrees
  walk/layer.ts              drawFor, routeSegments, tilesAround
  walk/summary.ts            areaWords, bandLengths (built, not yet shown)
  walk/bandWords.ts          each band's words and badge
  walk/ahead.ts              carStretches, alongRoute, aheadStep, warningLine
  walk/aheadWatch.ts         the heads-up's shell and Store
  walk/overtureSegments.ts   Overture's `segment` schema (the only file that knows it)
  walk/overpass.ts           Overpass's query and answer (the only file that knows it)
  walk/chain.ts              Overture first, Overpass second
  walk/overtureSource.ts, walk/overpassSource.ts  the network factories; walk/walkApp.ts is the app's instance
  walk/reader.ts             createWalkReader: the device's cache, one request at a time, deadlines (`walk_tile`)
  walk/switch.ts             the layer's switch (meta `walk_layer`)
  walk/useWalkability.ts, walk/useRouteWarning.ts  the hooks the maps and the walk screen call
Landing (v1.5)
  landing/analyze.ts         busy streets, pockets, the landing point, from the grades
  landing/grade.ts           density along each named street, and its grades against the read
  landing/spatial.ts         buckets, single linkage, hulls: the analysis's planar helpers
  landing/read.ts            What's good here: decoder reads, remembered areas
  landing/view.ts            LANDING_CODE, LandingRow / LandingView, staleness
  landing/walk.ts            the strip chip and the dead-zone nudge
Memories, moments, days
  memories.ts                faint pins from earlier walks: memoryReader, groupFirst
  here.ts                    capturesHere: What happened here, across walks
  days.ts                    days from capture and walk times, never stored; the day's card
  locate/                    one fix for a loose moment: expo-location on native, navigator.geolocation on web
  useLocate.ts               the Locate tap
Captures and media
  useCaptures.ts             photo, video, memo and note capture; the voice queue; placing; UNDO_MS
  captureBus.ts              news of a capture kept or patched (thumbnail, place, note, caption, edits), between the bar, the row and the walk screen
  mediaEdit.ts               edits as data (core, ME5-ME21): rotate and crop against the original, the nine filter matrices, pen sizes and colours, the eraser's hit, simplify, trim, exportPlan (one transform for every renderer), parse/serialize
  editSession.ts             the editor's draft, undo/redo, close/discard/done (core)
  editOffer.ts               the after-capture Edit offer's timing and words (core)
  ready/                     Navigate, ready's shell (`createReady`: its choices, one fix, notes and moments' writes) and the app's instance
  captureEdits/              saving a moment's edits from a screen with no capture path: stored, then told on the bus (shell)
  videoEdit/                 an edited video as one file: the local module on phones, canvas + MediaRecorder on the web
  media/                     where files are kept: Documents (relative paths) on native, Blobs in IndexedDB on web; resolveMedia
  media/thumb.ts             the 240 px copy with expo-image-manipulator; thumbPlan.ts decides when; thumbJob.ts runs one job per photo at a time
  useMediaUri.ts             a capture's media as a playable URI
  pins.ts                    pinsFor: grouping captures by screen distance; pinReminded, the bell
  useReminded.ts             the captures with a live reminder, per map; re-read on recallCheck's onRecallsChanged and at nextExpiry
  momentPins.ts              moments outside walks as pins (Navigate, Chronicle) and Chronicle's fit around them
  export/bundle.ts           writeWalkBundle (deferred; nothing in the UI reaches it); export/ per-platform keepers
Deletion
  deletion/core.ts           what each delete takes; pending.ts: the Undo window on a given clock
  deletion/index.ts          the one Undo window wired to timers and storage; useDeletions.ts: useHidden / useVisible
Notifications
  notify/core.ts             Notice, NoticeTransport, routeResponse: the contract
  notify/index.ts            notifier, the kind switches (meta `notify_off`)
  notify/transport.native.ts expo-notifications; transport.web.ts: the service worker (public/sw.js); webNotice.ts: its message and URL
  openers.ts                 stacked listeners for a tapped notification, newest first
Motion (animation)
  motionTokens.ts            MOTION timings, PRESS_SCALE, durationFor, HAPTIC_PATTERNS (each feedback kind's taps), nudgeAllowed, buzzOffered; REPLAY_RHYTHM (every number of the rhythm)
  motion.ts                  useReducedMotion, nativeDriver, feedback(kind): every haptic goes through here
  enter.ts                   which change gets which of the four entrances
  haptics.ts                 expo-haptics behind feedback(); on web only the pocket alert's nudge plays
  canBuzz.ts, canBuzz.web.ts whether to offer the pocket alert: always on a phone; on web, a touch screen
Session, screens and small helpers
  walkNav.ts, walkGate.ts         showWalk(): the one way to the walk screen, gated
  launchRoute.ts            the path the app opened on: a stale replay or day link at launch goes to Explore (NV2)
  launchWalk.ts             an open walk at launch: covered until it is read, the walk screen, then the recorder (NV2)
  walkEvents.ts              the open walk changed (started, paused, resumed, stopped)
  openWalkLoad.ts            latest-wins loader for the open walk
  useStartWalk.ts, startPlan.ts         Start and Walk here: the plan's meta, then the walk screen
  useTabMap.ts               a tab's map taken down while the tab isn't in front
  memoGate.ts                a memo recording anywhere blocks a start
  settleWithin.ts            await a promise, but never longer than ms
  recordingBar.ts, quietLines.ts, format.ts, scaleBar.ts         the bar's line, counts as words, distances and times, the scale bar's length
  audioMode(.native|.web).ts setAudioMode: expo-audio on native, navigator.audioSession on web
  focus.ts                   focusOn(ref) (findNodeHandle doesn't exist on web)
  perfCount.ts               opt-in counters when window.__perf is set
  id.ts                      newId
  types.ts                   the data model (below)
  db/                        the Db contract (types.ts), SQLite (index.native.ts), IndexedDB (index.web.ts), row mappers (placeRow, exploreRow), DERIVED_STORES / KEPT_STORES (stores.ts)
Layers (functional core, imperative shell)
  ports/                     Ports (types.ts: db, recorder, notifier, clock, newId) and the real instance (index.ts), the composition root a view hands a shell
  store.ts, useStore.ts      a shell's state (createStore) and a view's slice of it (useSyncExternalStore)
  meta.ts                    every meta key and key family with its codec; metaStore(db)
  __tests__/fakes/           fakePorts(): memoryDb, the fake recorder, notifier and clock, one call log, failNext; held to db/index.web.ts by dbContract.ts
  (scripts/layers.js)        reads the layer tags and core's imports for layers.test.ts and eslint.config.js
  (scripts/affected.js)      what a change can break: changed files, the import graph, the tests and e2e scenarios to run (e2e-scenarios.js)
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
  The Overture release (meta `overture_release`, checked at most daily by
  `ensureOvertureRelease`) is a second version: a landing row or an atlas
  ring measured with another release, or without Overture, is stale too
  (`isStale`, `readQueue`), and measured again.
- **Two map-data hosts.** The map's tiles come from OpenFreeMap; Overture's
  places come from its public S3 bucket (`activity/release.ts`), one PMTiles
  file per release read by byte range for the z14 tiles a read covers. Both
  are asked only for tiles: no key, no account, nothing about the user. The
  e2e checks no other host is reached.
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
- **The `npm test` rule.** Tests import only core modules, fakes and types, because `tsx --test`
  cannot load React Native. That is why `tileMath.ts` is split from
  `tiles.ts` (which imports the db), `thumbPlan.ts` from `media/thumb.ts`,
  `deletion/pending.ts` from `deletion/index.ts`, and so on: keep the rule in
  a core file and wire it in a shell or adapter.
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
- **Caption and edit baking:** canvas (`Baker.web.tsx`). react-native-view-shot has no
  web build. The filter is applied to the pixels with the same matrix as the
  screen (`ctx.filter` isn't dependable in Safari).
- **Edited video:** canvas + `MediaRecorder` + Web Audio (`videoEdit/index.web.ts`).
  No Expo module re-encodes video; phones use the local module
  `modules/chronicles-video-edit`. The web player's video size comes from a
  detached `<video>`'s metadata (`probeVideoSize`): expo-video's web player has
  no video track.
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
- **Can it buzz** (the pocket alert's switch): `canBuzz.web.ts` asks
  whether the pointer is coarse. expo-haptics' web build vibrates where
  `navigator.vibrate` exists and tries iPhone Safari's switch haptic on a touch
  screen, but desktop Chrome has `navigator.vibrate` and no motor (audit 4);
  expo-haptics has no availability call. The buzz itself goes through expo-haptics, as on a
  phone (decision 0079).
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
  caption, caption_y, thumb_path, edit (a photo's or video's edits as data:
  rotate, crop, filter, lines, trim; SQLite migration 17 stores it as JSON,
  IndexedDB keeps the object; `parseEdit` reads both, decision 0084).
- `Pause`, `Still`: walk_id, started_at, ended_at.
- `GapDecision` (`gap_fill`, kept): a stretch kept or dismissed, with its line, so a map update never moves it.

Cache (`lib/types.ts`, `areas/types.ts`): `StreetSegment` (id, name,
kind_detail, length_m, geometry, build), `VisitedSegment` (segment_id,
walk_id, covered_fraction, first_t, street_key), `WalkSummary` (distance_m,
ride_m, duration_ms, new_streets, streets_walked, photos, videos, voices,
notes, streets_read), `Area` and `WalkArea`, `OutlineTile` (`outline_tile`:
the town outlines one tile held, keyed `z/x/y` (z12 to decide, z10 to draw), with its release; TO12, TB7).

Discovery and Explore (`discovery/types.ts`, `explore/explore.ts`): `Place`
(cache, per build, `markable`), `Offered`, `Mark`, `Recall` (kept),
`ChecklistArea`, `ChecklistItem`, `Find` (kept), `ExploreRead` (derived).
Landing (`landing/analyze.ts`, `landing/view.ts`): `AreaAnalysis` (strips,
pockets, graded stretches, landing), stored as `LandingRow` in the `landing`
store (kept across builds, shown stale; `overture` names the release it was
measured with). Density's input is `ActivityPoint` (`activity/points.ts`),
never stored. Navigation (`nav/types.ts`): `Waypoint`, `Route`,
`RouteSource`; the destination is meta `nav`.

Meta is a key/value table (`getMeta` / `setMeta`): `tile_build`, `tile_url`,
`snap_rules`, `overture_release`, `overture_checked_at`, `nav`, `start_mode`, `explore_walk`, `explored:<walk>`,
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
