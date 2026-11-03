# 0069. A gap's way can be drawn, and the guess fits the time

Date: 2026-11-03 · Status: accepted · Area: trace, gaps, map · Follows [0068](0068-uncertain-gaps-are-offered.md)

## Context
On the Lehigh Parkway walk (Nov 3), the owner followed a path that looped during an 8-minute gap; the guess, the shortest way, would have cut across. The owner asked for a way to trace the path on the map.

## Decision
The owner's calls:
- Both: drawing, and a better guess.
- Drawing is taps snapped to the mapped paths, not freehand. A tap more than 40 m from any path joins in a straight line.
- Drawing is on the replay and the walk screen, from the gap's card, on any gap: offered, filled, kept, dismissed, or with nothing to offer. A gap with no line is joined by a thin dotted grey line to tap.
- The guess prefers the way whose length fits the gap's time at the walk's own pace, among the shortest ways the time allows. The fit is an offer, never filled by itself. A way turning at junctions more than two times more than the shortest is never taken: a loop off the way, not a zig-zag round blocks (added after a grid test showed one).

## Consequences
- A drawn way is a kept decision (`gap_fill`), so no new table; the newest decision on a gap wins, which is how drawing brings a dismissed gap back.
- No `SNAP_RULES` bump: the fit only changes offers, which count for nothing.
- Spec: `specs/gap-drawing/spec.md` (GW1-GW8, GT1-GT3).
