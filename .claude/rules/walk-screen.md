---
paths:
  - "src/app/walk.tsx"
  - "src/components/{Ticking,MomentBar,MemoryPreview,ExploreSettings,OpenWalk,ConfirmCard,ReminderCard,RemindEditor,ui}.tsx"
  - "src/lib/{useCaptures,walkNav,walkGate,memoGate,useLiveTrace,walkEvents,recordingBar,walkMotion}.ts"
---
# Walk screen

The walk screen (`src/app/walk.tsx`): its layout, capture row, pills, edge buttons and voice-memo controls. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

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
- Walk options (the Explore switch, and a link to Settings) sit in the bottom strip, left of Pause
  (the owner's call, v1): walk-level settings stay with the walk's controls.
- Pills (the caption offer, voice Undo, Retry) sit above the capture row, so the
  row never moves under the thumb. The small edge buttons (unwalked streets, and
  Recenter while not following) stack at the right edge above the row and one pill
  (`EDGE_BOTTOM`), inside the 640 column on wide screens. Zooming keeps following;
  only a pan or a turn stops it (web; native can't tell zoom from pan yet).
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
