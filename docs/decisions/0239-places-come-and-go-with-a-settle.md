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
  1.025 (`MARK_MOTION.spring`, damping ratio 0.55, settled in 350 ms). The leave shrinks to 80% and fades over
  `MOTION.lift`.
- **Restraint, the steward's:** every mark of one change moves at once; no sound, haptic or colour; a mark back within
  30 s of leaving, and anything while riding, comes and goes still (S2), so the range's edge never flickers.

## Consequences
- `lib/markMotion.ts` holds the rule and the marks' own spring beside `MOTION.spring`, which keeps its no-bounce settle
  for everything else. `components/Enter.tsx` gains the `grow` entrance and `Leave`, the app's first leave animation.
- A leaving mark takes no tap or focus and is hidden from a screen reader at once; a focus it held goes to the map.
- Native has never run on a device (`docs/NATIVE_UNVERIFIED.md`).
- Precedent: maplibre-gl's `fadeDuration` and Leaflet.markercluster's `animate` (`docs/research/adjacent-apps.md`, "A
  place's mark arriving and leaving as the map changes").
