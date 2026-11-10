# 0113. Drive there, walk back: a far Walk to asks first, the walk starts on your tap, and Walk me back leads to where the ride ended

Date: 2026-11-10 · Status: accepted · Area: explore, navigation · Amends [0021](0021-start-just-starts.md) and [0049](0049-explore-tab-hint-and-long-press-card.md) for Explore's area card

## Context
The owner drives to some of the places they pick on Explore. The area card's Walk to started a walk at once, so the drive was recorded inside it (as a ride, 0040), and Walk me back led to where they got in the car, not to where they got out. They proposed waypoints, or a choice of the walk-back point. The vision gate judged it **aligned if reshaped**: no waypoints (a list to work through, and pins that aren't moments), and the walk-back point found from the trace (`specs/drive-then-walk/spec.md`, Vision).

## Decision
The owner's calls, Nov 10:
- **Walk to asks only when far.** On Explore's area card, a place within 2 km in a straight line starts at once, as before (0021 holds for it). A place past 2 km, or any place with no fix from the last 30 minutes, asks "Walk now" or "When I get there". A place too far to walk (past 10 km) offers "When I get there" alone, in place of "Too far to walk from here".
- **"When I get there" starts nothing.** It saves the place as Navigate's destination (a second way to fill it, beside the long press: NV23, NR8), and opens Navigate, ready.
- **The walk starts on your tap, never on arrival** ("not when the app detects they're at the place … to avoid issues of finding parking and such"). Nothing watches for arrival: no location is read before Start, and being at the place starts, offers and says nothing.
- **Walk me back leads to where the last ride ended**, the first walked point after it, or to the start with no ride. It is read from the trace each time, never stored.
- **"Walk back here"** on the walk map's press-and-hold card sets the point by hand for this walk (meta `way_back`), said once in words; Stop clears it.
- **No waypoints**, pins or lists.

## Consequences
- `nav/wayBack.ts` (core): `landingOf`, `wayBackTarget`; `startPlan.ts`: `walkToChoice`, `GET_THERE_M`, `FRESH_FIX_MS`.
- The labels are words: "Walk me back to the start", "… to where the ride ended", "… to the spot you chose" (the steward's S8: "got off" named a bus).
- Deferred: Explore's long press, Chronicle's Walk here and the walk planner still start at once; Open in Maps on the card (0058).
- Native: nothing new; never run on a device.
