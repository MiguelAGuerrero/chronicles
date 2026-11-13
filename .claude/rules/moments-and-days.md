---
paths:
  - "src/lib/{days,useLocate,momentPins}.ts"
  - "src/lib/locate/**"
  - "src/app/day/**"
  - "src/components/MomentBar.tsx"
  - "src/components/chronicle/MemoriesBand.tsx"
  - "src/lib/captureBand.ts"
  - "src/lib/__tests__/moments/**"
---
# Moments and days

Captures outside a walk (moments), locating one fix for them, the days list and the day replay. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

- **A capture is a moment that may belong to no walk** (the owner's call, Nov 1:
  "jot it down" in a store, not only on walks). `Capture.walk_id` and
  `Find.walk_id` are nullable: SQLite migration 11 rebuilds both tables
  (SQLite can't drop NOT NULL in place) and adds `capture_t`; IndexedDB v10 adds
  the capture `t` index. `db.momentsBetween(from, to)` reads by time. Since decision 0123 a moment holds its media as pieces (`Moment`, `lib/moment.ts`); screens read `Faced` moments, one per moment.
- **Days are never stored** (`lib/days.ts`, pure): local midnight to midnight,
  a walk in the day it started with all its captures, open walks and captures
  of unknown walks left out. Days use the phone's current time zone (accepted).
- **Capture from the home** (`MomentBar`, `useCaptures(null, …, { loose: true })`):
  a moment is stored at once and placed when its one fix arrives
  (`placeMoment`), so a save never waits on GPS. `lib/locate` watches until a
  fix ≤ 50 m or 10 s, then clears the watch: nothing tracks between moments
  (the owner's rule: no all-day tracking). Media of loose moments go under
  `walks/moments/`. A loose moment finds no place by itself (decision 0155).
- **Capture from Chronicle** (HC6-HC15, decision 0112): Memories mounts `MemoriesBand`
  (`components/chronicle/MemoriesBand.tsx`), a `MomentBar` with `layout="band"` and
  `idPrefix="band"` (`band-photo`, `band-voice`, `band-note`, `band-toast`, ...); the pure
  decisions are `lib/captureBand.ts` (`bandLayout`, `captureTarget`, `bandLabels`,
  `momentToast`, `barCamera`). The band layer is the first child after the options
  button (screen-reader order, HC8) and drawn at the foot with `zIndex: 2`; every list
  pads its foot by the band's height, and Memories' Undo toast sits above it (HC15).
  With a walk open, only `WalkBand` reads `useOpenWalk()` (the live trace), keyed by the
  walk's id, so Memories isn't re-rendered by every fix; its captures are the walk's
  (`useCaptures(walk.id, here, lastFixAt)`) and say "saved to your walk", since Lately
  leaves out an open walk's moments (0098). `focused` is false while a viewer, a menu or
  a reminder is open over Memories, so a memo is saved before anything plays (HC11).
  Trap: in the headless e2e a fixed location never refreshes the walk's last fix, so a
  walk capture waits for its place until stop unless the journey steps the position.
  After the audit (capture-from-chronicle audit 1-12): Memories' Undo toast and the band's
  error go in the band's pills column (`above`), one flex column, so nothing covers anything;
  the band's strip takes its own taps (`pointerEvents="auto"`), never a card beneath; inside a
  thread or Hidden the band follows the screen, so its Back comes first; every viewer on Memories
  waits while the band's memo records (`memoOn`); the band waits until the keeper knows
  (`captureTarget(walk, known)`); the web's error has no Settings button. A photo or video being
  kept is tracked by `memoGate.keep`, and the bar's Stop waits on `memoGate.kept()`.
- **The home** reads every capture row (never media) for the days list, which
  widens the old "walks, summaries, Area, WalkArea only" rule. The sheet has
  Days beside Walks, a day's timeline (a walk is one row), and Replay this
  day. Placed loose moments are pins from z11 (`MOMENT_PIN_ZOOM`).
- **Moment pins on both tabs** (M16 after the tabs split; moment pins 1-3, Nov 3):
  `lib/momentPins.ts` (pure). Navigate (where moments are made) reads every
  capture row on focus, keeps `placedMoments`, adds one as its fix places it
  (`upsertMoment`, from `onMoment` 'placed'), and draws them from z11; a pin
  opens `CaptureViewer` (caption, edit note, remind, delete), and does nothing
  mid-memo. Its `onViewChange` sets only a boolean, so it re-renders only when
  the zoom crosses 11. Chronicle's fit is `fitWithMoments(places, captures)`:
  a moment made before any walk, or far from them, is framed (150 m around),
  where it once sat at world zoom with its pin hidden. A minimized walk's
  live view still shows only that walk's captures. Moments spread wider than
  z11 still show no pin and no star (moments in stars stay deferred).
- **The day's replay** (`app/day/[key].tsx`, `dayStory`, RR16): the day's story
  told by the same ceremony as a walk's: from one moment or walk to the next in a
  straight line ("N h later" when more than 15 min pass), each walk's own path and
  breaks, a placeless moment where the map is; a quiet card ("N moments · P
  places", places are spots 100 m apart). Nothing waits for a tap; meta
  `day_watched:<key>` now only makes the screen reader's steps move on by
  themselves. No notification ever suggests watching.
- **After the audit:**
  - The home's capture row stays mounted while the sheet or a spot card is
    up (hidden, never unmounted), and mid-memo the sheet, stars, pins and
    long press do nothing, so a memo is never cut short.
  - A moment is reported twice (`MomentState`): 'kept' at once, so the days
    list shows it, then 'placed' or why not. The home merges only lat/lon.
  - Location is asked only after the camera permission resolves (two prompts
    at once fail on Android). The web's 10 s starts once the permission prompt
    is answered (capped at 60 s). Native refuses a cached fix older than 15 s.
  - The day replay reads only its day (`dayStart` to `nextDayStart`, so DST
    days are right) plus its walks' captures; a long way between entries pulls
    the camera back to show it (audit 7, now the rhythm's travel), and the day
    is not marked watched when Skip reached the card.
  - A group begun by a placeless capture takes the first placed member's spot
    (`groupCaptures`, walk replays too). A loose moment's reminder rests 2 h
    (`looseRestMs`) so a walk started on the spot doesn't fire it at once.
- **Deferred:** quick capture outside the app (widget, lock screen, share
  sheet); Remind me here firing outside a walk (needs background location);
  moments in a place's stars; the home reading every
  capture row on focus (rows are small; per-day counts would need storing);
  moment pins filtered to the viewport; "Today" refreshing past midnight
  without a focus; a day of only placeless moments replays over the world map.
- **Native** (unverified on a device): migration 11, `locate/index.native.ts`,
  the home's capture row.
