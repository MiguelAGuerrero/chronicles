# Deferred and open

Everything AGENTS.md marks deferred, open or not yet done, in one ledger, grouped by area; the source section is in parentheses.
An item leaves only when it ships, or when it is rejected with a decision record in `docs/decisions/`.

## Product (open in the concept doc)

- Two things are named Explore: the tab and the walk's mode (Positioning, open in the doc)
- Whether the replay keeps its "Passed …" low, now in words since U13 (Positioning, open in the doc)
- What the Explore tab lists in a city where AllTrails lists trails (Positioning, open in the doc)
- The Explore tab's "interesting ways through an area", listed as later (Positioning, three tabs)

## Navigation and routes

- Explore's route preview and "Walk this way": Explore's Walk here and an area's "Walk to its busiest street" start at once, with no scenic preview (Positioning; scenic routes, decision 0095)
- Scenic routes (decision 0095), left out: a detour via one named stop; a loop with no destination ("back here in 30 min"); choosing a route on the ready screen before Start (the preview comes up as Start records); "Streets new to you" as a leaning; a choice of detour size; water and riversides as green; routes past 5 km
- Scenic routes: a Sights row in a dense centre often says only "past places to find", since most places there are not yet found and never named (scenic routes, SR4)
- Scenic routes: a start or destination that snaps onto a street piece not joined to the rest (seen once in the Zurich tiles) finds no route at all, direct or scenic; today's Go here has the same gap (scenic routes)
- A complete walk through every point of interest in an area, which may double back: its own architecture, especially in dense areas such as Philadelphia or New York (decision 0102)
- Walk planner audit 18 (the owner's call): repeated "Suggest different routes" rotate the start among the eight densest cells, so enough presses cover them all, at the cells' resolution. Keep (it is the feature), or keep the first cells fixed?
- Walk planner audit 16: when Start replaces a destination already set, a line says so; whether the old one should be restorable is the owner's call.
- Walk planner audit 10: planning three routes (up to 6! orders per trial) has not been timed on a phone; the unit tests take seconds per scenario. Profile on a device, and move it off the JS thread if it blocks.
- Walk planner (decision 0102): other kinds in the same route (the opened kind is pre-selected; the page is laid out for a chooser); a sketch of the strip as a profile; pins for places the map draws (only found places are pinned); another street between the same cells for "Suggest different routes" (it turns the way round a loop and rotates the start cell); a walk across a whole town outline (it is built from 1.5 km around the area's point)
- Open in Maps on the Explore mark card (v0.5 navigate, Open in Maps)
- Open in Maps on the dead-zone nudge (v0.5 navigate, Open in Maps)
- Open in Maps on the home's Walk here (v0.5 navigate, Open in Maps)
- Walk me back ignores filled stretches (Filling gaps)

## Streets and snapping

- `WALKED_THRESHOLD` (0.5) is still an open product decision (Streets, fog and snapping)
- A 200 m chunk end on a bridge within 3 m of a junction below still merges with it, `MERGE_M` (Bridges and tunnels, after the audit)
- The 12 m heading window, `NAV.headingJoinM`, can pick a parallel street at an alley mouth (first leg only) (Bridges and tunnels, after the audit)
- Indoor `level` is not read (Bridges and tunnels, after the audit)

## Trace, rides and gaps

- Caching the settled part of a long walk; `useLiveTrace` reads all raw fixes again at each publish (Rides, live)
- After a relaunch, the first 20 s of a ride are missed by the phone's task `tail` (Rides, the phone's task)
- Dead reckoning from the phone's sensors (weak GPS with the app open) is a later slice (Filling gaps)
- Gap inferences aren't stored: a new session reads each gap's tiles again, the day replay never reads them, and unreadable tiles keep a walk re-snapping (Filling gaps)
- A long fill's share of the replay isn't capped (Filling gaps)
- No way to reach a filled stretch without a map tap, for screen readers, `GapCard` (Filling gaps)
- Gap inference on a very dense grid can take about 0.5 s of JS on a desktop, `gaps/infer.ts` (Filling gaps)
- Editing a kept or drawn line point by point: drawing again replaces it (Gap drawing)
- Drawing past a gap's two ends, or over a ride or a pause (Gap drawing)
- Showing that a kept line was drawn rather than guessed: it would need a column, a migration (Gap drawing)
- Freehand finger drawing: the owner chose taps snapped to paths (Gap drawing)
- Drawing re-derives every tile read so far on each read, and re-routes every pair on each tap: per-tile derivation and cached pairs (gap-drawing audit 9)
- Tiles read for a drawing aren't kept for the next one, and offline drawing doesn't use the street cache (gap-drawing audit 11)
- The offer for a gap depends on the walk's pace when it was read: live, the replay and a later session can differ (gap-drawing audit 13)
- A gap whose end fix moves more than 25 m while it is drawn keeps a line that meets no gap (gap-drawing audit 14)
- Drawing needs map taps: no way for a screen reader (Gap drawing)

## Explore and discovery

- An index for Offered; it's read whole, fine for thousands (v1 discovery)
- An unstamped capture can't find a place: it has no position until stop, `findFor` (v1 Explore)
- A place moved by a new build can be found twice (v1 Explore)
- The pocket alert likely needs the screen on (native), `explore_haptic` (v1 Explore); on the web a hidden page gets no fixes, so it never fires there with the screen off (Pocket alert nudge)
- Button haptics on the web: only the pocket alert buzzes there (Pocket alert nudge, 0079)
- A reload mid-walk forgets which places alerted, so they nudge again; on Android Chrome that nudge comes before any tap and is blocked, and the places count as alerted (pocket-alert-nudge audit 3)
- The pocket alert's second tap still plays up to 120 ms after a hold-to-stop or the switch going off on the same fix (pocket-alert-nudge audit 6)
- The home preview ignores the kind switches and doesn't restore the view after (v1 Explore)

## Activity density (AD1-AD16, decision 0080)

- Overture places as marks, finds or presence bars: marks stay the owner's attractions rule, and the bars must mean the same everywhere (activity density, AD2)
- Building footprints, land use, address points and street centrality as density signals, for towns where neither OSM nor Overture has the shops (activity density, the research)
- Overture's tiles kept on the phone across launches; today a tile is fetched once per release per session, `TileMemo` (activity density, AD8)
- A side-by-side count of OSM and Overture places over Phillipsburg: OpenFreeMap's tiles were unreachable from the cloud session (activity density, AD11)
- Places further than 40 m from a named street count toward nothing: a pedestrian plaza on unnamed paths, or a strip mall set back behind its car park, makes no busy street (activity density, AD9)
- The native map's credits don't name Overture: MapLibre RN takes credits only from a style's sources, and the GeoJSON sources have no attribution (activity density, AD16; web only)
- A tile can read "Quiet: little of any kind. Busy along South Main Street." where OSM is thin: the bars are OSM's (AD2), the busy street is measured with Overture too; the wording is the owner's to settle (activity density, audit UI note)

## Reminders and notifications

- Clearing reminder flags whose capture is gone, `discovery/recall.ts` (Remind me here)
- Remind me here firing outside a walk; needs background location (Moments and days)
- The reminder bell in a second web tab: a reminder fired or stopped in one tab leaves the bell in the other until a reload; `tell()` is per JS context (Reminder bell, audit 5)
- Native: the pin's Marker is re-keyed when its bell changes, so a photo pin shows its icon for a moment; the web redraws in place (Reminder bell, audit 4)
- The "in front" rule stays per transport: a phone lists background notices quietly, a browser has no list, `NoticeTransport` (Notifications)
- The Android channel's importance is DEFAULT, so the test may not pop up as a banner (Notifications)
- Unit tests of the web transport, `notify/transport.web.ts`; the e2e drives the real service worker (Notifications)

## Moments and days

- Quick capture outside the app: widget, lock screen, share sheet (Moments and days)
- A capture band on Chronicle's Walks, Days and Map (the owner's call, Nov 9: Memories only; decision 0112)
- Lost toasts on Memories (capture-from-chronicle audit 13): "Too short, not kept" lands under a viewer opened mid-memo, unseen; "saved to your walk" goes when the walk stops and the band remounts loose
- An open walk's moment from Memories' band joins Lately only once the walk is stopped (0098's rule, kept); the toast says "saved to your walk" meanwhile (Capture from Chronicle, steward S2)
- Moments in a place's stars (Moments and days)
- The home reads every capture row on focus; per-day counts would need storing (Moments and days)
- Moment pins filtered to the viewport, `MOMENT_PIN_ZOOM` (Moments and days)
- "Today" refreshing past midnight without a focus, `lib/days.ts` (Moments and days)
- A day of only placeless moments replays over the world map, `dayStory` (Moments and days)

## Captures, media and export

- Backing up a walk: `lib/export` and `writeWalkBundle` stay, but nothing in the UI reaches them, decision 0007 (Product, backing up)
- There is no import of the backup bundle yet (Round 3, the backup zip)
- The backup bundle leaves still spells out, `Still` (Round 3, motion audit)
- The backup bundle leaves gap decisions out, `gap_fill` (Filling gaps)
- Filters on video: no consistent way on iOS without Skia or an experimental flag (the owner's call, Media editing, decision 0090)
- A small copy remade later, because its file was gone, keeps the crop and rotation but not the filter or lines: those need the mounted baker (ME20)
- No screen-reader way to draw a line or drag the crop frame; Rotate, the filters, pens, colours, Undo, Redo, Revert and aspects are reachable (ME22)
- From Markup, left out: pencil texture, an opacity slider, a colour wheel, lasso, ruler, shapes; also text styles, free-placed text, stickers and flip (the owner's scope, ME10)
- The trim bar shows no frames along it; the handles show the frame they're on (ME14)
- The web's edited video records in real time, and plays muted where the browser refuses sound without a tap: that copy then has no sound (ME17)
- The web's edited video is re-encoded (WebM in some browsers, MP4 in others); phones keep MP4 (ME17)
- On iPhone Safari a saved video may be silent: by the time the copy is made, the tap no longer counts as allowing sound (media-editing audit 4; the export no longer hangs)
- A web export recorded in a hidden tab: requestAnimationFrame stops and frames freeze until it is shown again (media-editing audit 10)
- On Navigate, a moment's "kept here" toast and its Edit pill can show together (media-editing audit 13)
- A turned or cropped video has only play and pause, no scrubber or progress (media-editing audit 15)

## Deletion

- A phone's leftover files after a failed delete: no sweep yet, `removeMedia` (Clearing walks and moments)
- A thumbnail finishing after its moment went leaves its file, `media/thumb.ts` (Clearing walks and moments)
- A reminder check already running can write a recall back for a capture deleted mid-check, and a moment waiting in Undo can still fire (Clearing walks and moments)
- A day replay's "Watch again" still stops at a moment deleted during it (Clearing walks and moments)
- The replay card and the home's finds and checklist counts lag a delete until read again (Clearing walks and moments)
- Native legacy `file://` refs from an old container leak on moment and media deletes; a walk delete removes its folder (Clearing walks and moments)
- The home's reload after a delete reruns its whole load, `useOnDeleted` (Clearing walks and moments)
- On the web, a hidden page counts as the background, so switching tabs stores a waiting delete at once, `deletion/pending.ts` (Clearing walks and moments)
- A notification already shown for a deleted moment opens nothing (Clearing walks and moments)

## Map, walk screen and motion polish

- Native can't tell zoom from pan yet, so a zoom stops following there (Walk screen layout)
- Map layer order on native: no `beforeId` yet (v1.5 landing, native)
- No sounds yet (Polish: motion)

## Quality of life (in the owner's order, decisions 0063-0065; rounds 1-3 shipped)

1. Keep awake on a phone; adds expo-keep-awake (Quality of life, round 4)
2. GPX export (Quality of life, round 4)
3. The current street as a chip (Quality of life, round 4)
4. Dark mode (Quality of life, round 4)
5. The scale bar's miles mode at native's coarser 0.25-zoom view updates (Quality of life)
6. An audit pass over the quality-of-life rounds (the owner chose checkpoints instead; 0064)
7. Memory pins pick up a small copy made mid-walk only when their capture set changes (`memories.ts` sends only changed ids; QL26)
8. Edit note on Navigate's live walk, which opens no viewer (QL24)
9. ~~Captions are not sent on the capture bus~~: they are since Media editing (ME21, `captureEdits`)
10. The day replay repeats its "Summary of the day" announcement after a note is edited there (QL25)
11. Month headers keep last year's labels if the sheet stays mounted across New Year (QL28)

## Town outlines (TO1-TO12, decision 0083)

- Neighborhood outlines: Overture's are mostly districts ("Manhattan Community Board 5"); neighborhoods stay points, kept inside their town (TO6)
- Counties, states and countries from Overture: the Natural Earth pack does states, offline
- Outlines bundled for a first launch offline: until a tile is read once, its towns go by points (TO3)
- Where to read next on an exploring walk (`readCentre` in `useExplore`) still goes by points: the reads' candidates are stored without outlines
- A neighborhood inside an outline town that isn't listed on the Explore tab still shows on the open town's page (`townOf` answers none)

## Atlas grading (AG1-AG6, decision 0084)

- **Whole areas** (the owner's next slice): a town graded across its outline, a neighborhood across its share of the town (closer to its point than to any other); dots say how much the area holds; density as shading on the area's picture, per kind
- Distance weighting inside the ring (full credit to 400 m, nothing at 800 m): dropped by the owner in favour of whole areas
- A significance file per tile (Wikidata, QRank page views, heritage tags, Wikivoyage "see" listings): taken up by decision 0103 (Nov 5) as a static places archive on the Pages site, read by tile, significance as a gate only; QRank and page views stay out (popularity). The tiles' `rank` is a label order, not fame, so S23's idea of using it would not work
- Retuning `STEPS` against real towns
- A street-network catchment in place of the ring

## Town borders (TB1-TB9, decision 0088)

- Labels on borders: the base map's own town labels stay
- Tapping a region to open its town: the stars and tiles already do
- A dark map style for the borders: the app has one map style
- Chronicle's walked-town regions (TB3) and the walk screen's lines (TB4) have unit tests but no e2e check: a journey would need a placed walk seeded into storage
- On native the border layers can't go under the base map's streets (no road layer id): they sit over them, faint
- A town that crosses a z10 tile edge is framed only by the piece in the tiles read (`outlineTilesFor` takes the tile under each point; outlines are cut at tile edges), and a piece arriving later doesn't refit: the whole of a large city may not be framed. Fixing it means reading the tiles a town spans, the owner's call (fix explore-fit-area audit 4, Nov 4)
- The launch fix frames your 800 m ring even when a town's page was opened before it came (a town tapped while the location prompt is open), so that page loses its town frame (fix explore-fit-area audit 5, Nov 4)

## Discrete navigation (DN1-DN13, decision 0092)

- A bounce at the edge: with nothing that way the map stays still, with no rubber band (DN4)
- Towns on the page near you stay tiles: swipes there move between neighborhoods only (the owner's call)
- No touch-screen e2e for the swipe: the journey drags with the mouse; a finger's swipe on iOS Safari has not been tried
- A spoken cue when a swipe finds nothing that way: a screen reader hears nothing (discrete-navigation audit 12), as the eye sees no bounce
- E2e for the turned map, pinch, double tap and a touch-screen swipe on screen (the audit's test review): unit tests cover the direction and the zoom-gesture rules

## Explore atlas

- Green by park area (the share of the ring that is park): the decoder reads no park outlines yet, so green counts park places (decision 0066)
- Keep for later (planning) on an area's card, and whether planning gets its own tab (decision 0066)
- A walked area's tile showing one of your photos (decision 0066)
- Water on the mini-maps: no water layer is decoded
- The "?" marks and finds on the tab's own map, which the drawer had (finds moved to the cards)
- Rows of old builds stay until a purge, and every row (with its sketch) is read whole on each focus (explore-atlas audit 13)
- Ring reads fetch overlapping tiles again for neighbouring areas: no tile-level de-duplication (explore-atlas audit 6)
- Highlighting an area's dot on the small map as its tile scrolls to the top of the grid (atlas round 3, from the design review)

## Navigate, ready

- **A walk stopped from a second browser tab** while this tab's walk screen is up: the screen turns
  ready in place, and a walk started there keeps the stopped walk's per-screen reads (credited streets,
  the dead-zone nudge, the first-walk hint), so streets just credited show as fog (audit 13). Two tabs
  on one origin are rare; a remount on a new walk id would fix it.
- **Two pills at once overlap the scale bar at 375 wide** (the caption offer, then a memo discarded
  within 6 s): one pill clears it (audit 11).

## Functional core (slice 1)

- Rules for shells (take `Ports`, never import the singletons): with the first shell, the fog-refresh slice (functional-core spec, Open)
- The two core violations in `layers.baseline.json`: `format.ts` and `scaleBar.ts` read the global units as a default argument; pass the units in
- The device's timezone and locale are read in core (`getHours`, `toLocaleDateString` in `days.ts`, `walkTitle.ts`, `months.ts`, `explore.ts`): pass them in (functional-core audit 10)
- `components/map/types.ts` mixes pure helpers that tests import (`splitTrace`, `planViews`, `pressRadiusM`) with a hook, outside any layer check: move the helpers to a core module in `src/lib` (functional-core audit 13)
- **The SQLite capture table's dead columns** (moment table, decision 0123): `capture.walk_id`, `lat`, `lon` and `segment_id` stay after migration 22, unread and unwritten; dropping them means rebuilding the table, a second risk for no behaviour. A later migration may drop them.
- The Db contract found the web and native stores disagreeing; the fake follows the web store and the first two are pinned as "(web store as it is)" in `dbContract.ts`. Each needs the owner's call on which side is right:
  - `deleteMoments` deletes finds through the moments' walks on web, by moment id on native: a find filed under another walk survives on web (both pinned in the contract since MT11)
  - `getSegmentsIn` on web reads tiles around each piece's centre (bounds widened 250 m), so a piece much longer than 200 m that only grazes the bounds is missed; native compares bounding boxes
  - `startPause` / `startStill` at an earlier pause's start time replaces and reopens it on web; native's `INSERT` would fail on the primary key
  - `deleteMoments` with ids that don't exist: web clears reminders only for captures found, native for every id passed
  - `addFind` on web swallows every transaction error, not just the duplicate key
- `deleteWalk` / `deleteMoments` all-or-nothing (D6) has no contract case: nothing shared can make IndexedDB fail halfway

## Replay rhythm (RR1-RR22, decisions 0085, 0086)

- The rhythm's numbers are the prototype's defaults until the owner sends tuned ones; only `REPLAY_RHYTHM` changes
- Nothing picks a ceremony per walk or day yet: the registry holds the rhythm, the default
- The meta `day_watched:<key>` is still written but changes nothing in the ceremony (only the screen reader's steps read it)
- Highlights (starring a moment during the replay), as in the concept doc
- The trace is redrawn every 66 ms, so on a zip the line trails the walker by a short stretch (replay-rhythm audit 14)
- The Undo toast can sit over the clock for its 5 s after a moment is deleted mid-path (replay-rhythm audit, UI notes)
- **Videos under iOS's loading rule, beyond a plain card** (fix ios-video, Nov 5): the `chronicle` journey copies iOS's rule (no `readyToPlay` before a `play()`) for a plain video card only. Not covered: an edited or trimmed card (its view swap and the seek to the trim's start, audit 5), and a viewer opened by a tapped reminder on a video, which carries its time over when the sized view swaps in (audit 2). A journey with a video reminder and an edited, trimmed clip under the rule would cover both. Never tried in WebKit: whether a time set at `readyState` 0 holds, and whether the size probe's detached `<video>` ever reports its metadata on iOS (if not, an edited video shows unturned in the viewer, as before the fix)
- **Why Chronicle went white after Keep it** (Nov 4, the owner's iPhone): not reproduced in Chromium. The tabs now show `ScreenError` with the message; the cause waits for it. On a tab, its "Back to walks" goes nowhere (Chronicle is already the route, and only `retry` clears the boundary); Try again and the tab bar work (fix ios-video audit 6)

## Town presence (TP, decision 0089)

- A neighborhood's share of its town (the rest of "Whole areas"): neighborhoods keep the 800 m ring
- Finds and "Waiting to be found" on a graded town's card are drawn around its busiest pocket, not across the whole outline
- A mall's tenants still count as shops (needs footprints); a whole township reaches the top step of Shops and Food easily, so `STEPS` may want retuning for towns
- No e2e step shows "Busy areas": the fake grid has too little activity for a pocket, so the pockets are tested on real Overture fixtures (`pockets.test.ts`)
- Marks across a whole outline are stored in the profile as keys and spots; a very large city's list is uncapped
- The Undo toast (`insets.top + 64`) can cover the walk screen's Minimize row while a navigation bar shows (fix minimize-top-align audit 1; it overlapped before the top offset went from 12 to 4)
- The walk screen's top edge `sideInset` ignores `insets.left`/`insets.right`, so a narrow landscape device could put Minimize under a cutout; the e2e has no way to inject a safe-area inset (fix minimize-top-align audit 2, 4)

- The media editor's caption field types at 16 px on web so iOS doesn't zoom, so on a photo under about 356 px wide the bar is larger and may wrap differently while typing than in the saved file (fix editor-zoom audit 1)
- No test scans `src` for a `TextInput` under 16 px, and the e2e's photo is wide enough that the caption field is not enlarged in it (fix editor-zoom audit 4, 5)
## Spacing grid (fix banner-spacing)

- The floating UI (walk screen's banners, toasts, pills, cards; `ui.tsx` Banner and Button; Undo, Reminder and Confirm cards) is on the 4-point grid with a 16 pt screen-edge gutter (`GUTTER` in `components/walk/layout.ts`); `spacingGrid.test.ts` holds those six files
- The rest is not: 154 padding, margin and gap values off the grid across about 40 files (HomeSheet, AtlasCard, `(tabs)/index`, MediaEditor, CaptureView, RecordingBar, ceremony/*, MomentBar, ExploreSettings, WalkActions, StartSettings, KindStrip, AtlasTile, replay, chronicle, day, ...). Chosen by the owner: a `/slice` with spacing tokens and a spec, then widen `spacingGrid.test.ts` to every file
- `ReadyBar`'s 10 pt strip padding stays until then: `BAR_H` (69) is derived from it and the stack's geometry from `BAR_H`
- The owner's phone screenshot showed the walk overlay cropped at both edges in Safari; at 390 px the layout was already 12 pt from the edge, so a viewport wider than the screen is suspected and not reproduced (unverified on a device)
- Audit findings deferred (fix banner-spacing): the pills and scale bar sit at `sideInset + 12`, 4 pt further in than the 16 pt gutter, left as a step; horizontal safe-area insets (landscape notch) are not added to the gutter, as before; no e2e at 320 pt wide or for the nudge, spot card and Undo pill gutters; Button's and Banner's padding change reaches screens with no journey (settings, delete confirm); computed offsets (`edgeBottom + 7`) and radii are outside the grid test
- Web overlays still pad by the unfiltered safe-area `insets.top` that iOS Safari reports on web: the Atlas card grip (`AtlasCard.tsx`), CaptureView, MediaEditor, NoteEditor, MomentBar; the Explore map no longer does (`lib/mapTopInset`, fix title-chip-corner audit 1)

## Street labels (fix street-label-double)

- **Street name twice on a long street** (fix street-label-double, Nov 4): two areas whose peaks on one street are over 300 m apart still draw its name twice, apart rather than stacked. Deduping by the street's lines would need the strip's reach, not its peak.

## Test organization (decision 0091)

- Shells no unit test reaches (9 after test gaps round 1, Nov 4): `session` (the walk lifecycle; the rules call for a reducer), `explore/exploreRun`, `landing/read`, `atlas/read` and `activity/overture` (the explore reads; testing them needs a network-fetch port in `Ports`), `discovery/recallCheck` (reminders), `deletion/index` (its pending core is tested), `backlog` (it takes the map, the snap and the tile build) and `walkNav` (glue over `expo-router`). Each waits on the owner's call for its cluster.
- Every `src/app` and `src/components` file is covered by a journey row as of Nov 4 (`arch/features.test.ts` does not hold that; `check:affected` names a new screen no row covers when it changes). Shared primitives (`icons`, `ui`, `webStyles*`) ride on the `launch` row, a proxy: no journey checks them for themselves.
- A second mouse pan on the area card's grip never returned in the e2e (the `atlas` journey drags it with touch events instead; `docs/TESTING.md`, traps): whether a mouse pan after the spring-back blocks the page on the web is worth a look in the app (Explore atlas).
- Live criterion ids no test names (`npm run check:specs`, 28 of 533 after the test trim, Nov 5, counting only a test's name or a check's message, never a comment): 27 are in `scripts/criteria.baseline.json`, which only shrinks, and RR17 is device-only (`UNTESTED`). The trim retired twelve criteria whose text no longer matches the code (`specs/test-gaps/trim.md`). The 27 are named only in comments beside checks that test them in substance: each wants its check renamed or a test of its own.
- Coverage is a report (`npm run test:coverage [<feature>]`, TD2) with no threshold, in neither CI nor the hook; Node lists only the files a test loads, so a file no test reaches is missing from it, not at 0% (`check:affected` names those).
- `walk.tsx` triggers six journeys (`tabs`, `ready`, `marks`, `reload`, `gaps`, `hidden`): a split of the walk screen's own journey (ready, recording, capture) when it grows again.
- An e2e for the Home Screen hand-off (`navigator.standalone` plus an iPhone UA, a `location.href` spy): `openInMaps` imports `Platform`, so no unit test reaches it (fix pwa-maps audit 1; deferred at `--tests=lean`)

- **A self-referential `node_modules` symlink is tracked in git** (commit `16e54cf`, seen Nov 4 during fix busy-streets): it points at itself, so a fresh checkout has no dependencies until it is removed and `npm ci` runs. Untrack it and make sure `node_modules` is in `.gitignore`; left alone because it is not the busy-areas fix.

## Walkability (specs/walkability, decision 0093)

- **The grid's tiles say nothing about walkability** (WK11, the owner's call, 2026-11-04: the card only). Showing a line on every tile would read walkability for every ring listed.
- **The heads-up** (specs/walkability-headsup): no haptic or sound, and nothing for a walk with no route (both declined, 2026-11-04); not shown while a voice memo is recording is checked in code only, and WH12 (no data) is unit tested only.
- Routing that avoids car-oriented streets, and any "walk this way instead" (0022 defers suggested routes).
- Amenity, block length and intersection density as signals; street lighting, surface, slope, traffic volume.
- The replay's mention of a car-oriented stretch.
- Native credits for OpenStreetMap and Overture beside the layer (as AD16).
- A failed read is not retried by a timer: it is read again when the tile set changes or the switch is toggled (the reader's 2-minute wait only stops asking too soon).
- Overture has no "no sidewalk" tag; only Overpass tiles can say it (WK8b). A town where Overture is thin on sidewalks reads `mixed` more often than it should.
- **WK14's long press on a drawn stretch** (walkability audit 2): "Main Street · built around cars" was never built. The map's long press opens the spot card, so naming a stretch there is a navigation-flow call for the owner. The legend's tooltips name the bands meanwhile.
- **Overpass replaced by prebuilt data** (fix overpass-hardening, Nov 5): the lasting fix is to build the fallback's sidewalk facts from an OpenStreetMap extract into a static archive (the chronicles-data repo, decision 0096's pattern) and stop asking a public instance at all. The hardening (busy answers pause and grow, a session cap) bounds the load meanwhile.
- **A footway counts as the sidewalk of any road within 25 m** (walkability audit 12): a park path beside a trunk, or the sidewalk of a parallel street 20 m away, lifts a street to `mixed` or `foot`. Fixing it means giving each footway to its nearest road, a change to the band table (bump `WALK_CODE`).
- **`walk_tile` is never evicted** (walkability audit 13): rows live until the derived stores are cleared; a dense tile is hundreds of KB of JSON parsed on the main thread. Eviction by age is its own change.

- **Wards read as towns where nothing says otherwise** (fix ward-subdivision): Overture has no field separating a ward from a small village with no class and no population. A nested locality like that (Deer Park, IL, inside a township) is dropped, so a walk there is placed in the township (the owner accepted it). A ward whose point's tile has not been read yet is a town until it is (its id is then remembered in meta `outline_nested`).
- **Remembered ward ids never expire** (fix ward-subdivision audit 11): meta `outline_nested` grows by about 40 bytes per ward ever seen and is rewritten whole; a locality that later gains a class or population stays dropped. `purgeDerived` leaves it alone on purpose (clearing it would reopen the gap until tiles are decoded again). Fine for thousands of ids.

- **Resurfaced moments, round 2** (`specs/resurfaced-moments/spec.md`, Deferred):
  - **Search** and the map as a lens on its results: the next slice, on the same signals.
  - **Memo transcripts**: the seam is built (`ResurfaceOptions.transcript`, `transcriptExtractor`); the transcriber is not. It needs a native speech module and a development build, so threads read memos only once that exists.
  - **Photo and audio features** (what is in a picture): another `SignalExtractor`, no feed change.
  - **Replay this thread**: a thread played as one ceremony. The replay is a view of one walk's story (0086); a thread spans days and places.
  - **Finds and the lows** ("Passed ... without stopping") in the feed: they are derived rows, not captures.
  - **A thread from more than one word** (a phrase, a meaning), and languages other than English (the stop-word list in `terms.ts`).
  - **A nudge** ("a year ago today") as a local notification.
  - **A memo played in its card**: a card opens the viewer, which plays it, so a browser's sound rule is met by the tap.
- **The Map section keeps its camera across tabs, but not the sheet's height** (resurfaced moments audit 8): the camera and the framed places are kept in the section store while the app is open; the sheet comes back at its resting height.
- **Placing old walks waits for the map** (resurfaced moments, RM1): the pass that places walks without places (`lib/backlog`) reads them through the home map, which is mounted only for Walks, Days and Map. With Chronicle opening on Memories, a walk made before places existed is placed the first time one of those sections opens. Memories needs no place for its words, so nothing shows wrong; its cards simply have no place line until then.
- **Resurfaced moments audit** (`specs/resurfaced-moments/spec.md`, Audit):
  - **Other languages, "buses" and "bus", the `fall` alias** (audit 6): `terms.ts` is English only; a Spanish note makes a thread of "los". A language-aware stop list and stemmer is its own change.
  - **Android's Back on a thread** (audit 14): a thread is local state, not a route, so Back leaves Chronicle. Native, unverified.
  - **A cliff at the "too common" rule** (audit 15): at ten moments a term in five stops being a thread. A smoother rule needs the owner's idea of "too common".
  - **Merging with main** (audit 16): main wraps Chronicle in the tab `ErrorBoundary`; the new default export must sit inside it after the merge.

## Map layers and walkability by urban form (specs/map-layers, specs/walkability-urban-form, decisions 0096, 0097)

- **The places lift (UF6) is untuned**: 150 weighted places per km² is a starting value with no real places fixture behind it.
- **The thresholds rest on five places** (`walk/form.ts`); a sixth can disagree. A way to look at the cells (a debug overlay of the signals) is not built.
- **Cells are 250 m squares**: coarse at close zoom. Smoothing or a finer grid is a look-and-feel call for the owner once seen on a phone.
- **The tint reads about 1.5 km around the map's centre** (a cell needs its whole neighbourhood read), so it fades out near that edge.
- **Busy streets draw only for remembered areas** and for the one read when the layer is switched on; a very large view shows only what is near.
- **The unwalked-streets toggle, fog, "?" marks and routes are not layers yet** (the owner chose only walkability, busy streets and town borders).
- **Layer options** (a busy-grade slider, a tint choice), **ordering and opacity** are not built.
- **The long press on a drawn stretch (specs/walkability WK14) is retired**: the layer draws areas, not stretches. A long press on a tint is its own call.


## Vision gate (specs/vision-gate, decision 0094)

- **Not checked by script:** tone, accent colours, celebration and motion, a capture moved behind a tap, a moment shown without its context. The steward and `/vision review` cover them; the replay's card keeps its own e2e scan for a large number and an accent colour.
- **The copy heuristic is lexical:** copy built across several literals, or held in a constant with no space and a lowercase start, is not read; JSX text next to code with `;` or `=` is skipped.
- **Explore's layers follow the selected area or you, not the panned map** (UI audit 7): pan away and the tint and busy streets are not there, with no cue.
- **The Layers button is off-screen in a short landscape web window** (UI audit 10, web only; native is portrait).
- **The heads-up is not announced by VoiceOver or TalkBack** (UI audit 12): `accessibilityLiveRegion` is Android-only and a node that mounts filled is not announced on the web; native needs an explicit announcement.
- **Escape also closes an open atlas card or capture viewer** in the same keypress as the Layers panel (UI audit 13).
- **Street-named neighborhoods** (the owner, Nov 5, after "7th Street" was listed as a neighborhood of Allentown): OpenStreetMap names a real neighborhood "7th Street" (Overture's divisions carry it beside "1st Ward", "East Side"), and the tiles' place points bring it in as a neighborhood. The owner chose to leave it. Nothing in `tilePlaces.ts` filters by name; the options weighed were dropping names that end in a street-type word (English suffixes, a re-list with `ATLAS_CODE` a7 and `AREA_RULES` 4) or dropping a name only when the area's own street read has a street of that name.

- **Layers button, corner (fix layers-corner audit, Nov 5):** the panel's clearance under the top overlay is a fixed `insets.top + 152`, so a banner plus the navigation bar plus a long chip could still reach it; below 360 px wide the panel floors at 188 and can touch the capture column; the corner button is reached by keyboard after the right-column buttons; the corner's `left` is written in `layersCorner` and in the scale bar's inset separately.
- **Memories in context, audit** (`specs/memories-context/spec.md`, Audit): the time of day is by the phone's zone now, not the zone the moment was made in (needs a stored zone on the capture, a migration, audit 19); Android's hardware Back from Hidden (and from a thread) closes the tab instead of the screen (native); VISION.md's open questions 1 and 5 (who may volunteer a moment) still stand, now with a switch to turn volunteering off.

- **Navigation bar on the top row (fix nav-top audit, Nov 6):** the Undo toast sits at `insets.top + 64`, just under the bar, so it can cover the street chip or a notice shown there (audit 2); the Layers panel's `clearTop` (`insets.top + 152`) is shorter than a stack of notice, street chip, off-route chip and status chip under the bar (audit 3); a notice and the street chip move from the Minimize row to under the bar when navigation starts or ends (audit 4); a notice that carries an Open in Maps action would repeat the bar's own button (audit 5). Not run on a device.


## Network rules (decision 0100)

- **Switching a host off remotely:** the off switch is in the code's host table; the `chronicles-data` manifest, which the app will read daily, could carry it so a misbehaving service can be stopped without a release.
- **The decode check for Overture's divisions and transportation:** only places are checked before a new release is relied on; town outlines and walkability read the same release without it.

## Places worth the stop (decision 0103)

- **OpenStreetMap in the weekly build:** the build takes an OSM export to corroborate (a `demolished:` tag removes a place; since RP2 and RP5, a visitor's tag shows a listed place open and `access=private|no` keeps it out), but the weekly job feeds it Wikidata only: an OSM extract of the US is large for a runner, and the public Overpass blocks cloud ranges. the handoff's Overpass query asks only for elements with a `wikidata` tag.
- **Classes not yet pinned:** historical markers (no Wikidata class with real use), petroglyphs (archaeology, not an oddity), water towers and rock formations (too broad), time capsules (the lookup's match looked wrong). Each is a deliberate change to `classify.mjs` and ARCHIVE_CLASSES.
- **A line on why a place is worth the stop, Wikivoyage, the one-of-a-kind shops tier, the scenic routes' Sights leaning (PW18 pins it unchanged).**
- **From the slice's audit (Nov 6), deferred:** the manifest's region box is the archive's data bounds, which cover much of Canada and northern Mexico, so a read there asks for US tiles (F7: give a region its own boxes); a new `archiveEdits.json` reaches an area only when the archive version changes (F8); routine Wikidata edits change the archive's bytes almost every week, so every client rebuilds areas and re-reads rings weekly (compare a content hash of the places instead of the file's bytes); the weekly job installs the whole app for two packages; `KEEP: 3` counts releases across regions; a private app repo needs `APP_REPO_TOKEN`.

## Places pipeline (decision 0108)

- **The pipeline's deferrals live in chronicles-data** (its docs/spec.md, Record): town and city pack entries,
  GeoParquet and DuckDB, the Overture, OSM and nominating adapters, the ODbL question, conditional requests, R2.
- **The app takes a new contract by hand:** the pinned copy (`src/lib/__tests__/explore/contract/`) is copied from
  chronicles-data when its contract version changes; PP17 fails until then. No script fetches it.
- **Hiding a map-tile place:** the owner's edits no longer reach places from the map's own tiles (decision 0108,
  later the same day). Nothing replaces that yet; the edits file was empty.

## Remarkable and public (RP1-RP20, decisions 0109-0111)

- **Remarkable and public's data side is built in chronicles-data** (its remarkable-and-public spec, RD1-RD14, Nov 10): the listing rule, OSM's corroboration over Geofabrik's extracts and osmium, the ODbL pack, contract v2. Its OSM fetch has never run (the first weekly build runs it); RP1-RP7, RP10 and RP12 are tested there.
- **OpenStreetMap's signals in production:** RP2 (shown open by an OSM tag) and RP5 (`access=private|no`) act only once the weekly job passes the build `--osm`, built from the Overpass query of `specs/remarkable-and-public/handoff.md` (only elements with a `wikidata` tag, so far smaller than a US extract). Until then, a listed house or building is shown open only by its Wikidata type, and none is kept out as closed.
- **Places only OpenStreetMap knows** (the Bethlehem Steel blast furnaces' own feature): the owner's call, corroborate only (0110); adding them makes the archive a derived ODbL database.
- **Contributing buildings of a listed district:** a church inside a listed district with no designation of its own in Wikidata (Central Moravian Church, in the Historic Moravian Bethlehem Landmark district and World Heritage site) is not lifted past the name rule. A public-type place inside a Landmark district could be; the owner's call.
- **Registers outside the US:** Zurich's 199 listed misses are on Swiss registers; another region is the same rule with its register's id.
- **From the audit (Nov 9), deferred:** the review's atlas History step before and after per test area (audit 3: the build reads no tiles; the benchmark could compute it); the reach line under a "?" reads beside "Walk within 60 m to see what it is." as two instructions (copy, the owner's); whether "Buildings and structures" should ever take unlisted structures (OSM `man_made` bridges, towers, mills), so it names a type rather than standing in for a register (steward S3, rejected for now); whether a find should invite a capture at a Landmark private house (the steward's silent question).
- **Wikidata's "tourist attraction" class** is not read (it holds businesses, events and tours); the tiles' `tourism=attraction` covers attractions (RP13).
- **The noise review covers named test areas**, with a per-class summary for the region; thousands of listings nationally are reviewed only as counts.

## Wrapped map names (fix long-names audit)

- **No line cap:** a very long name (60+ characters) wraps to many lines under its pin and can cover neighbouring pins. The owner asked for names not to be truncated, so no cap was added; a cap is the owner's call.
- **Busy-street label shifts up when it wraps:** `StripLabel`'s marker is centre-anchored, so its first line moves about 8 px up per extra line. Cosmetic; check on a device.

## Threads the owner makes (decision 0104)

- **A loose moment has no place in words** (owner-threads audit 2): only a walk has an area name, so a reply or any moment made outside a walk shows its date in a thread, the picker and Lately, and a thread headed by one is headed by a date. Words for where a moment was need an area lookup for a single fix, a decision of its own.
- **A reply's "answering" line in the walk, the day and the map** (owner-threads audit 1): it shows in Lately and in a thread; the replay, the day's timeline and the pins do not carry it.
- **`applyThreads` does not check that a member's moment still exists** (owner-threads audit 7): the shell checks just before the write; a delete in that one round trip leaves a member row for a moment that is gone, which the screens ignore and the next `deleteMoments` cannot clear. A check inside the transaction is the fix.
- **A thread cannot be kept quiet from the resurfaced card** (OT23, the owner's call, Nov 6: it resurfaces like any moment, with no thread name). A per-thread "keep quiet" switch is the cheap way to add one if a thread turns out to be one the owner does not want brought back.
- **A moment of a walk still open is not offered by the picker or listed in a thread** until the walk stops (`toMomentViews`), as in Lately (RM3).
- **The moment picker lists the newest sixty matches** and searches only a moment's own words (notes, captions); memos have none until they are transcribed (0098).
- **A place-rooted journal**: a thread with no moments, started top-down and rooted in a place. Out of the owner-made threads slice by the owner's call (a thread comes only from connecting moments that have their own time and place). It would be its own feature and goes through `/vision` first.
- **A failed resume drops the paused reminder** (fix pause-banner audit 2, Nov 9): the error notice replaces the "Paused for N min" one, and `remindedFor` keeps it from coming back, so the walk stays paused with no banner. Predates the fix; low.

## Storage awareness (SA1-SA10, decision 0107)

- **Apple's "available for important usage" capacity**: it counts what iOS can purge for a user's save, so it reads closer to Settings than `Paths.availableDiskSpace` (the plain free size, which reads low). Needs a native module; the owner chose Expo first (Nov 9).
- **Caps on the caches that can be rebuilt** (`walk_tile`, old builds' rows, remembered ward ids, above): the only "limit" the vision allows; the owner asked for limitations too, so this is next if the room keeps running low.
- **Held captures live in memory**: leaving the screen or a reload drops a held photo or video (Stop warns first). Keeping them across a reload needs the file kept somewhere that survives, which a full disk may refuse.
- **Retry on the recording bar's camera** (other tabs, NV9): it shows the SA9 words; the held pill is on the walk screen and Navigate, ready.
- **A check before a video starts**: the system camera owns the recording; the line beside the captures says it beforehand.

## Explore's map points (fix pins-selected-only, Nov 10)

- **A town's page with its own tile selected names nothing on the map** (audit 2): the town's pin is not drawn there (one level only, fix map-levels audit 1), and the neighborhoods are dots. The page title, the wide tile and the border name the town. Drawing the town's pin as the lone named one would mix levels again; the owner's call.
- **A dot has no accessible name and no tap** (audit 3): area points are `aria-hidden` with pointer events off on web and carry no label on native; the live region and the grid's tiles name areas. Predates the fix (dots were already unnamed), now more of them.

## UI patterns and the UX research (decision 0114)

- **Research gaps** (after the second pass, Nov 10, with the hosts allowed): Polarsteps and the app-store pages refuse automated fetches, so their teardown claims stay unverified; M3 has no page on photo or video viewers; the Apple HIG was read once (first pass) and not re-checked.

## UI conformance (`specs/ui-conformance`, decisions 0114, 0113)

- **Tap to hide on a video:** a video's own controls take its taps, so its bars stay up; hiding them over a playing video is its own change.
- **Hiding unavailable menu items vs disabling them** (M5: the HIG hides, M3 and NN/g disable): not touched.
- **What a delete frees** ("Moment deleted · about 3 MB", the steward's question): the walk's and the media's confirms still say it; the pill does not.
- **A recoverable trash** (Recently deleted, as Photos and Google Photos have): a killed app now completes a waiting delete (0113); a durable trash would change the data model and is its own slice.
- **The reminder editor's chip rows wrap at 390 px** (`specs/ui-conformance` audit 25, the `ux-reviewer`'s U4): "How often" and "Until" are rows of four chips each; the patterns say a single choice from a short list is a menu (matrix 15). Fix: two labelled rows ("How often: Once ▾", "Until: No end ▾"), each opening a menu. The editor predates the slice.

## Places out of town (specs/places-out-of-town, decisions 0115-0120)

- **The whole slice, OP1-OP20, is queued** (the owner, Nov 9-10): the places archive went live first (PW16, Nov 10), and its archive phase is re-planned as adapters in chronicles-data's places pipeline (0120) before the slice starts. Its criteria are `deferred` in `UNTESTED` (`scripts/features.js`) until then.

## Permission refusals (fix mic-settings, Nov 10)

- **The minimized recording bar says "Camera access is off for Chronicles." with no Settings button** (`RecordingBar`): the whole line is one Pressable that returns to the walk, so a nested button needs a layout decision. The walk screen, Explore band, ready screen, moment viewer reply bar and planner offer it.

## Explore carousel (EC1-EC20, decision 0124)

- **Tapping a dot on the map to select its area**: dots stay inert, as before; selecting is by the row, a map swipe, an arrow key or a card.
- **A wide card for a town** with its own sketch: a town's card in the row is the same card with a "See its neighborhoods" footer.
- **The row's peek width on very narrow screens** beyond the clamp (78% of the width, at most 320 px).
- **The map's swipe report still carries the framed middle and metres a pixel** (`WalkMap`'s `onSwipe`), which only the retired directional step read; the screen takes only the drag. Trimming it touches both maps.
- **The Busy names' zoom (13) and ring (800 m) are first guesses** from the owner's screenshot; the e2e world has no busy streets, so only the unit tests hold the rule.
- **Selecting a town on the page near you frames its reach (0.6 of it), not its whole outline**; a town's own page still frames the border.
- **Dragging the row with a mouse on desktop web** (explore-carousel audit 1): react-native-web's horizontal scroll takes the wheel (shift) and touch, not a mouse drag. A desktop reader steps by a tap on a card, the map's swipe or the arrow keys. A web-only drag-to-scroll would be a web exception (ARCHITECTURE).
- **A selection moved by a re-list is neither eased nor announced** (explore-carousel audit 5): the first card changes when Locate or the fix reorders the row; the ring and card move together and the map still frames the page's areas.
- **Native: a row remounted with a card past the first selected** (explore-carousel audit, native): `scrollTo` before layout may be dropped, leaving the row at the first card with another selected; and the row in a right-to-left layout is not mirrored.

## Moment references (`specs/moment-references`, decision 0125)

- **@ in the capture stack's quick note** (Navigate, the walk and the Memories band): those notes are their own inline composers, not `NoteEditor`; a mention there needs the picker drawn over each. Write the note, then Edit it to mention a moment.
- **A mention's words are those it was written with** in plain text: a moment renamed or placed later still reads its old words outside the viewer, whose card looks it up live.
- **Mentions from a note to a note opened from a mention** stack in the viewer without a limit; Back pops one at a time.
