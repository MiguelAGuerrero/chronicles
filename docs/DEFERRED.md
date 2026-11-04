# Deferred and open

Everything AGENTS.md marks deferred, open or not yet done, in one ledger, grouped by area; the source section is in parentheses.
An item leaves only when it ships, or when it is rejected with a decision record in `docs/decisions/`.

## Product (open in the concept doc)

- Two things are named Explore: the tab and the walk's mode (Positioning, open in the doc)
- Whether the replay keeps its "Passed …" low, now in words since U13 (Positioning, open in the doc)
- What the Explore tab lists in a city where AllTrails lists trails (Positioning, open in the doc)
- The Explore tab's "interesting ways through an area", listed as later (Positioning, three tabs)

## Navigation and routes

- Suggested routes: routes to a destination with detours shaped by preferences (streets with life, things worth seeing), their own later slice, decision 0022 (Positioning)
- Explore's route preview and "Walk this way", with suggested routes (Positioning)
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
- The pocket alert likely needs the screen on (native), `explore_haptic` (v1 Explore)
- The home preview ignores the kind switches and doesn't restore the view after (v1 Explore)

## Reminders and notifications

- Clearing reminder flags whose capture is gone, `discovery/recall.ts` (Remind me here)
- Remind me here firing outside a walk; needs background location (Moments and days)
- The reminder bell in a second web tab: a reminder fired or stopped in one tab leaves the bell in the other until a reload; `tell()` is per JS context (Reminder bell, audit 5)
- Native: the pin's Marker is re-keyed when its bell changes, so a photo pin shows its icon for a moment; the web redraws in place (Reminder bell, audit 4)
- The "in front" rule stays per transport: a phone lists background notices quietly, a browser has no list, `NoticeTransport` (Notifications)
- The Android channel's importance is DEFAULT, so the test may not pop up as a banner (Notifications)
- Unit tests of the web transport, `notify/transport.web.ts`; the e2e drives the real service worker (Notifications)
- Old `ambient-` notices are cleared at stop for one more release; drop that clear after it (Notifications, after the audit)

## Moments and days

- Quick capture outside the app: widget, lock screen, share sheet (Moments and days)
- Moments in a place's stars (Moments and days)
- The home reads every capture row on focus; per-day counts would need storing (Moments and days)
- Moment pins filtered to the viewport, `MOMENT_PIN_ZOOM` (Moments and days)
- "Today" refreshing past midnight without a focus, `lib/days.ts` (Moments and days)
- A day of only placeless moments replays over the world map, `dayPlan` (Moments and days)

## Captures, media and export

- Backing up a walk: `lib/export` and `writeWalkBundle` stay, but nothing in the UI reaches them, decision 0007 (Product, backing up)
- There is no import of the backup bundle yet (Round 3, the backup zip)
- The backup bundle leaves still spells out, `Still` (Round 3, motion audit)
- The backup bundle leaves gap decisions out, `gap_fill` (Filling gaps)

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
9. Captions are not sent on the capture bus, so another open view of the walk shows a new caption only after a reload (QL25)
10. The day replay repeats its "Summary of the day" announcement after a note is edited there (QL25)
11. Month headers keep last year's labels if the sheet stays mounted across New Year (QL28)

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
- **The walk's settings panel** (`ExploreSettings`, from the walk options) still covers the stack while
  open; it is a sheet with its own Cancel (audit 5).

## Functional core (slice 1)

- Rules for shells (take `Ports`, never import the singletons): with the first shell, the fog-refresh slice (functional-core spec, Open)
- The two core violations in `layers.baseline.json`: `format.ts` and `scaleBar.ts` read the global units as a default argument; pass the units in
- The device's timezone and locale are read in core (`getHours`, `toLocaleDateString` in `days.ts`, `walkTitle.ts`, `months.ts`, `explore.ts`): pass them in (functional-core audit 10)
- `components/map/types.ts` mixes pure helpers that tests import (`splitTrace`, `planViews`, `pressRadiusM`) with a hook, outside any layer check: move the helpers to a core module in `src/lib` (functional-core audit 13)
- The Db contract found the web and native stores disagreeing; the fake follows the web store and the first two are pinned as "(web store as it is)" in `dbContract.ts`. Each needs the owner's call on which side is right:
  - `deleteCaptures` deletes finds through the captures' walks on web, by capture id on native: a find filed under another walk survives on web
  - `getSegmentsIn` on web reads tiles around each piece's centre (bounds widened 250 m), so a piece much longer than 200 m that only grazes the bounds is missed; native compares bounding boxes
  - `startPause` / `startStill` at an earlier pause's start time replaces and reopens it on web; native's `INSERT` would fail on the primary key
  - `deleteCaptures` with ids that don't exist: web clears reminders only for captures found, native for every id passed
  - `addFind` on web swallows every transaction error, not just the duplicate key
- `deleteWalk` / `deleteCaptures` all-or-nothing (D6) has no contract case: nothing shared can make IndexedDB fail halfway
