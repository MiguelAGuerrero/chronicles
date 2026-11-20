# Places come and go with a settle on a walk (PI1-PI14)

Last exported: not from the concept doc. The owner's request and answers in this session (Nov 20) are the source.

## Vision

Idea: The owner, Nov 20: "For when points of interest come into view, there should be a little bit of a transition in and transition out. So maybe it could be a scale in and scale out or something similar." Narrowed by the owner the same day: "if I walk into and out of view or range of a point of interest, it should expand in and leave as it falls out of range".
Verb: earn (a look, not an action: a "?" coming and going as you walk is seen where it happens, as M11's turn is)
Touches: Always, "Restraint in motion, colour and copy: the content is the novelty, not the chrome" (kept: a slight overshoot, nothing staggered, no sound or haptic, nothing at the range's edge flickering); Never, "Celebration: confetti, fanfare, big numbers, accent-coloured wins" (not met: no colour, ring or sound, and the find's pulse, M12, stays the only effect a find gets); motion M9-M12, "each plays once, when its change happens in front of you, never when a screen opens or reloads" (kept, the owner's answer); `MOTION.spring`, "the one spring: settles without a visible bounce" (departed from on the owner's pick of a spring that overshoots slightly: the marks get their own token, kept slight); decision 0039 (Animated, not Reanimated: kept); decision 0230 (Explore's Places layer: unchanged).
Verdict: aligned if reshaped
Shape: The walk screen's "?" marks only, and only as walking brings them into range or takes them out, and only while they are on screen. Explore, the dots, pins and stars are unchanged. The arrival starts at 80%, fully opaque, and settles at full size with a slight overshoot (damping ratio 0.5 or more, peak 1.03 or less). Every mark of one change moves at once. There is no sound, haptic or colour change. Nothing animates when the screen opens or comes back to the front. Leaving is shorter than arriving. A mark that left moments ago comes back still, and nothing moves while riding. With Reduce Motion on, marks come and go at once.
Precedent: maplibre-gl fades labels in and out over 300 ms after the first load (`fadeDuration`, verified); Leaflet.markercluster animates markers on zoom but not markers added in bulk (`animate`, `animateAddingMarkers`, verified); Apple MapKit's marker annotations can animate as they are added (`animatesWhenAdded`, from memory, unverified).
Criteria: PI5 (never when the screen opens), PI7 (a mark that stays never plays again), PI9 (a slight overshoot, all at once), PI10 (Reduce Motion), PI11 (nothing else is animated), PI12 (only a new position moves a mark), PI13 (no flicker at the range's edge, nothing while riding).
Open: none

## What it is

On the walk screen, a "?" mark appears in a single frame as you come within range of a place, and disappears in a single frame as you leave. This slice gives it a short transition: it grows in with a slight spring as it comes within range, and shrinks out as it falls out of range.

## Decisions (the owner's calls, Nov 20)

- **Which items:** the Places "?" marks only. The Places dots, capture pins and walk stars are not animated.
- **Trigger:** walking into and out of range of a place, and only for marks on screen ("only happen when I'm in view"). Explore's zoom was first picked, then dropped: Explore's marks still appear and go at once. Pans and zooms of the walk's map, too.
- **Not when a screen opens:** the M9-M12 rule holds. Marks already there when the walk screen opens or comes back to the front draw still.
- **The effect:** a spring that overshoots slightly and settles (the owner's pick over a plain scale-and-fade), kept slight, as planned: from 80%, damping ratio 0.5 or more, peak 1.03 or less (the steward's S3, the owner's yes). This departs from `MOTION.spring` (no visible bounce) and from instant leaving; a decision record says so.

## How adjacent apps do it

- **maplibre-gl** (web map library, 6.16, our own map): labels that collide fade in and out as the map zooms, over `fadeDuration`, "the duration of the fade-in/fade-out animation for label collisions after initial map load", 300 ms by default. Not on the first load. Source: `node_modules/maplibre-gl/dist/maplibre-gl.d.ts`, read Nov 20, 2026. **Verified**.
- **Leaflet.markercluster** (web map library): `animate`, on by default, will "Animate clusters splitting and merging on zoom, and markers spreading out"; `animateAddingMarkers`, off by default, because "It's slow for many markers". Source: https://github.com/Leaflet/Leaflet.markercluster README, read Nov 20, 2026. **Verified**.
- **Apple MapKit** (iOS): `MKMarkerAnnotationView.animatesWhenAdded` makes a marker grow in as it is added to the map. It is off by default. Source: from memory, unverified. **Unverified**.

Ours follows the first two in animating only after the first load, and markercluster in not animating a set added at once (a layer switched on). Unlike maplibre's fade, it scales, as the owner asked. None of the three overshoots by default. Ours does, slightly, on the owner's pick.

## Every surface (2b)

`MarkPinView` is drawn by `WalkMap.web.tsx` and `WalkMap.native.tsx` only. The two screens that pass marks (`discoveries`) are:

- **The walk screen** (`src/app/walk.tsx`, `explore.pins`): this covers the ready screen, Navigate and the live walk, which share one map. The "?" within range, the faint ones on the way (E22) and found places. PI1-PI4.
- **Explore** (`src/app/(tabs)/explore.tsx`, `areaMarks`): not in this slice, by the owner's call. Its marks appear and go at once, as before (PI11).

The walk planner, the replay, Chronicle and a day draw no "?" marks, so nothing changes there.

## Criteria

1. **PI1** (the owner's task, in their words) When I walk into range of a point of interest it expands in, and it leaves as it falls out of range. Finding: there is no control. The mark itself is what moves, on the map the walker is already looking at.
2. **PI2** On the walk screen, a "?" that a new position brings within range grows in from 80% and settles at full size.
3. **PI3** On the walk screen, a "?" that a new position takes out of range shrinks and fades out, and only then is it removed.
4. **PI4** Only marks inside the visible map move. One that comes within range or leaves it off screen appears or goes at once.
5. **PI5** When the walk screen opens, comes back to the front or reloads, the marks it first shows draw at full size without moving.
6. **PI6** A leaving mark cannot be tapped or focused, and a screen reader does not reach it, from the moment it starts to leave. If it held the focus, the focus goes to the map, never to the page (steward S5). A mark that comes back while it is still leaving is shown once, never twice.
7. **PI7** A mark that stays on the map never grows in again: not when its row spreads or its name hides with the zoom, not when it is revealed (it still turns, M11), and not when it is found (it still pulses, M12). A faint "?" on the way that becomes a full one is a change of look, not an arrival. A mark revealed or found while it is still arriving turns or pulses at once, in place of the rest of its arrival.
8. **PI8** Leaving the walk screen takes its marks away at once, with no transition.
9. **PI9** The arrival starts at 80% or more, fully opaque, and settles within 400 ms on a spring with a damping ratio of 0.5 or more (no second visible swing), peaking at no more than 1.03 (amended Nov 20: 0.7 or more could not reach the 103% the owner agreed to). Leaving takes no longer than `MOTION.lift`. Every mark of one change starts together. The timings are tokens in `lib/enter`.
10. **PI10** With Reduce Motion on, marks appear and go at once, with no scale.
11. **PI11** Explore's "?" marks and dots, the capture pins, the walk stars and the found place's pulse look and move as before.
12. **PI12** Only a new position moves a mark (steward S1): switching Places or a kind on or off, previewing the range, setting or clearing a route, and panning or zooming the map draw marks still.
13. **PI13** A mark that left within the last 30 s comes back still, and while riding, marks come and go still (steward S2).
14. **PI14** A fix that brings marks in or takes them out renders the walk screen no more than before, and each mark that arrives or leaves creates its marker once.

## Steward (Nov 20)

- S1 accepted: only a new position moves a mark (PI12); the faint-route clause left the arrivals. The owner then dropped Explore's zoom.
- S2 accepted: no flicker at the range's edge, nothing while riding (PI13).
- S3 accepted: from 80%, damping ratio 0.5 or more, peak 1.03 or less (PI9); the owner agreed.
- S4 accepted: a decision record (the second spring, the first leave) and the precedent in `docs/research/adjacent-apps.md` (done).
- S5 accepted: focus goes to the map (PI6).
- S6 accepted: the Verb line says it is a look.
- Silent 1 (does a pan count?): the owner, no: walking range only.
- Silent 2 (a gap between dot and "?"): moot on the walk, which draws no dots; the arrival is opaque from its first frame anyway (PI9).
- Silent 3 (a reveal or find mid-arrival): the turn or pulse wins (PI7).

## Record

Not started.
