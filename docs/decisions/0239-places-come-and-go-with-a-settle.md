# 0239. Places come and go with a settle on a walk: a second spring, and the app's first leave

Date: 2026-11-20 · Status: accepted · Area: motion, map · Amends: the motion rules (`MOTION.spring`, "settles without a visible bounce"; `LiftIn`, "goes at once when removed") · From: the owner, in a `/slice` session, Nov 20 (`specs/poi-transitions`)

## Context
The owner: "For when points of interest come into view, there should be a little bit of a transition in and
transition out. So maybe it could be a scale in and scale out or something similar." Until now a "?" mark appeared and
disappeared in one frame. The app had one spring (`MOTION.spring`), tuned to show no bounce, and nothing animated as
it left: `LiftIn` "goes at once when removed".

## Decision
The owner's answers, Nov 20:
- **Which:** the Places "?" marks only. The dots, capture pins and walk stars are not animated.
- **When:** as walking brings a mark within range or takes it out, and only for a mark on screen ("only happen when I'm
  in view"). Explore's zoom was first picked, then dropped. Pans and zooms of the walk's map, switching Places or a kind,
  the range preview and a route draw marks still (the steward's S1). The M9-M12 rule holds: nothing plays when a screen
  opens or comes back to the front.
- **How:** a spring that overshoots slightly, the owner's pick over a plain scale and fade. The steward found 0.6 to 1.06
  read as a bounce (S3), and the owner agreed to the slight one: from 80%, opaque from the first frame, peaking at about
  1.025 (`MARK_MOTION.spring`, damping ratio 0.55, settled in 350 ms). The leave takes `MOTION.lift`: it fades out by
  two thirds of the way and shrinks to 80% on Material's exit curve.
- **Restraint, the steward's:** every mark of one change moves at once; no sound, haptic or colour; a mark back within
  30 s of leaving, and anything while riding, comes and goes still (S2), so the range's edge never flickers.

## Consequences
- `lib/markMotion.ts` holds the rule and the marks' own spring beside `MOTION.spring`, which keeps its no-bounce settle
  for everything else. `components/Enter.tsx` gains the `grow` entrance and `Leave`, the app's first leave animation.
- A leaving mark takes no tap or focus and is hidden from a screen reader at once. A mark taken at once (a context
  change) hands a focus it held to the map.
- The UI review (Nov 20): the leave fades linearly over two thirds of its time while it shrinks on Material's exit
  curve; a mark scales about its place, never its middle; a mark at the range's edge leaves still as well as coming
  back still; a focused "?" stays until its focus leaves. The overshoot is about 1 px on a 34 px head (U7): kept as
  the owner chose; if it is not seen on a phone, the start scale is what changes, never the damping.
- The audit (Nov 20): only crossing the range's edge moves a mark, never the nearest-eight cap; nothing moves until two
  positions have come since the screen mounted or came back to the front, nor with the app behind; a find loaded or
  removed moves nothing.
- Native has never run on a device (`docs/NATIVE_UNVERIFIED.md`).
- Precedent: maplibre-gl's `fadeDuration` and Leaflet.markercluster's `animate` (`docs/research/adjacent-apps.md`, "A
  place's mark arriving and leaving as the map changes").
