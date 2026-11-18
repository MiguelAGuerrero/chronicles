# 0214. The road engine: turns are spoken from the tap, capture is unchanged, distance only, journeys to about 150 km

Date: 2026-11-18 · Status: accepted · Area: navigation, outing, vision · Follows [0213](0213-the-road-engine.md)

## Context
The road engine's plan (`specs/road-engine/plan.md`) put six questions to the owner after its measurement of real tiles (z12 is the
lowest zoom whose roads carry their direction; joined at 10 m, 98% of the road length is one part) and the steward's ten findings.

## Decision
The owner's answers, Nov 18:
- **Turns are spoken from the tap on "Drive there", with a mute on the bar.** Each turn is said once as it nears; nothing else is
  ever spoken. On a phone, guiding does not ship until speech works (the steward's S2 over the draft's "off until switched on").
- **The capture stack is unchanged while guiding**: one tap each, as on every screen. The app cannot tell a driver from a passenger.
  This also answers what decision 0207 left open about capture at driving speed.
- **Distance only**: no duration, at rest or moving.
- **About 150 km**: sixty z12 tiles a plan; a longer journey says so and keeps the straight line and Open in Maps.

Left at the plan's defaults, the owner's to overrule: a motorway is taken only when the way without it is more than half as long
again; guiding needs an open session.

## Consequences
- RE25 and D3 of the spec are settled as "spoken on tap, with a mute"; RE27 stands; D2 stands; RE7's bound is sixty tiles.
- The vision page has no line on sound: this record is the precedent that the app may speak a turn the person asked to be guided
  through, and nothing else. The page's edit is the owner's.
- Step 1 (the engine's core, nothing a person sees) is built on this go-ahead; steps 2 to 4 follow in order.
