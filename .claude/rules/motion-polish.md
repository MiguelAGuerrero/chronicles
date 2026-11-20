---
paths:
  - "src/lib/{motionTokens,motion,enter,markMotion,zoomOut,haptics}.ts"
  - "src/components/{Enter,HomeSheet,ui}.tsx"
  - "src/lib/__tests__/motion/**"
---
# Polish: motion

Animation and haptics: the motion tokens, reduce motion, presses, the sheet spring, lift-ins, the zoom-out and the four entrances. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

- **Restraint holds:** effects are short and physical (a press, a settle, a
  lift), never celebratory. No sounds yet.
- **React Native's own Animated, not Reanimated** (the owner's call, Nov 1, after
  the audit: Reanimated added 723 KB raw, 140 KB gzipped, +36% to the web
  bundle, for four effects, and its web layer read reduce motion once and
  cloned exiting nodes). It is still in node_modules through expo-router, but
  never import it; the bundle only pays for what is imported. Revisit it only
  for gesture-driven animation.
- **One set of timings:** `lib/motionTokens.ts` (pure: `MOTION` fast, base,
  lift, camera, ease, pulse, spring; `PRESS_SCALE`; `durationFor`) and
  `lib/motion.ts` (`useReducedMotion`, live through `AccessibilityInfo`;
  `nativeDriver`; `feedback(kind)` for every haptic). Never hard-code a duration
  or call the haptics directly. Each kind's taps are `HAPTIC_PATTERNS`
  (`motionTokens`): `tap` one light, `nudge` (the pocket alert) two medium
  `MOTION.nudgeGap` apart. On web only `nudge` plays (0079). A nudge within three gaps of the last is
  dropped (`nudgeAllowed`). `lib/haptics` may be imported only by `lib/motion`
  (a lint pattern).
- **Effects:**
  - `Button` presses down to 0.97 on the native driver and keeps the 0.8
    dimming, the press's only sign with reduce motion on.
  - `HomeSheet` springs its height in JavaScript (height can't use the native
    driver). It reports every move's end, finished or cut short, and a grab
    mid-move holds where the sheet is.
  - The sheet's first known height is set, not sprung: its mount's move and the one Chronicle's first read asks
    for (the owner's answer, decision 0219; `tend tabs T38`); the spring holds for every move after it.
  - `LiftIn` (and `Banner`, built on it) fades and rises in, and goes at once
    when removed.
- **The walks list zooms out** only when the view doesn't already hold every
  place, and never closer than the current zoom (`lib/zoomOut.ts`, pure). It is
  framed above the half sheet it opens to, with the fit's own padding.
  `fitMaxZoom` goes to fitBounds on web; MapLibre RN's fitBounds has none, so
  the native map widens the bounds to fit no closer (`capFitBounds`, U15). `perfCount('fit')`
  lets the e2e count fits.
- The walks list's zoom-out runs for the sheet's Walks, a drag up and the section bar's Walks, all from the sheet at rest (`openSheet`, decision 0141); from Days, or with Walks already shown, none does.
- A map that mounts on Walks (the bar's Walks from Memories or Media) runs the same zoom-out once, after its first read (decision 0142); one that mounts on Days or Map does not.
- **Testing motion on the web:** `emulateMedia({ reducedMotion: 'reduce' })`.
  A mouse drag on a moving element is cancelled by the browser and reads as a
  tap, so drag a moving sheet with CDP touch events, as on a phone.
- **The deferred four** (M9-M12; `lib/enter.ts` pure, `components/Enter.tsx`).
  Each plays once, when its change happens in front of you, never when a
  screen opens or reloads.
  - A selected star settles from 85%.
  - A new capture's pin drops 12 px.
  - A revealed "?" turns in a quarter turn.
  - A find grows a ring that fades; the pin stays still and lets taps through.
  - On web, a map rebuilds a marker on every change, so the map decides
    (`markEnter`, `starEnter`, `pinDrops` against what it showed before).
  - On native, the map keeps what was shown in state. A star's view stays
    mounted and notices its own selection (`useOwnEnter`).
  - A view latches its entrance at mount, so a later render can't cut it short,
    and `Enter` renders the plain child once it has played (no transform or
    layer left on the pin).
  - The turn starts at 60°, so the "?" is seen turning. A place coming back from
    a faint route pin doesn't turn again.
  - On native, `seenMarks` and `seenCaptures` change only on a real change
    (`sameSeen`), because the discoveries array is new on every fix. The
    star's `useOwnEnter` counts changes, so each selection plays afresh.
  - The e2e records each entrance as it appears (`window.__enters`: kind,
    whether it moved a frame later, its marker's label and ids), so a stuck or
    vacuous wrapper fails.
- **Places come and go with a settle on a walk** (PI1-PI14, decision 0239; `lib/markMotion.ts` pure).
  - A "?" grows in (`grow`, `Enter`) as a new position brings it within range and shrinks out (`Leave`, the app's
    only leave animation) as one takes it out, on the marks' own spring (`MARK_MOTION.spring`: from 80%, opaque,
    peak about 1.025, settled in 350 ms). `MOTION.spring` keeps its no-bounce settle for everything else.
  - What moves is `markMoves`' call. The screen passes `marksContext` (`markContext`: Places, range or its preview,
    kinds hidden, places read, the whole route, null while riding), and a change of it moves nothing. Only the walk
    screen passes one; Explore's marks come and go at once.
  - It moves nothing on first sight, off screen (the map's bounds), or for a mark back within `backStillMs` (30 s).
  - A leaving mark takes no tap or focus and is hidden from a screen reader at once. On web it is
    `data-leaving`, and a focus it held goes to the map's canvas. A mark back while leaving is drawn once.
  - Unmounting removes everything at once.
  - Native decides a tick after the list changes, from the bounds of the last settle (`onRegionDidChange`'s
    `bounds`). A mark that may be arriving is held back for that tick. Unverified on a device.
  - The e2e recorder (`recordEnters`, harness) records `leave-shrink` as kind `shrink`, with the marker's
    `aria-hidden`, pointer events and tab index. A fresh context needs `recordEnters(c)` itself.
- **Native** (unverified on a device): the native-driver press and lift, the
  sheet spring.
- The e2e's mouse drag on the home map doesn't pan it, so H5's "kept its view
  across the replay" check compares an unmoved view.
