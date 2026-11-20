# Places come and go with a settle (PI1-PI14)

Last exported: not from the concept doc. The owner's request and answers in this session (Nov 20) are the source.

## Vision

Idea: The owner, Nov 20: "For when points of interest come into view, there should be a little bit of a transition in and transition out. So maybe it could be a scale in and scale out or something similar."
Verb: earn (a look, not an action: a "?" coming and going is seen where it happens, as M11's turn is)
Touches: Always, "Restraint in motion, colour and copy: the content is the novelty, not the chrome" (kept by a small overshoot and no stagger, sound or haptic); Never, "Celebration: confetti, fanfare, big numbers, accent-coloured wins" (not met: no colour, ring or sound, and the find's pulse, M12, stays the only effect a find gets); motion M9-M12, "each plays once, when its change happens in front of you, never when a screen opens or reloads" (kept: the owner's answer); `MOTION.spring`, "the one spring: settles without a visible bounce" (departed from on the owner's pick of a spring that overshoots slightly: the marks get their own token, capped); decision 0039 (Animated, not Reanimated: kept); decision 0230 (Explore's Places layer, the "?" and dots: unchanged, the dots are not animated).
Verdict: aligned if reshaped
Shape: The "?" marks only (Explore's and the walk screen's), never the dots, pins or stars. The scale-in starts at 80%, fully opaque, and settles at full size with a slight overshoot (damping ratio 0.7 or more, peak 1.03 or less). Every mark of a change moves at once, never one after another. There is no sound, haptic or colour change. Nothing animates when a screen opens or comes back to the front. Leaving is shorter than arriving. With Reduce Motion on, marks come and go at once.
Precedent: maplibre-gl fades labels in and out over 300 ms as they collide on zoom (`fadeDuration`, verified); Leaflet.markercluster animates markers splitting and merging on zoom (`animate`, on by default, verified); Apple MapKit's marker annotations can animate as they are added (`animatesWhenAdded`, from memory, unverified).
Criteria: PI5 (never when the screen opens), PI7 (a mark that stays never plays again), PI9 (a slight overshoot, all at once), PI10 (Reduce Motion), PI11 (nothing else is animated), PI13 (only the owner's two triggers), PI14 (no flicker at the range's edge, nothing while riding).
Open: none

## What it is

Today a "?" mark appears and disappears in a single frame. On Explore, zooming into a neighbourhood swaps its dots for "?" marks and zooming out swaps them back. On the walk screen, a "?" appears as you come within range and goes when you leave. This slice gives each a short transition: it scales in with a slight spring as it arrives, and scales out as it goes.

## Decisions (the owner's calls, Nov 20)

- **Which items:** the Places "?" marks only, on Explore and on the walk screen. The Places dots, capture pins and walk stars are not animated.
- **Triggers:** when zooming reveals or hides a mark, and when walking brings one into range or takes it out.
- **Not when a screen opens:** the M9-M12 rule holds. Marks already there when Explore or the walk screen opens, or comes back to the front, draw still.
- **The effect:** a spring that overshoots slightly and settles (the owner's pick over a plain scale-and-fade). The gate and the steward (S3) made it slight: from 80%, damping ratio 0.7 or more, peak 1.03 or less, every mark of a change at once. This departs from `MOTION.spring` (no visible bounce) and from instant leaving; a decision record says so.

## How adjacent apps do it

- **maplibre-gl** (web map library, 6.16, our own map): labels that collide fade in and out as the map zooms, over `fadeDuration`, "the duration of the fade-in/fade-out animation for label collisions after initial map load", 300 ms by default. Not on the first load. Source: `node_modules/maplibre-gl/dist/maplibre-gl.d.ts`, read Nov 20, 2026. **Verified**.
- **Leaflet.markercluster** (web map library): `animate`, on by default, will "Animate clusters splitting and merging on zoom, and markers spreading out"; `animateAddingMarkers`, off by default, because "It's slow for many markers". Source: https://github.com/Leaflet/Leaflet.markercluster README, read Nov 20, 2026. **Verified**.
- **Apple MapKit** (iOS): `MKMarkerAnnotationView.animatesWhenAdded` makes a marker grow in as it is added to the map. It is off by default. Source: from memory, unverified. **Unverified**.

Ours follows the first two in animating only after the first load, as a zoom changes what is shown. Unlike maplibre's fade, it scales, as the owner asked. Like markercluster's default, it never animates a whole set as it first loads.

## Every surface (2b)

`MarkPinView` is drawn by `WalkMap.web.tsx` and `WalkMap.native.tsx` only. The two screens that pass marks (`discoveries`) are:

- **Explore** (`src/app/(tabs)/explore.tsx`, `areaMarks`): the selected area's "?" (Places layer). PI2, PI3.
- **The walk screen** (`src/app/walk.tsx`, `explore.pins`): this covers the ready screen, Navigate and the live walk, which share one map. The "?" within range, the faint ones on the way (E22) and found places. PI4.

The walk planner, the replay, Chronicle and a day draw no "?" marks, so nothing changes there.

## Criteria

1. **PI1** (the owner's task, in their words) When a point of interest comes into view it transitions in, and when it goes it transitions out: a "?" mark scales in as it appears and scales out as it leaves, on Explore and on the walk screen. Finding: there is no control. The mark itself is what moves, where the reader is already looking.
2. **PI2** On Explore, a zoom that brings a selected area's "?" marks onto the map makes each of them scale in from about 60% and settle at full size.
3. **PI3** On Explore, a zoom that takes "?" marks off the map (back to dots, or out of the area's view) makes each of them scale out, and only then is it removed.
4. **PI4** On the walk screen, a "?" that appears as a new position brings it within range scales in, and one that goes as a new position takes it out of range scales out.
5. **PI5** When Explore or the walk screen opens, comes back to the front or reloads, the marks it first shows draw at full size without moving.
6. **PI6** A leaving mark cannot be tapped or focused, and a screen reader does not reach it, from the moment it starts to leave. If it held the focus, the focus goes to the map, never to the page (steward S5). A mark that comes back while it is still leaving is shown once, never twice.
7. **PI7** A mark that stays on the map never scales in again: not when its row spreads or its name hides with the zoom, not when it is revealed (it still turns, M11), and not when it is found (it still pulses, M12). A faint "?" on the way that becomes a full one is a change of look, not an arrival. A mark revealed or found while it is still arriving turns or pulses at once, in place of the rest of its arrival.
8. **PI8** Leaving a screen takes its marks away at once, with no transition.
9. **PI9** The arrival starts at 80% or more, fully opaque (so a place is never missing while dots give way to "?"), and settles within 400 ms on a spring with a damping ratio of 0.7 or more, peaking at no more than 1.03. Leaving takes no longer than `MOTION.lift`. Every mark of one change starts together. The timings are tokens in `lib/enter`.
10. **PI10** With Reduce Motion on, marks appear and go at once, with no scale.
11. **PI11** The Places dots, capture pins, walk stars and found-place pulses look and move as before.
12. **PI12** Explore's zoom that swaps a neighbourhood's dots for "?" marks costs no more renders of Explore than before, and each "?" that arrives or leaves creates its marker once.
13. **PI13** Only the owner's two triggers move a mark (steward S1): switching Places or a kind on or off, selecting an area, setting or clearing a route, and previewing the range draw marks still.
14. **PI14** On a walk, a mark that left within the last 30 s comes back still, and while riding, marks come and go still (steward S2).

## Steward (Nov 20)

- S1 accepted: only a zoom (Explore) and a new position (the walk) move a mark (PI13); the faint-route clause left PI4. Whether a settled pan counts is the owner's question.
- S2 accepted: no flicker at the range's edge, nothing while riding (PI14).
- S3 accepted: from 80%, damping ratio 0.7 or more, peak 1.03 or less (PI9).
- S4 accepted: a decision record (the second spring, the first leave) and the precedent in `docs/research/adjacent-apps.md` (done).
- S5 accepted: focus goes to the map (PI6).
- S6 accepted: the Verb line says it is a look.
- Silent 2 (the dot to "?" gap): the arrival is fully opaque from its first frame (PI9). Silent 3 (a reveal or find mid-arrival): the turn or pulse wins (PI7).

## Record

Not started.
