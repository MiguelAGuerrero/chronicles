# 0219. Where I've been: the unwalked-streets button goes, a layer draws earlier walks

Date: 2026-11-18 · Status: accepted · Area: map, layers, walk screen, storage · Amends [0011](0011-unwalked-streets-named-only.md) (the count) and [0028](0028-green-trace-quiet-fog.md) (the bold fog), and [0097](0097-map-layers.md)'s "the unwalked-streets toggle stays"

## Context
The owner, Nov 18: "Let's remove the unwalked streets button because the trace already provides that information implicitly.
That said, let's provide a layer to show previous traces so that we can toggle on or off where I've been."

The walk screen's footsteps button greyed the base map (the veil), drew the fog of unwalked streets bold, and showed a pill
"N unwalked nearby" in digits (a debt against "counts are words", `docs/DEFERRED.md`). Nothing drew an earlier walk's own
line: only its snapped streets, in ink. The vision gate (`/vision`, decision 0094) found the idea **aligned**; the steward found
four drifts and one tone note, all accepted into the spec (`specs/where-ive-been`, WB1-WB17).

## Decision
The owner's calls, Nov 18:
- **The button goes**, with its veil, its bold fog and its pill. **The quiet fog and the ink walked streets stay** as they are,
  always drawn.
- **A fourth layer, "Where I've been"**, in the one Layers panel the walk screen (ready and live) and Explore share (0097: one
  setting per layer for every map with the panel), off by default.
- **Faded green, thinner**: today's green made pale (`COLORS.past`, `#7fbf8f`), 2.5 px, no white edge, under today's trace, the
  route and the ink, over the fog.
- **Every earlier walk in the area shown**: within 5 km of the screen's layer centre; no date window, no picker, nothing counted.
- **One even tone**: opaque, so two walks over one street look the same as one. The layer says where, never how often (the
  owner chose this over a Strava-style heatmap of their own walks).
- **A cache of each walk's line** (the data model): its walked line simplified within 5 m, its bounds and the z12 tiles it
  crosses, tagged with a rule code (`LINE_CODE`). SQLite migration 30 (`walk_line`, `walk_line_tile`), IndexedDB version 23.
- **The ink stays on top** with the layer on: a street walked before shows its ink over the pale green (the owner, at the plan's
  review).

The steward's four drifts, accepted (Nov 18): only Explore's main map draws the layer, never a tile or an area's ring (S1;
0066's same-scale rings would read as coverage gauges); the fog's paint is unchanged with the layer on and the past line is
quieter than the trace (S2); older walks are prepared without the lines spreading outward walk by walk (S3); a gap filled
only by the app's inference stays a break, only fixes and gaps the walker kept draw (S4). The layer's verb is earn; Return
(a tap on a line opening its walk) is deferred (S5).

## Precedent
From `docs/research/adjacent-apps.md`, "Where you have been": Google Maps Timeline shows one day's path at a time, on the
device (verified); Apple Maps Visited Places keeps places, not lines (verified); Fog of World fogs the map except where you have
been and adds a percentage and levels (unverified; the fog is the model, the percentage a counter-example); Strava's personal
heatmap overlays every activity, brighter where repeated (from memory, unverified; the brightness a counter-example). No
verified app draws every past line at once; the owner chose it knowingly.

## Consequences
- `EDGE_INDEX` loses `unwalked`: locate, back, compass. The compass hands focus to Walk me back, else Recenter, else the map
  (`WalkMapHandle.focus()`).
- `WalkMapProps.fogEmphasis` is gone; the veil stays for the replay and a day (0199).
- `pastLines/` (core, shell, instance, `usePastLines`): Stop builds the walk's line, a gap decision drops it, the layer prepares
  stale lines one walk at a time nearest the centre first. `purgeDerived` keeps the lines: they read no tiles.
- **Proposed edit to `docs/VISION.md`** (the owner makes it): a Shapes row, "Where I've been (your own walks on the map) |
  aligned | A layer off by default; every earlier walk's walked line in one even, pale tone; no count, date or coverage; the fog
  stays faint", and 0219 in Precedents.
