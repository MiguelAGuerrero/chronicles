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
3. **NR3 · The app opens on the ready screen** (NV2 kept), with Explore beneath it.
   An open walk still opens its walk screen at launch. On web, `/` and `/walk` both
   open the ready screen when no walk is open, so a reload keeps it.
4. **NR4 · The chevron goes back.** The chevron-down at the top-left (NV7's place)
   goes back to the tab you came from, Explore after a launch. In the ready state it
   just leaves. During a walk it minimizes to the recording bar, as today. Android
   Back and the browser's back do the same.

### The bar

5. **NR5 · The ready bar is a quick start.** At rest the bar reads 0:00, a distance
   of zero in your units (QL16) and **Start**, in the same strip and at the same
   height as the walk's time, distance and Stop. One tap starts the walk with the
   saved choices and the destination (NV19, NV25), and never waits for a fix (NV28).
6. **NR6 · Start records in place.** The screen doesn't change or animate. The time
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
   on the map, NV23), the resting bar says where in one line (`To Your spot · 1.2 km`).
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
    (NV28), and the chevron saves the memo, as leaving mid-memo does today.
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

(Filled in as the slice lands: what passed, what was deferred.)
