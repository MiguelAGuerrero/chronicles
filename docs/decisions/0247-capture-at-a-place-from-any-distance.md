# 0247. Capture at a place from any distance

Date: 2026-11-20 · Status: accepted · Area: explore, captures · Amends: 0246 (its "Within 60 m only"), `specs/capture-at-a-place` CA9 · From: `/fix poi-any-distance`

## Context
Since 0246 a place's card offered Camera, Voice and Note only within 60 m of the place's point. A place is one point,
and a large structure is not: on a long bridge whose point stood at its far end, the owner was on the bridge and could
not keep a moment with it. The owner: "as long as the point of interest is in range, I can click on it from anywhere.
This is just a fallback for cases such as these where the point of interest is actually a really large structure, but
its point on the map just doesn't reflect its actual size." And of a monument photographed from far off because it
looked good: "it's still a moment with the monument."

## Decision (the owner's answers, Nov 20)
- The card's capture row is offered at any distance (asked against: the walker's range setting, a wider reach only for
  big kinds, the structure's real footprint as a data slice).
- A "?" card offers it too. Its line describes ("Walk within 60 m to see what it is. Camera, Voice or Note here keeps the
  moment with it."), and its buttons speak "this place", never the name; the moment kept finds the place, which names it
  as any find does.
- A found place's "Moments here" lists the moments within 60 m by spot, as before, and the moment that found it,
  wherever it was taken: its find row already links it, so no schema change.
- Later captures from an already found card, taken far off, stay plain moments at their own spot and are not listed.
  Storing the place on every card capture is deferred to a slice (a new stored link and migrations; it would reverse
  0246's "no new stored link").

## Consequences
`cardCapture` reads no distance. Route here is a secondary button whenever the row shows, so on every place's card. A
moment kept from far off keeps its own spot and context line (where the walker stood), never the place's point; the
find names the place. A plain capture from the stack still never finds (CA6). `PLACE_REACH_M` (60 m) now bounds only the
found card's by-spot list.
