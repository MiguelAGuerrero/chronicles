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
- A dismissed stretch can't be brought back, `gap_fill` (Filling gaps)

## Explore and discovery

- An index for Offered; it's read whole, fine for thousands (v1 discovery)
- An unstamped capture can't find a place: it has no position until stop, `findFor` (v1 Explore)
- A place moved by a new build can be found twice (v1 Explore)
- The pocket alert likely needs the screen on (native), `explore_haptic` (v1 Explore)
- The home preview ignores the kind switches and doesn't restore the view after (v1 Explore)

## Reminders and notifications

- Clearing reminder flags whose capture is gone, `discovery/recall.ts` (Remind me here)
- Remind me here firing outside a walk; needs background location (Moments and days)
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

## Quality of life (in the owner's order, decisions 0063 and 0064; rounds 1 and 2 shipped)

1. Renaming a walk later (Quality of life, round 3)
2. Editing a note's text (Quality of life, round 3)
3. Photo thumbnails on pins (Quality of life, round 3)
4. Month headers in the walks list (Quality of life, round 3)
5. Keep awake on a phone; adds expo-keep-awake (Quality of life, round 4)
6. GPX export (Quality of life, round 4)
7. The current street as a chip (Quality of life, round 4)
8. Dark mode (Quality of life, round 4)
9. The scale bar's miles mode at native's coarser 0.25-zoom view updates (Quality of life)
10. An audit pass over the quality-of-life rounds (the owner chose checkpoints instead; 0064)
