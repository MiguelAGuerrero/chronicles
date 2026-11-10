---
paths:
  - "src/lib/__tests__/walk-screen/**"
  - "src/app/walk.tsx"
  - "src/components/walk/**"
  - "src/lib/readyNav.ts"
  - "src/components/{Ticking,MomentBar,MemoryPreview,OpenWalk,ConfirmCard,ReminderCard,RemindEditor,ui}.tsx"
  - "src/lib/{useCaptures,walkNav,walkGate,memoGate,useLiveTrace,walkEvents,recordingBar,walkMotion}.ts"
---
# Walk screen

The walk screen (`src/app/walk.tsx`), which is also Navigate, ready: its layout, capture stack, pills, edge buttons, the ready bar and voice-memo controls. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

- **Navigate is this screen, and it is one screen** (NR1-NR13, decision 0076; the owner, Nov 3: "one
  in the same", not a separate context from the walk's). `WalkRoute` in `walk.tsx` renders `WalkScreen`
  once the keeper knows; the walk is the keeper's open walk (`useOpenWalkInfo`), kept by id in state.
  With none, the screen is ready: `useReady` (`components/walk/useReady.tsx`) gives the one `WalkMap`
  its props and draws the ready overlay (chevron, banners, Locate, the moment stack, the ready bar). The
  map sits at one place in the tree in both states, so Start never remounts it (the e2e marks the canvas
  and finds the same one after Start). Start records in place: `useStartWalk().start(..., { inPlace:
  true })` writes the plan's meta while the screen holds the ready state (`holding`; the walk reads
  `explore_walk` as it shows), then the walk's overlay takes over and the notice says it is recording.
  Stopped, the walk stays on screen (`ended`) until the replay replaces it. The chevron, Minimize and
  Back go through `exitPlan` (back to the tab beneath, Explore when there is none). `walkScreenShown()`
  is the route's, so the gate holds in both states. `useReady` reads its choices and one fix only while
  no walk is open (`active`). Its effects are the `ready` shell (`lib/ready/shell.ts`, tested with
  `fakePorts()` in `readyShell.test.ts`; the app's instance in `lib/ready/index.ts`), so the view imports
  no db or recorder (functional core, FC5).
- **One geometry for both states** (`components/walk/layout.ts`, `useStackLayout`): the strip is
  `BAR_H` (69) above the safe area; the captures are a column of 56 pt buttons at the right edge
  (camera nearest the strip, then mic, then note), inside the 640 column; the 44 pt edge buttons sit
  above them in the same column (Locate on the ready screen where Recenter sits on the walk, then
  unwalked streets, then walk me back). The ready bar at rest is the strip, at its height, with Start
  where Stop sits. The e2e checks the boxes match across Start.
- **The Layers button is in the bottom-left corner** (fix layers-corner, Nov 5, the owner): a 44 pt button just
  above the scale bar (`layersCorner`, `lib/stackSlots.ts`), not the right column's top, where the navigation
  bar's End button sat under it. The column has four edge slots and the compass is its top; the pills sit above
  the button (`pillsBottom`). Its panel opens to the button's right, bottom level with it, growing upward
  (`cornerPanelBox`, `lib/layers/layout.ts`), stopping short of the capture column and the top overlay; it
  paints over the pills while open and closes on a tap on the map. Explore's button is still anchored from the
  top. Not run on a device.
- **The scale bar's inset is measured from the map's own bottom, which differs by state** (fix layers-pad, Nov 5): on the
  ready screen a spacer holds the strip's place, so the map ends at the strip's top; on the walk it runs under the strip.
  `scaleInsetBottom` (`lib/stackSlots.ts`) says which; passing the walk's value to the ready map hid the bar behind the
  Layers button. The panel's rows are padded 8 px (`rowPad`); at 12 "Town borders" wraps at 360 px wide. The `layers` journey
  measures both (the button clears the bar, rows keep off the edges, labels stay on one line).
- Capture controls are one component, `CaptureStack` (`components/walk/CaptureStack.tsx`), given ids
  and handlers: `moment-*` on the ready screen (moments, `MomentBar`), `cap-*` on the walk. Time,
  distance and hold-to-stop stay in the thin strip at the very bottom, with Stop at the right end.
- Why low and at the right edge: Hoober's touch research puts the most accurate taps near the centre
  and the least at the edges and corners, which is why the row was centred (0008). The owner chose
  AllTrails' look instead (Nov 3, 0076): AllTrails floats its map controls at the right edge, as Google
  Maps does at the bottom right. The stack keeps them low, above the strip, out of the corners.
- Text is kept to a minimum. There is no header or "Recording" label, because the
  growing trace shows a walk is on. A status chip appears only when something is
  wrong: waiting for GPS, weak GPS, or not recording.
- Captures are pins on the map, on the walk screen and on the replay card. The map
  groups them itself by screen distance (`useZoomPins`: pins within 44 px at the
  current zoom share one, showing the count), so they never pile up when zoomed out.
  Pins are anchored at their stem's foot, so the walker's dot stays visible. Tapping
  a pin opens its captures in `CaptureViewer`.
- While a voice memo records, Stop & save takes the mic's own slot. Discard is
  smaller (48) and in the camera's slot, and it is undoable for 5 s. The pulsing timer sits beside the
  mic's slot, left of the stack (`voice-timer`). A memo under 1 s of wall-clock time is dropped with a
  "Too short, not kept" toast. A memo that fails to save offers Retry. Leaving the screen mid-memo
  saves it: the walk's Minimize is disabled mid-memo, the ready screen's chevron closes and the memo is
  finished as `useCaptures` unmounts.
- **The notice follows the walk's arrival** (capture-from-chronicle audit 1): Walk here and Start can
  show the screen before the keeper reads the new walk, so `WalkScreen` sets `arrivalNotice(params)`
  (`lib/readyNav`) when the walk first appears, not only as it mounts.
- A quick tap on Stop shows "Hold to stop the walk".
- Walk options (the Explore switch, its range and kinds, motion, Share GPS log) are the strip's
  drawer, not a button (the owner, Nov 4): the walk's strip is the same `ReadyBar` as the ready
  screen's (`idPrefix="walk"`: `walk-bar`, `walk-grip`, `walk-summary`), pulled up by a drag or a tap on
  the numbers, with Pause and Stop at its foot. Mid-memo it is locked. `options-card` is its content,
  and Explore's settings are in it, not in a panel of their own (the owner, Nov 4): with Explore on, the
  "?" range (the ring on the map, fitted above the raised drawer) and what I'm into, then the pocket alert
  and reminders; each saves as it changes. `settings` / `open-settings` / `settings-done` no longer exist;
  raising it closes any card, and Back or Escape lowers it (ReadyBar's own handler).
- Pills (the caption offer, voice Undo, Retry, a moment's toast) sit left of the stack, just above the
  strip (`at.pills`), right-aligned, so the stack never moves under the thumb. Zooming keeps following;
  only a pan or a turn stops it (web; native can't tell zoom from pan yet).
- **The ready bar pulls up** (`components/walk/ReadyBar.tsx`, NR7): a drag on its grip or its numbers,
  or a tap on them, raises it to 60% of the screen (`raisedHeight`) with `StartSettings` in a scroll
  above Start; a drag down, Back or Escape lowers it. At 88% the range ring sat under it (audit 1), so
  the map fits the ring into the part left above the bar. Mid-memo the bar takes no hold at all
  (`locked`; audit 4: a refused raise once left it part-way over Save). The summary (`ready-summary`)
  is the one button for a keyboard or screen reader: Enter, Space or `activate`, named with the numbers
  and the destination (audit 6); the grip is hidden from assistive tech. The walk's cards sit above the
  strip and left of the stack's column (`cardAt`, audit 5); the scale bar sits in the bottom-left
  corner at `SCALE_BOTTOM` (12, the owner, Nov 4), and the pills sit above it (audit 11). Its own spring is the app's (M5) with a 0.5 px rest, and the
  settings stay mounted until the lowering spring finishes, so the foot never jumps. The range ring
  shows on the map only while it is up in Explore. A long press on the ready map sets the destination
  (not while the bar is up or mid-memo); the resting bar then says `To <place> · <distance> away`.
- **The walk's notice sits in the minimize button's row** (the owner, Nov 4), level with it at the top
  edge, so the button doesn't move when one appears (NR6). The web's "keep this page open" is said once, on
  the ready screen's first launch (NR13), never as a walk's notice or by `startNotice`.
- **The chevron and the street chip are pinned to the top row** (Nov 5, the owner): the Minimize row is the
  first child of the top column and the "On <street>" chip is centred in it (`chipCell`, absolute, 44 pt),
  so a banner or an off-route chip below never pushes them down. **The navigation bar shares that row** (the owner, Nov 6: it kept drifting down; this supersedes "Minimize above the bar"): Minimize at the left, the bar filling the rest of the row, so the bar's top is the row's top. With the bar up, the street chip and any notice sit just under it. `launch` checks the bar level with Minimize; don't put anything above the bar. A notice takes the
  chip's place in the row, so the chip hides while one shows. Not run on a device.
- **The grip is a 28 px band, focusable (`tabIndex={-1}`)** (Nov 4, the owner: "I cannot lift the drawer",
  on the web; Explore's 24 px grip lifted). It was a 10 px transparent strip, and a touch on it went to the
  map canvas beneath, not the bar, so a finger's drag on the handle did nothing while a mouse drag, and a
  drag on the numbers (a `role=button`), worked. The first fix, `tabIndex`, lifted it in Chromium only on the
  handle itself; the band now lies over the top of the foot at rest (the foot, `pointerEvents="box-none"` and
  above it, takes touches only on the numbers and Start), so a thumb anywhere in it takes hold. The foot has no
  fill of its own, or it would hide the handle. `navigate-ready touch 1` and `touch 2` use real touch events
  (CDP), never the mouse; a test of this bar must too. Found in headless Chromium: iOS WebKit has not been run.
- **"Not recording" is a button** (QL19, Nov 3): while the recorder's status is an
  error, the chip (`status-chip`, "Not recording. Why?") re-raises the recorder's
  sticky notice (Open Settings on a phone; the web's message says where to allow
  it). The other chip states stay plain text.
- **A return to the front retries the recorder** (QL20): once per `resumed` change,
  with the status in error and the walk not paused (`retryRecorder`, pure), the screen
  calls `restartRecording(walkId)` (session.ts, the same `recorder.start` Resume uses,
  so location is asked again). The status listener raises the error notice only when
  the message differs from the last one raised (`raisedError`), so a failed retry's
  error → waiting → error keeps the chip quietly; the chip's tap bypasses the guard.
  Native's own AppState listener in the recorder may run on the same return;
  `startUpdates` is idempotent. Unverified on a device.
- **Time left in the navigation bar** (QL17, QL18): `timeLeftMs` from `lib/nav/eta.ts`
  with `live.distanceM` over the walk's moving time (as `WalkStats` counts it),
  refreshed by the screen's 5 s `now`; "< 1 min" under a minute. Every distance on the
  screen follows the units setting (`useUnits()` at the top, QL16).
