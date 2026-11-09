<!-- Navigate, ready. Written in the repo first (2026-11-03) from the owner's iPhone screenshots
     (Navigate today next to AllTrails' Navigate); to be copied into the concept doc as its own tab.
     The doc wins once it exists. -->

# Navigate, ready (NR)

Navigate stops being a tab with a drawer and a floating capture row. It opens the
navigation context itself: the walk screen, full screen, in a **ready** state.
The map is around you, a compact bar shows 0:00, 0.00 and Start, and the captures
sit in a stack at the right edge. Start begins recording **in place**, on the same
screen with the same layout, so nothing jumps. This is AllTrails' Navigate, taken
for its layout only. Chronicles keeps its own palette, Start button and map style.

## Decisions

- **Navigate opens the walk screen, ready** (the owner, 2026-11-03, after comparing
  screenshots of Navigate and AllTrails): full screen, no tab bar. A chevron-down at
  the top-left goes back to the tab you came from. With a walk open, Navigate opens
  that walk. This retires the Navigate drawer (0046), the tab's live view of a
  minimized walk (0047, 0062) and NV10's Return to walk.
- **Captures move to a right-edge stack** (the owner, 2026-11-03): camera, mic and
  note sit stacked at the right edge, on the ready screen and during the walk, so
  both look the same. This replaces the centered row from the walk-screen layout
  rule, the Hoober one.
- **The bar is a quick start; pull it up for the settings** (the owner, 2026-11-03,
  "You pull up the drawer. The bar should be a quick start"). This reverses 0056,
  which put the settings in a dialog. Start stays at the bar's foot at every height.
- **One and the same screen** (the owner, 2026-11-03, mid-build): the ready state is not a separate
  view from the walk's; it is the walk screen with one map that stays mounted across Start.
- **The launch** (the owner, 2026-11-04, after main had taken "the app opens on Explore", 0070):
  "If there's an active walk going on, it should reopen to the navigate tab; if there's no active
  walk, it should go to the Explore page." NR3 follows it; the plan's default (open on the ready
  screen) is dropped.
- **Layout only** (the owner, 2026-11-03): AllTrails' structure, Chronicles' light
  theme, the rust Start and the current map style.

## Acceptance criteria

### Opening it

1. **NR1 · Navigate opens the ready screen.** From any tab, a tap on Navigate opens
   the walk screen over the tabs, full screen, with the tab bar hidden. With no walk
   open, it is in the ready state: a map around you from one fix (NV17, re-read each
   time it opens), your dot, your moments' pins (M16), the destination's mark if one
   is set, no trace, and nothing ticking.
2. **NR2 · With a walk open, Navigate opens that walk,** recording, as the recording
   bar's › does. Navigate has no view of its own any more.
3. **NR3 · The launch** (the owner, Nov 4, keeping 0070; amended Nov 9 by HC1, decision 0106): with no
   walk open the app opens on Chronicle's Memories, at `/`; with a walk open it reopens straight onto that
   walk (the walk screen, which Navigate is). On web, a reload of `/walk` or a link to `/navigate`
   opens the ready screen over Chronicle.
4. **NR4 · The chevron goes back.** The chevron-down at the top-left (NV7's place)
   goes back to the tab you came from, Explore when there is none. In the ready state it
   just leaves. During a walk it minimizes to the recording bar, as today. Android
   Back and the browser's back do the same.

### The bar

5. **NR5 · The ready bar is a quick start.** At rest the bar reads 0:00, a distance
   of zero in your units (QL16) and **Start**, in the same strip and at the same
   height as the walk's time, distance and Stop. One tap starts the walk with the
   saved choices and the destination (NV19, NV25), and never waits for a fix (NV28).
6. **NR6 · Start records in place.** The screen doesn't change or animate, and its map is the same
   one, never rebuilt. The time
   starts ticking, the map stays put and then follows you, Start's place in the
   strip becomes the walk's controls (options, Pause, hold-to-stop), and the notice
   says "Walk started · recording". The captures, Locate and the chevron don't move.
7. **NR7 · Pull the bar up for the settings.** A drag on the bar's grip, or a tap on
   it, raises the bar to show: the mode (Quiet | Explore), the destination (its name
   and distance, Clear, and the long-press hint), the range and what I'm into
   (Explore only), distances in km or miles, the pocket alert, and reminders and
   alerts. Start stays at the bar's foot at every height. Every choice saves as it
   changes (NV22). A drag down, Back or Escape lowers the bar. While it is up in
   Explore, the range ring shows on the map. The Start dialog is gone.
8. **NR8 · A destination shows at rest.** When a destination is set (a long press
   on the map, NV23), the resting bar says where in one line (`To Your spot · 120 m away`).
   With no destination, the line isn't there.

### The stack

9. **NR9 · Captures at the right edge.** Camera, mic and note are stacked
   vertically at the right edge, above the bar and inside the 640 column on wide
   screens, with Locate (ready) or Recenter (walking) in the same column above them.
   They are in the same place before and after Start. Before Start they keep
   moments, placed by one fix and shown on Chronicle (NV18). After Start they are
   the walk's captures.
10. **NR10 · A memo in the stack.** While a memo records, Stop & save takes the
    mic's slot, Discard takes the camera's, and the pulsing timer sits beside the
    stack. The pills (the caption offer, voice Undo, Retry) sit left of the stack,
    above the bar, and never move it. Start can't be pressed while a memo records
    (NV28). On the ready screen the chevron still closes, and the memo is saved as it goes, as leaving
    mid-memo does today; the walk's Minimize stays disabled mid-memo, as before.
11. **NR11 · Nothing overlaps on a small phone.** At 375×667, and with the
    walk's edge buttons showing (unwalked streets, walk me back, Recenter), every
    button of the stack, the bar, the chevron and the scale bar is on screen, at
    least 44 pt, and none overlaps another.

### Kept

12. **NR12 · One map at a time** (NV4): the ready screen's map is the only canvas.
    The tabs beneath take theirs down.
13. **NR13 · The notices move with it:** start errors (with Open Settings), the
    web's one-time "keep this page open" note (U9) and the denied-location chip show
    on the ready screen.

## Retired by this slice

- NV10 (Return to walk on Navigate's peek), NV19-NV21 (the drawer's peek, half and
  full), U1 (the docked drawer), U2 (Navigate's live view of a minimized walk).
- 0056's Start dialog, and the walk screen's centered capture row in
  `.claude/rules/walk-screen.md`.

## Record

Built 2026-11-03 on `claude/navigate-ready`, web verified (native has never run on a device).

- **Passed:** NR1-NR13 in `E2E_ONLY=ready` (`readyScenario`), NR2-NR4 and audit 9 in
  `src/lib/__tests__/navigateReady.test.ts`. The full flow, the tabs audit and the other scenarios
  moved off the drawer (`drawerTo` raises the ready bar; `tabTo` closes the ready screen first).
- **Mid-build (the owner, Nov 3):** the ready state and the walk are one screen with one map kept
  across Start (`useReady`; the e2e marks the canvas).
- **Tests first:** the unit tests for NR2-NR4 were written before `readyNav.ts`; the e2e scenario was
  written after the screens, then each audit check before its fix.
- **Deferred:** see `docs/DEFERRED.md` ("Navigate, ready").
- **Journeys at deploy** (decision 0074): ready 38, tabs 39, reload 11, gaps 23, hidden 3, marks 3, qol 29 checks,
  all on the `/chronicles` build. The full flow passed 366 before main's second merge.

### Audit (2026-11-03)

13 findings: 12 accepted and fixed, 1 deferred, 0 rejected. No finding was architectural.

1. The range ring was under the raised bar: accept. The bar rises to 60% and the map fits the ring above it. `navigate-ready audit 1`.
2. Start remounted the map: accept. Fixed by the one-screen change. `ready NR6, navigate-ready audit 2`.
3. A failed Stop could switch to the ready state and hide its error: accept. The walk stays on screen with the error. Typecheck and the flow only (a failing stop isn't injectable in the e2e).
4. A drag mid-memo left the bar part-way over Save: accept. The bar is locked mid-memo. `navigate-ready audit 4`.
5. The walk's cards covered the stack: accept. Cards sit above the strip, left of the stack's column. `navigate-ready audit 5`. The walk's settings panel (`ExploreSettings`) is a sheet with its own Cancel and still covers the lower screen while open (accepted as a sheet).
6. Keyboard and screen readers couldn't raise the bar or hear its numbers: accept. The summary is one focusable button (Enter, Space, activate) named with the numbers and the destination. `navigate-ready audit 6`. VoiceOver and TalkBack are unverified.
7. On web, Back after a launch reopened Navigate: accept. The entry route replaces `/`. `navigate-ready audit 7`.
8. A keeper that never settles left a blank screen: accept. The loading state shows the chevron. Typecheck only (a storage that never answers isn't injectable without breaking the page).
9. An in-place start dropped the web's "keep this page open": accept. `startNotice`. `navigate-ready audit 9` (unit).
10. The chevron during "Starting…" started the walk minimized, unsaid: accept. The chevron is disabled while starting, and a plan that failed after the walk opened says so on the walk. The flow and typecheck only (the start is too quick to catch).
11. A pill overlapped the scale bar at 375: accept for one pill (the scale bar sits at 80) and the long pill text now wraps. `navigate-ready audit 11`. Two pills at once still meet it: deferred.
12. One Escape closed the viewer and the bar: accept. Moment pins do nothing while the bar is up. The flow only.
13. A walk stopped from a second browser tab leaves the next walk on the same screen with the old walk's streets: defer (two tabs on one origin).

Found by the full e2e, not the audit: a reminder tapped with the app closed and a walk open landed on
Explore with no walk screen. Two causes: the notifier asked for the walk before the router was ready,
and that lost push held the gate for 2 s against the launch's own ask; and the walk screen, mounting
sooner, read the waiting tap before it was kept. A launch's ask now passes a pending one, once (`ask(now,
{ launch: true })`, test "navigate-ready cold open"), and `onRecallWaiting` tells the walk screen when the
tap lands. The e2e's "a tap that opened the app opens its capture on the walk" covers both.
