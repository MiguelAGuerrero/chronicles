---
paths:
  - "src/lib/{geo,liveDot,glide,useLiveTrace,useGlidingWalker,steps,walkMotion,gpsLog,session,lastFix,traceEnds,rides}.ts"
  - "src/lib/motionSource/**"
  - "src/lib/recorder/**"
  - "src/lib/__tests__/recording/**"
  - "index.js"
---
# Recording and traces

Recording a walk and reading its trace: pauses, standstills, GPS jitter, the live dot, motion and steps, the GPS log, the recorder and the location task. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## Pause, standstills, jitter, the live dot, motion

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
- **The hidden-page notice needs a hidden page** (decision 0077, Nov 3): a gap is
  reported to the walk screen's "Tracing paused … while this page was hidden" only
  if it overlaps a spell out of front (`lib/hiddenLog.ts`, fed from AppState in
  `useLiveTrace`) or began before the page loaded. With the page on screen, a gap
  is weak GPS: the chip says so, no notice. `E2E_ONLY=hidden` checks both.
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
  - **An averaged position more than 75 m away is travel, not a jump**
    (`DWELL_JUMP_M`, Nov 2): it ends the stay. The tabs e2e walked 200 m out
    and straight back along one street; the two passes of one spot, two
    minutes apart, read as a stay, and the walk lost its middle (and its
    "passed" place). `outAndBack.json` is that walk. `SNAP_RULES` 6.
- **A settled spot keeps a point every 30 s** (`JITTER_STEP_MS`, jitter 8,
  Nov 3): a slow stroll in Easton settled into spots of 75-148 s drawn as two
  points each, and the 60 s break rule cut the line where the GPS never
  stopped. A spot now keeps its members' times at least every 30 s, the last
  member before each step, so a hole in the fixes never widens it.
  `eastonSlow.json` is that walk.
- **GPS wander is settled when a trace is read** (`settleJitter` in `geo.ts`,
  the owner's go-ahead, Nov 1, after a phone's screenshot of a scribble while
  standing still: the live map drew every gated fix, and wander of 20-40 m
  passes the accuracy and speed gates).
  - Fixes within their reported accuracy of a spot's running centre are one
    spot. The reach widens up to 2x once a spot has held for 15 s, so drift
    doesn't move someone standing.
  - A spot walked through (its halves' centres more than half its reach apart)
    is drawn from one half's centre to the other's. A spot stood in is drawn as
    its centre. The share widens with the reach, up to 2x once held a minute
    (jitter 2, Nov 3): 17 m of drift over 71 s at ±30 m read as walked once
    no break hid it. `SNAP_RULES` 9.
  - A lone fix away and straight back is dropped. A lone first fix that the
    next two leave is dropped.
  - Fixes without accuracy pass as before.
  - The live map draws `liveRuns` (standstills held still, as the replay does).
  - Corners can round by a few metres at poor accuracy. Tests count ground
    covered, never exact fix counts. `SNAP_RULES` 4.
- **The live dot** (`liveDot.ts`, the owner's go-ahead, Nov 1, after the dot
  lagged, slid back over walked ground and swung at sharp angles: it was the
  newest point of a trace re-read every 2 s).
  - Each fix updates it at once through a constant-velocity Kalman filter per
    axis (`DotStore`, fed in `useLiveTrace`). The map glides to it without
    re-rendering the walk screen (`useGlideFrames(..., source)`), toward
    `lead`: one fix interval ahead while moving, so the glide ends where the
    walker is.
  - Its heading is never the cone on its own: `coneHeading` checks it against
    the trace's (decision 0075; see the cone in `.claude/rules/navigation.md`).
  - Without motion: held still unless the speed is steady in one direction
    for 3 fixes and, from a standstill, the fix left by its accuracy. A gap
    over 60 s or a jump over 150 m restarts it at the fix.
  - A short link line joins the trace's end to the dot (60 m at most), drawn
    once per fix (`setData:trace-link`), never per frame.
  - The e2e reads the dot's spot from `data-at` on the puck (only when
    `window.__perf` is set) and checks it moves on every fix.
- **Motion** (the concept doc's "Motion" tab, MO1-MO10; the owner's calls,
  Nov 1, after research: GPS can't tell 10 m of drift from a walk; steps can).
  - `expo-sensors` DeviceMotion on every platform; Expo's Pedometer has no web
    build, so `steps.ts` (core) finds steps in the acceleration's size
    (gravity removed): peaks of 0.6 m/s² or more, 0.3-1.3 s apart, with a dip
    below rest between (a tap only spikes up). Walking: 3 evenly spaced steps
    in 3 s; still: none for 3 s; unknown before the first firm answer.
  - Permission is asked first thing in the Start, Walk here and Resume taps
    (`askMotion`: an iPhone's browser prompts only straight from a tap).
    After a reload it is restored without a tap where possible
    (`restoreMotion`); on iPhone web the options offer Turn on. Declined or
    unavailable, the walk runs on the GPS filters, and the options say so
    (denied: allow it in Settings).
  - Read only while a walk is open, on screen and not paused
    (`useWalkMotion`). The dot is told (`setMotion`): still holds it unless
    five far fixes (3x accuracy) sit together within their accuracy (a stay
    begun on a bad fix; drift keeps moving, so it never settles); walking
    follows at once and turns away fixes over 4 m/s; net travel of 4.5 m/s
    over 10 s, by this fix and the one before, hands it back to the GPS,
    since a bus reads still. Net, never fix to fix: indoor drift jumps fast
    but goes nowhere.
  - **Still spells** (`Still`, kept truth beside pauses: SQLite migration 13,
    IndexedDB v11) are passed to `readTrace(..., stills)` by the live trace,
    `snapWalk` (snap, places), the replay and walk me back. `SNAP_RULES` 5.
    `holdStill` cuts each spell at every break (rides, pauses, gaps), holds a
    part at the last walked fix just before it (else its first fixes), holds
    only fixes within 50 m or 3x accuracy, and stops holding after 3 in a row
    beyond that (a bike, a slow stroll read as still, or a spell left open).
    The walk screen closes a spell left open by a reload when it loads.
  - **After the audit:** 11 findings, 9 fixed (`motion audit N` in
    `still.test.ts` and `steps.test.ts`). Deferred: the backup bundle leaves
    spells out.
  - **Native** (unverified on a device): DeviceMotion's units and update
    interval on iOS and Android, the iOS motion permission text, migration
    13, AppState `inactive` ending spells, the native link line.
- **Share GPS log** (the owner's go-ahead, Nov 1, after the trace and dot sat
  far from where they stood indoors): the walk's options hand the walk's raw
  readings (seconds, position, accuracy, speed, course) and placed captures to
  the share sheet (`gpsLog`, React Native's `Share`, so `navigator.share` on
  web), or the clipboard on a desktop. The text is read when the card opens: a
  browser opens the share sheet only straight from a tap. Nothing is sent
  anywhere by the app.
  - **A finished walk shares its log too** (the owner, Nov 3, after a gap
    that wasn't filled couldn't be looked into once the walk had ended): its
    More (⋯) menu (`WalkActions`, on the replay card and the Chronicle row)
    has Share GPS log. Both places go through `lib/shareLog.ts`
    (`walkLogText`, `shareLogText`), and both read the text when their card
    opens. The sheet's hint line says "Copied" or why it failed.

## Raw fixes

- **Raw fixes are stored unfiltered.** `readTrace` (`src/lib/rides.ts`) applies the
  gates at read time: accuracy over 50 m, staleness before the walk began, then rides
  (see Rides), then `FixFilter` per walked stretch (speed over 7 m/s, and re-anchoring
  when the first accepted fix was the outlier). Always pass the walk's `started_at`
  and pauses. `filterFixes` is the walking filter alone, kept for its tests.

## Expo location gotchas

- expo-location exports the activity enum as `Location.ActivityType`, not
  `LocationActivityType`. TypeScript accepted the wrong name; it would have crashed
  at runtime. `npx expo lint` (`import/namespace`) caught it: run lint.
- **The background location task must be defined when the bundle loads.** expo-router
  evaluates route modules lazily, so the task is registered from the custom entry
  `index.js` (`package.json` `main`), before `expo-router/entry`. Never move it into a
  route.
- Foreground permission is enough for a walk started in the foreground. Treat
  "Always" as a best-effort upgrade, or users who pick "While Using" hit a dead end.
