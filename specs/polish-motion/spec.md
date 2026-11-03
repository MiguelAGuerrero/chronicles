<!-- Mirror of the Claude Docs tab "Polish: motion" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# Polish: motion

Small effects that make actions feel deliberate. The restraint rule still holds: effects are short and physical (a settle, a press, a lift), never celebratory. The owner's defaults (Nov 1): Reanimated for on-screen motion, no sounds yet, and the first batch below. Effects on pins, stars and marks wait for the Explore work, so the two don't collide.

## Criteria

1. **M1 · One set of timings.** Every effect takes its duration and easing from shared motion tokens: fast 120 ms, base 220 ms, camera 600 ms, and one spring.
2. **M2 · Reduce motion.** With the system's reduce-motion setting on, every effect is instant: the camera jumps, the sheet snaps, pills simply appear. The e2e can force the same.
3. **M3 · No cost to walking.** Effects run off React's render cycle. The walk screen's render budget (2.5 a second in the e2e) still holds while pills animate.
4. **M4 · Buttons press down.** Large buttons shrink slightly (to 97%) while pressed and spring back. Hold to stop keeps its own fill.
5. **M5 · The sheet settles.** The home sheet settles at its height with a spring rather than a fixed timing. A drag still follows the finger.
6. **M6 · Zoom out to where you've been.** Opening the walks list zooms the home map out to every place walked, in one 600 ms fit. Closing the list leaves the map where it is. Selecting a star still eases to it.
7. **M7 · Pills lift in.** Pills and banners on the walk screen fade and lift in over 180 ms, and fade out.
8. **M8 · One feedback call.** Actions share one feedback call (tap, success, warning): a haptic on phones, nothing on web. No sounds in this slice. The call has a place for them, off by default, kept apart from the voice memo's audio session.

## Deferred, to agree with the Explore work

- A bounce and ring when a star or place is selected.
- A pin drop when a capture is saved.
- The ? flipping to its name when revealed.
- A soft pulse when a place is found.
- Opt-in sounds.

## Tests

- Unit tests: the tokens, and the reduce-motion rule (M1, M2).
- E2E: the press-down (M4), the zoom out (M6), the lift-in (M7), reduce motion forced (M2), and the existing render budget (M3).
- Native (Reanimated on a device) has not been run.

## Audited and deployed (Nov 1)

- **Reanimated dropped** (the owner's call). It added 140 KB gzipped (+36%) to the web build for four effects. Everything runs on React Native's own Animated; the web build is back to its old size (+6 KB).
- **M2:** reduce motion is read live, so a change during a session applies at once. A pressed button keeps its dimming as the sign of the press when nothing moves.
- **M5:** the sheet reports where it ends even when a drag cuts its spring short, and a grab mid-move holds it in place.
- **M6, changed:** the walks list zooms out only when the view doesn't already hold every place walked, and never closer than the current zoom.
- **M7, changed:** pills lift in and go at once when removed (no fade out), so no copy lingers to be read out again.
- **M8:** every haptic goes through the one feedback call.
- Native (the press, the lift, the sheet spring) has not run on a device.

## The deferred four (Nov 1, after Explore)

Each effect plays once, when its change happens in front of you. Nothing animates when a screen first opens or reloads, and with reduce motion on nothing moves.

9. **M9 · A star settles when selected.** Tapping a single star on the home grows its ring from 85% with the app's spring.
10. **M10 · A new capture's pin drops in.** It falls 12 px into place and fades in over 180 ms. Pins already there when the walk screen opens don't.
11. **M11 · The ? turns into its place.** When a mark is revealed, its icon and name turn in (a quarter turn about the vertical, 220 ms) instead of swapping.
12. **M12 · A find pulses once.** When a capture finds a place, a soft ring grows out of its pin and fades (600 ms). The pin itself stays still and lets taps through.

Tests: the e2e checks that each effect appears on its change and not after a reload, and that reduce motion keeps the star still. The phone versions (the views notice their own change) have not run on a device.
