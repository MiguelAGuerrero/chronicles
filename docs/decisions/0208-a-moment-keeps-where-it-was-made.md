# 0208. A moment keeps where it was made, whatever the outing was doing

Date: 2026-11-18 · Status: accepted · Area: moments, memories, outing · Follows [0203](0203-the-session-is-an-outing.md) and [0207](0207-a-journey-is-carried-like-a-trip-plan.md)

## Context
The second audit of the outing journey asked what a moment captured on the drive between towns carries as its context: the plan is
never stored, so it cannot say where the outing was headed, and the vision says a moment never arrives bare. Looking at the code
answered half of it: a moment's fix is always kept, but its context line took its town from the outing's one name (`walk.area`,
picked at Stop for the title), so a moment made in the first of three towns read as being in whichever one named the outing.

## Decision
The owner, Nov 18: "The moment should still be able to capture the location at the time, regardless of the status of a drive,
whether public transport or whatever. So while the destination isn't occupied, there are still interim locations."

- **A moment's place is where it was when it was made**, by any means of travel: its own fix, and in words the smallest area its
  outing was in at that time (a neighborhood before its town; between towns, the larger place that is known, the state today).
  Never the outing's destination, and never a town the moment was not in.
- The outing's one name stays what it is: a title for the outing, and the place of a moment only when the outing has no areas yet
  (still open, or recorded before areas were kept).

## Consequences
- `resurface/context.ts` `placeAt` (MC18), read from the areas each outing was placed in (ridden stretches already count there, R8);
  one read of them for a batch of context lines. No new store.
- Between towns the line can only say the state: a road's name, or a county, would need the map read there. A session still open has
  no areas until Stop, so its moments' lines name no town until then. Both are recorded as left for later.
- Native: nothing here has run on a device.
