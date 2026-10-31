This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

# Chronicles: project notes for agents

What the app is, the decisions already made, and the traps found while building it.
Read this before changing recording, streets, the replay or storage.

## Product and where the spec lives

- The spec is the owner's "Explorer App Concept" doc in Claude Docs. This app is its
  v0, "the chronicle": start, walk, capture (photo, voice, text), stop, replay. The
  replay is the make-or-break; respect its rules: five beats in fixed order, restraint
  (no confetti, streaks or badges), and the lows stay in.
- **The replay waits at each capture** (the owner's call, over the doc's fixed ~40 s):
  the path runs in a fixed 30 s, but stops at every capture until Continue. Photos
  stay up; voice memos and videos play to the end. Skip jumps to the card.
- **Photos and videos are full screen** (the owner's call): the media fills
  everything above a thin dark strip with the details and the actions (‹ ›, or the
  replay's Continue). Notes and memos keep their card. The replay uses the same
  layout at its photo and video stops.
- **Re-watches move on by themselves** (the owner's call): "Watch again", and replays
  opened from the log, advance after 4 s for a photo or note, and when a memo or
  video ends. Only the first replay after a walk waits for taps.
- **Video** comes from the camera button (the system camera's own video mode),
  capped at 30 s on phones and 15 s on web. The mic stays the separate pocket
  recorder.
- **Local-only.** No accounts, no backend, nothing leaves the device. The owner chose
  this over Supabase for v0; don't add a server without asking.
- **No simulation.** Web traces the real browser location live while the page is open
  and visible. Don't add fake walkers or demo traces to the app; mock GPS only in
  test harnesses.
- **Web is a fallback.** A mobile feature with no web workaround stays off on web
  (background recording, for example). A limited version is fine where one works
  (photos open a file picker on desktop).
- **Native first** (the owner's rule). Every feature is built on the Expo modules
  and components the phone app uses. Web gets its own code only where no Expo
  module covers the feature on web, and each such exception is listed here with
  its reason:
  - **Map:** maplibre-gl. MapLibre RN has no web build.
  - **Storage:** IndexedDB (`db/index.web.ts`, `media/index.web.ts`).
    expo-sqlite's web build needs `SharedArrayBuffer`, which needs
    cross-origin isolation headers GitHub Pages can't send. expo-file-system
    has no web build.
  - **Location:** `navigator.geolocation` (`recorder/index.web.ts`).
    expo-location's web watch is unfit for a walk: it emits fixes under the
    browser's watch id but looks callbacks up by its own, so fixes can be
    dropped or the wrong watch cleared. It also swallows errors and never asks
    for high accuracy.
  - **Caption baking:** canvas (`Baker.web.tsx`). react-native-view-shot has
    no web build.
  - **Reminders:** expo-notifications has no web build. The walk screen's own
    sticky reminder is the web's.
  - **Browser fixes** with no native counterpart: `webStyles.web.ts` (pinned
    viewport, long-press guards) and the muted-autoplay fallback.
  Before adding web-only code, check `node_modules/<module>/build/*.web.*` for
  a web implementation, and add it to this list with its reason.
- **Backing up a walk is deferred** (the owner's call) until the export system
  has a proper place in the app. It is tested on a phone first. The code
  (`lib/export`, `writeWalkBundle`) stays, but nothing in the UI reaches it.
  Saving a single keeper from the viewer stays.

## Walk screen layout (decided with the owner, after research)

- Capture controls are large icon buttons (camera, mic, pencil) in a centered row,
  floating in the lower-middle of the screen. Time, distance and hold-to-stop sit in
  a thin strip at the very bottom, with Stop at the right end, away from the captures.
- Why: Hoober's touch research shows taps are most accurate near the center and
  least accurate at the top and bottom edges and in corners. About half of phone use
  is one-handed, mostly with the right thumb, and grips change with the task. Strava,
  AllTrails and Komoot keep record and capture controls low on the screen, and Google
  Maps floats its controls at the bottom right. A centered row needs no handedness
  setting.
- Text is kept to a minimum. There is no header or "Recording" label, because the
  growing trace shows a walk is on. A status chip appears only when something is
  wrong: waiting for GPS, weak GPS, or not recording.
- Captures are pins on the map, on the walk screen and on the replay card. The map
  groups them itself by screen distance (`useZoomPins`: pins within 44 px at the
  current zoom share one, showing the count), so they never pile up when zoomed out.
  Pins are anchored at their stem's foot, so the walker's dot stays visible. Tapping
  a pin opens its captures in `CaptureViewer`.
- While a voice memo records, Stop & save takes the mic's own slot. Discard is
  smaller and in the camera's slot, and it is undoable for 5 s. A pulsing timer sits
  above the row. A memo under 1 s of wall-clock time is dropped with a "Too short,
  not kept" toast. A memo that fails to save offers Retry. Leaving the screen
  mid-memo saves it.
- A quick tap on Stop shows "Hold to stop the walk".
- Pills (the caption offer, voice Undo, Retry) sit above the capture row, so the
  row never moves under the thumb. The small edge buttons (unwalked streets, and
  Recenter while not following) stack at the right edge above the row and one pill
  (`EDGE_BOTTOM`), inside the 640 column on wide screens. Zooming keeps following;
  only a pan or a turn stops it (web; native can't tell zoom from pan yet).

## Round 3: pause, standstills, place memory, captions, export (the owner's calls)

- **Pause stops recording.** `pauseWalk` writes the pause row, then stops the
  recorder. `resumeWalk` starts the recorder first (via `start`, which asks for
  location again, since a one-time grant can lapse), and ends the pause only if
  that worked. Pause sits beside Hold (48 px, 20 px apart), Resume is filled
  orange, Stop is disabled while a pause or resume is in flight, and a sticky
  reminder shows after 10 min paused. On a phone, a local notification
  (expo-notifications, `lib/notify`) is scheduled for the same moment when the
  pause starts, and cancelled on resume or stop. Notification permission is
  asked for at the first pause, not at launch. In front, the banner is
  suppressed, because the screen's own reminder shows.
- **A pause is a break in the trace however short.** `isBreak(a, b, pauses)` in
  `geo.ts` is used by `splitAtGaps`, `traceDistanceM`, the snapper, `timedRuns`
  and the replay's `activeClock`. Pass the walk's pauses everywhere a trace is
  drawn, measured or replayed. `useLiveTrace` takes the pauses too, drops fixes
  inside them, and doesn't report a pause as a hidden-page gap.
- **Captures still work while paused** (the owner's call). An unstamped one is
  placed where the pause began, not on a line across it.
- **Standstills** (`dwellsOf` / `smoothDwells`): fixes are averaged into 30 s bins.
  A stay grows while each bin is within 25 m of the stay's running center, and it
  survives two bins outside (GPS jumps). It must last 2 min, its first and last
  thirds must sit within 15 m of each other (so slow drifting walks aren't
  stays), and when speed is reported its median must be ≤ 0.3 m/s (so circling
  a fountain isn't a stay). Neighboring stays at one spot merge. Without
  reported speed, slow circling inside 25 m can still read as a stay. The live
  distance uses the same smoothing as the card. Walks summarized before this
  keep their old distance until they re-snap.
- **What happened here:** a long press on the walk screen (so stray taps do
  nothing), a tap on the replay card. The reach is 44 px at the current zoom,
  clamped to 15–150 m (`pressRadiusM`). The open walk's captures are passed in as
  shown, because an unstamped one has no stored place until stop. Web taps wait
  300 ms so a double-tap zoom isn't also a press.
- **Unwalked streets near me** count named streets only (the owner's call), within
  1 km by real distance. Pieces along this walk's trace (20 m) are left out of
  the fog until stop credits them. While the toggle is on, the trace is drawn in
  the accent, because navy on bold fog is 1.4:1.
- **Street reads from the live view (`collectView`) only count at z14.** Below
  z14, tiles are simplified and pieces get other ids, so `collectView` returns
  `complete: false` and nothing is cached. On web it also keeps only features
  from z14 tiles (`feature._z`). The walk screen tags them with the build from
  `ensureTileBuild()`, never `'unknown'`, and runs once per 100 m actually moved,
  one run at a time.
- **Captions are data** (`caption`, `caption_y`) and are baked in only when saved
  out. Sizes are fractions of the photo's width with no pixel minimums
  (`CAPTION_STYLE`, `captionMetrics`, `captionTop`), shared by `CaptionBar` and
  both bakers, so the saved photo matches the screen. The bar is centered on `y`
  by its measured height. 80 characters at most. The canvas baker breaks words
  too wide alone character by character (CJK).
- **iOS can't present a Modal over a Modal.** The caption editor opens inside
  the viewer as an overlay (`CaptionEditor overlay`), never as a sibling Modal.
- **Native baking** sizes the view in points (`px / PixelRatio`), passes the pixel
  `width`/`height` to `captureRef`, uses `useRenderInContext` on iOS, sits behind
  the viewer's cover instead of off screen, and runs one bake at a time. Not tried
  on a device.
- **Saving keepers** uses expo-media-library's `Asset.create` (the legacy
  `saveToLibraryAsync` throws), with `requestPermissionsAsync(true)` (write-only).
  The plugin's read permissions are blocked in `app.json`. Media is always reached
  through `resolveMedia`, so legacy absolute and `data:` refs still work.
- **The backup zip (deferred, not in the UI) is streamed** (`writeWalkBundle`: fflate `Zip` +
  `ZipPassThrough`, 1 MB chunks, written to a file handle on native and kept as
  Blob parts on web). Missing media is counted, marked in walk.json and reported.
  There is no import yet.

## v0.5: places (in progress; the spec is the concept doc's "v0.5" tab)

- **No dataset is hard-coded** (the owner's rule). `src/lib/areas/assign.ts`
  knows only two interfaces from `areas/types.ts`:
  - `PlaceCandidate`: a named point with a level and a reach.
  - `BoundarySource`: which country and state contain a point.
  Datasets reach it through adapters:
  - Map tiles go through `tilePlaces.ts`, the only file that knows the
    OpenMapTiles place classes.
  - Outlines ship in the app's own boundary-pack format (`boundaryPack.ts`).
    `scripts/build-boundaries.js` builds one from Natural Earth; another dataset
    gets its own script that writes the same pack.
  Area keys are level + name + parent key, never a dataset's ids. Tests run the
  assignment against in-memory sources, and only adapter tests touch real data.
- **One model on both platforms.** `Area` and `WalkArea` are cache, stored
  through the shared `Db` interface: SQLite migration 5 on native, IndexedDB
  v4 on web. They are written with the walk's snap in one transaction. Areas no
  walk refers to are dropped. Offline, a walk keeps its old rows. The view
  must read only walks, summaries, `Area` and `WalkArea`, never traces or media.
- **Placement.** The active trace (the filter applied, no pauses, gaps or
  standstills) is cut into 50 m pieces. Each piece counts for the nearest place
  within reach at each level: neighborhood 1 km, town/village 3 km, city
  10 km. Between a town and a city, the closer for its size wins.
  - States come from the boundary pack. A point within 1 km outside every
    outline (a pier) takes the nearest state. Without a pack, the tiles' state
    points stand in.
  - Town and city points rarely lie in a walk's z14 street tiles, so
    `collectPlaces` reads the place layer at z10 (`PLACES_ZOOM`) around the walk.
  - Changing `AREA_RULES` or a pack's edition re-places every walk through the
    `snap_rules` meta.
- **Natural Earth's 50m admin-1 is too coarse.** It leaves Manhattan, Hoboken
  and Miami Beach outside every state. The shipped US pack is built from the
  10m edition (577 KB). Rebuild it with
  `node scripts/build-boundaries.js <ne_10m_admin_1_states_provinces.geojson> US assets/boundaries/us.json`
  (GitHub's raw host for `nvkelso/natural-earth-vector` is reachable from
  cloud sessions; naciscdn.org is not).

## Working with the owner

- **Ask before architectural decisions:** libraries, data model, platform strategy,
  navigation flow. Use AskUserQuestion with a recommended option. Local fixes don't
  need asking.
- **Build each vertical slice spec-first and test-first** (the owner's rule, from
  v0.5 on):
  1. Write the slice's spec as numbered, testable acceptance criteria (in the
     concept doc's version tab).
  2. Turn each criterion into a failing test before writing the code: a unit
     test in `npm test` for pure logic, or an e2e check in `scripts/e2e-web.js`
     for screens.
  3. The slice is done when those pass, along with typecheck, lint and the
     whole existing suite.
- **Audit every slice adversarially once it's built.**
  - Run one report-only pass that tries to break it, with concrete failure
    scenarios and severity, plus a UI/UX review.
  - Triage each finding: accept, defer or reject, with a reason. Bring
    architectural ones to the owner.
  - Give every accepted finding a regression test before its fix.
  - Flag native code that hasn't run on a device in every report.
  - Deploy to main only after the fixes pass the full suite.
  - The v0 slices were: recording, capture and media, streets/fog/snapping,
    replay, storage and log. In v0, tests were mostly written alongside the
    code rather than strictly first; from v0.5 they come first.

## Architecture in one breath

- **Truth vs. cache.** Walk, TracePoint and Capture are truth, append-only apart from
  the walk's own fields and a capture's placement at stop. StreetSegment,
  VisitedSegment and WalkSummary are a cache, tagged with the tile build, and can be
  dropped and rebuilt. Recompute from the trace; never patch derived data.
- **Raw fixes are stored unfiltered.** `FixFilter` / `filterFixes` in `src/lib/geo.ts`
  apply the gates at read time: accuracy over 50 m, staleness before the walk began,
  speed over 7 m/s, and re-anchoring when the first accepted fix was the outlier.
  Always pass the walk's `started_at`.
- **Platform splits.** `x.native.ts` / `x.web.ts` sit beside a plain `x.ts` that only
  re-exports the native one for TypeScript. Metro picks per platform; the plain file
  is never bundled. Keep the shared interface in a `types.ts`.
- **Lifecycle** lives in `src/lib/session.ts`: one open walk, re-entry guards, and a
  launch-time reconcile called from `_layout.tsx`. Stop writes `ended_at` and
  `open: false` first, then stops the recorder, then opens the replay. Streets are
  derived later.
- **Streets are derived on the device** (`src/lib/streets.ts`), behind the replay's
  first beat (`snapWalk` in `src/lib/finish.ts`). The map's `collect(centers)` steps
  the camera at z14 behind a cover and reads the source features.
- **Versioned cache.** `ensureTileBuild()` (`src/lib/tiles.ts`) reads the dated build
  from OpenFreeMap's TileJSON. On a change it purges street segments and nulls each
  walk's `snapped_build`; the walk re-snaps when its replay next opens. Visited rows
  and summaries are kept until then, so the log and new-street counts keep working.
- **Home is the places map** (the owner's call, v0.5; the log screen is gone).
  `src/app/index.tsx` shows stars where walks were, at the level for the zoom
  (`levelForZoom`: neighborhoods from z11, towns from z6, states below, and
  countries below z3 once two countries are walked). Stars merge within 44 px,
  and all are one size. A bottom sheet (`HomeSheet`, built on Animated and
  responders, no library) peeks with "N walks · M places" and opens to the
  walks list or a place's walks. Start floats above it.
  - Walks with no places are placed in one pass behind a cover
    (`placeAll`); a failure waits for the next launch.
  - It reads only walks, summaries, `Area` and `WalkArea` (`places.ts`), never
    traces or media. Keep it that way.
  - The home map stays mounted under the walk screen, so the e2e targets the
    walk's map with `.last()`.

## Gotchas (each of these cost real time)

### Environment

- `docs.expo.dev`, `api.expo.dev` and `tiles.openfreemap.org` may be blocked in cloud
  containers. Use `EXPO_OFFLINE=1 npx expo install <pkg>`, which resolves versions
  from the installed `expo` package. Read API truth from `node_modules/**/build/*.d.ts`
  instead of the docs.
- `npm test` uses `tsx --test`. Anything a test imports must not import React Native.
  That is why `tileMath.ts` (pure) is split from `tiles.ts` (imports the db).

### Expo and React Native

- expo-location exports the activity enum as `Location.ActivityType`, not
  `LocationActivityType`. TypeScript accepted the wrong name; it would have crashed
  at runtime. `npx expo lint` (`import/namespace`) caught it: run lint.
- **The background location task must be defined when the bundle loads.** expo-router
  evaluates route modules lazily, so the task is registered from the custom entry
  `index.js` (`package.json` `main`), before `expo-router/entry`. Never move it into a
  route.
- Foreground permission is enough for a walk started in the foreground. Treat
  "Always" as a best-effort upgrade, or users who pick "While Using" hit a dead end.
- Voice memos stop when the phone locks unless `setAudioModeAsync` gets
  `allowsBackgroundRecording: true` and the expo-audio plugin has
  `enableBackgroundRecording`.
- iOS container paths change across updates and restores. Store media paths relative
  to `Paths.document` and resolve them with `resolveMedia()` at read time.
- expo-sqlite: all writes go through the single queue in `db/index.native.ts`, using
  `withExclusiveTransactionAsync`. Plain `withTransactionAsync` collides with
  concurrent writes from the background task. Schema changes go in `MIGRATIONS`,
  tracked with `PRAGMA user_version`. Never edit an existing migration.
- IndexedDB: bump `VERSION` and add an `oldVersion < N` step in `migrate()`. An
  unconditional `createObjectStore` aborts the upgrade.
- React Compiler lint rules (`eslint-config-expo`):
  - Call `setState` from callbacks, timers or subscriptions, not synchronously in an
    effect body.
  - Use lazy initializers for `Date.now()`.
  - Don't read or write `ref.current` during render; use `useState(() => new Animated.Value(0))`.
  - For callbacks passed into hooks, store them in a ref that is updated in an effect.
- react-native-web's `AccessibilityInfo.isScreenReaderEnabled()` always resolves
  `true`. Don't branch on it on web.
- A long press on web needs two guards. `user-select: none` and
  `-webkit-touch-callout: none` stop iOS Safari from selecting the label. A
  Pressable `onLongPress` (with `delayLongPress` beyond the hold) stops Android
  Chrome's `contextmenu`, which react-native-web otherwise treats as the end of the
  press. HoldButton has both.
- `headerBackVisible: false` is ignored on web; also set `headerLeft: () => null`.
  After the replay modal, return with `router.dismissTo('/')`; `replace('/')`
  stacks a second log.

### Map (maplibre-gl on web, MapLibre RN v11 on native)

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

### Streets, fog and snapping (OpenMapTiles schema via OpenFreeMap)

- Names live in the `transportation_name` layer, not `transportation`. OpenMapTiles
  `subclass` is the OSM highway value, so there is no `sidewalk` or `crossing`.
  Crosswalks are short footways (30 m or less) crossing a street.
- Tile simplification drops the shared node where straight streets cross, so
  junctions are found geometrically, including between lines of one MultiLineString
  and where a line crosses itself.
- **Segment ids must not depend on which tiles loaded.** Each line is clipped to its
  own z14 tile, which removes the buffer overlap. Copies are re-stitched on tile
  edges, pieces are cut only at junctions, then chunked from a canonical end. The id
  is class plus endpoints plus midpoint, because two pieces can share both endpoints
  (loops, divided streets). Pieces that run off the loaded tiles are dropped.
- Lines that overhang their home tile by more than 80 m are treated as untiled and
  split across every tile they cross. This is what keeps hand-made fixtures working.
- Avoid anything O(n²) over features. Index with `EdgeGrid`. A 3.6 km downtown, about
  16k features, should derive in under a second.
- Snapping ignores the 20 m at each end of a piece, where the junctions are, and
  credits pieces of 40 m or less only if the trace ran down their middle.
  `WALKED_THRESHOLD` (0.5) is still an open product decision.
- **Walking along, not across** (the owner's call): a sample only counts where
  the trace runs within 35° of the street's direction, using the trace's heading
  over 10 m either side, so crossing at a corner credits nothing. A named street
  counts only once about a block of it was walked (`STREET_MIN_M` 80 m, or 80%
  of a shorter street). Until then its pieces stay fog. "Streets walked" and
  "new streets" count named streets only. Changing these rules means bumping
  `SNAP_RULES` in `tiles.ts`, which marks every walk to re-snap when its replay
  next opens.

### Icons and pins

- Icons come from `@expo/vector-icons` (Ionicons), via `src/components/icons.tsx`.
  Every icon-only button needs an `accessibilityLabel`.
- On web, pins are maplibre-gl DOM `Marker`s whose content is rendered with
  `react-dom/client` `createRoot`, using the same `CapturePinView` as native.
  Unmount the roots in a `queueMicrotask`, because unmounting inside React's commit
  warns. Clicks look the pin up by id in a ref, so they never open stale captures.
- On native, pins are MapLibre RN `<Marker>` children. Use the Marker's own `onPress`:
  on iOS the annotation's tap recognizer swallows touches meant for a Pressable inside
  it.

### Voice memos

- All voice actions (start, save, discard, undo, retry) run on one promise queue in
  `useCaptures`, so taps never interleave. Stop waits for that queue.
- Never call `stop()` on a recorder that already stopped by itself: on web it waits
  forever for `dataavailable`. `stopRecorder` checks `isRecording` and races a 3 s
  timeout.
- `getStatus().durationMillis` is 0 once a native recorder has stopped. Judge
  "accidental tap" by wall-clock time, never by that number.
- The web image picker reports video `duration` in seconds; native reports
  milliseconds.
- `findNodeHandle` doesn't exist on web. Use `focusOn(ref)` in `src/lib/focus.ts`.
- React Compiler lint treats a ref passed inside a props object (`props.x.ref`) as
  a ref read during render. Use `forwardRef` instead.
- expo-video's web `VideoView` puts its `style` straight on the `<video>` tag. A
  video doesn't stretch to left/right/top/bottom, so size it with `width` and
  `height` of 100% (`styles.fill`), or it sits at its own size in a corner. Pass
  `playsInline` too.
- On web, a View that React reuses from another layout (same type, same position)
  never reports `onLayout`. When a component swaps between two layouts (the
  capture's card while its file loads, then the full-screen media), key each
  root so it mounts fresh.
- iOS can leave the page scrolled after the keyboard, the system camera or an app
  switch, so the screen's bottom bar ends halfway up. `webStyles.web.ts` pins
  `#root` to the viewport (`position: fixed; inset: 0`) and scrolls back to 0
  whenever nothing is being typed in.
- Browsers refuse to start sound without a tap; iOS refuses every time, and the
  replay reaches its stops on its own clock. expo-video's web `play()` doesn't
  even catch the refusal. So on web a video that hasn't started 800 ms after
  `play()` plays muted with a "Tap for sound" button, and a refused memo (its
  play button still showing) moves on after 4 s in a replay that advances by
  itself. iOS also draws no frame of a video that hasn't played. Headless
  Chromium allows sound regardless (any earlier tap counts), so the e2e copies
  iOS's rule into a fresh page by overriding `HTMLMediaElement.prototype.play`.
- expo-video on web ignores `play()` before the source has loaded. Start it on
  `statusChange` → `readyToPlay`.

### Replay

- Change the beat and its start time together (`phase = { beat, t0 }`) and do beat
  transitions in the clock's tick. A separate clock state once skipped the fog beat
  on "Watch again".
- The path runs in active time: gaps over 60 s collapse to a 5 s hop
  (`activeClock` in `replay.ts`).
- At a stop the clock stands still. `stop.atMs` holds the path time, and resuming
  sets `t0 = now - atMs`. `shown` counts the groups already visited; reset it on
  "Watch again".
- `CaptureContent` plays a voice memo or video itself and is keyed by capture id, so
  moving on or skipping unmounts the player and stops the sound.
- Taps in the first 600 ms after a capture appears are ignored, so a double tap never
  skips one unseen.
- A capture after the last fix stops the path at its end. The path span is the trace;
  captures are clamped to it.
- With a screen reader on (native only, since react-native-web always says yes), the
  replay skips the fog and path and goes through the captures, then the card.
- The replay sets `playsInSilentMode` when it mounts, or memos are silent with the
  iPhone's ringer switch off.

## Deploying the web build

- `.github/workflows/pages.yml` publishes to GitHub Pages at
  `https://miguelaguerrero.github.io/chronicles/` on pushes to `main`, the only
  branch the Pages environment accepts (the owner's choice). It runs the typecheck and tests, then exports with
  `CHRONICLES_BASE_URL=/chronicles`.
- `app.config.js` turns that variable into `experiments.baseUrl`; without it, builds
  serve from the root.
- Pages has no fallback for app routes, so the workflow copies `index.html` to
  `404.html`. Without it, a reload on `/chronicles/walk`, which is how a web walk
  resumes, would 404.
- To check a sub-path build locally: `CHRONICLES_BASE_URL=/chronicles npm run export:web`,
  then `E2E_BASE=/chronicles npm run e2e:web`.

## Testing

- `npm test` runs unit tests for derivation, snapping, fix filtering and replay
  timing. Keep fixtures well inside one z14 tile unless you are testing tile edges.
  At lon -71.4, lat 41.82 a tile edge is 50 m away; the tests use lat 41.812.
- e2e notes: a pin's tap area is 48 px, so the "what happened here" press goes
  30 px beside it. Captions are checked through their aria-label after the photo's
  size has loaded. Each capture adds a replay stop, so the test loops on Continue.
- `npm run export:web && npm run e2e:web` runs a headless walk end to end with mocked
  GPS and a fake z14 GeoJSON street grid in place of the tile host. A walk at 5 m/s
  with one fix a second passes the speed gate; faster is dropped as GPS jumps.
  Chromium runs with a fake microphone for voice memos. Set `E2E_SHOTS=<dir>` to
  save screenshots of each screen.
- Before calling work done, run `npm run typecheck`, `npm run lint`, `npm test` and
  the e2e.
- **Native has never run on a device.** Say so in any report that touches native
  code. The concept doc's first milestone, a pocketed walk whose trace survives the
  screen being off, is still open.
