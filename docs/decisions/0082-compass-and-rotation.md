# 0082. The map can be turned by hand; a compass appears while it is, and sets north again

Date: 2026-11-04 · Status: accepted · Area: map, navigation · Amends [0030](0030-map-stays-north-up.md)

## Context
The map was north-up and could not be turned on purpose (0030, after a phone's course pointed the wrong way). The owner asked for a compass to reorient, like other navigation apps. Researched: Apple Maps and Google Maps show a compass only while the map is turned and a tap sets north up; MapLibre's own control sits top right.

## Decision
The owner's calls (Nov 4):
- The map stays north-up by default and opens north-up every time (the bearing is never stored).
- Two fingers may turn it. Following, Locate, Recenter and fits never turn it, so 0030's reason (a wrong course) still holds. No tilt, no right-drag turn on the web.
- A round 44 pt compass shows only while the map is turned more than 1° from north, in the right-edge column above Locate (the top of the walk's column, so no other button moves); a tap eases the map back to north, keeping centre and zoom.
- On the walk screen, Navigate and Explore. Not the replay, a day or Chronicle.

## Consequences
- `lib/compass.ts` (`showsCompass`, `compassRotation`), `components/CompassButton.tsx`, `onBearingChange` and `resetNorth()` on the map.
- A turn stops following like a pan does (it already did on the web).
- 0030's "the map stays north-up" now means the default, not a lock; the cone still shows the way you walk.
