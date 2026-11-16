# 0182. Go here on the rest of the surfaces that show a place and a way to start a walk to it

Date: 2026-11-16 · Status: accepted · Area: explore, chronicle, navigation · Extends [0180](0180-go-here-on-explore-tiles.md), [0058](0058-open-in-maps.md) and [0121](0121-drive-there-walk-back.md)

## Context
The owner, Nov 16: "Go here for the rest of the surfaces that allow it." 0180 gave Explore's tiles a quiet Go here that opens a sheet of two choices, Chronicles or the phone's maps app. The vision gate judged this extension **aligned** again (`specs/go-here-everywhere/spec.md`, Vision); the steward found one breach (the sheet could cover Chronicle's capture band) and five drifts, all accepted.

## Decision
The owner's calls, Nov 16:
- **The hosts, from the code** (`grep` of "Walk to", "Walk here", `place-go`): Explore's area card footer, its busy-area rows, its complex rows, its long-press card, Chronicle's star sheet and Chronicle's long-press card. Each gets the same Go here and the same sheet (`components/GoHere.tsx`, `useGoHere`).
- **Not hosts:** the walk screen (it already has Go here and Open in Maps); the Explore mark (`MarkPinView` is a map pin with no pointer events, so 0058's deferred "Explore mark card" has no card); the walk planner and the kind walk (a route, not a place); the "areas next door" chips and the kinds; Navigate, ready and the replay. 0058's **dead-zone nudge stays deferred**.
- **On Chronicle the sheet sits at the top**, under the status bar, so it never covers the capture band; Explore's stays at the foot. Chronicle's long-press card offers Go here at a bare spot ("Your spot"), as Explore's does.
- **Quiet, never a peer:** a ghost ink link on its own line under the host's buttons (the card's footer, the star sheet, the long-press cards) or beside "Walk to" on a row, with no fill or border at rest; never the accent, never above the primary.
- **Not while a far question is open**, nor on the card of the area you are in. A row too far to walk still has Go here (it works at any distance). The footer that is only "When I get there" shows Go here too: the sheet is the way to the maps app there.
- **What leaves the device is the destination:** the maps link carries the coordinates; Android's `geo:` link also carries a label, which is the area's name for an area, a complex or a street and "Destination" for a star or a pressed spot, so the owner's own words never leave (the steward's S7).
- **With a walk open** the Chronicles row routes that walk (NV10) and its hint says "Routes your walk"; this amends the tile's hint (0180).
- The star sheet is a place's surface of Navigate, not a moment's toolbar, so 0114's rule on a moment's actions does not apply.

## Consequences
- 0058's "Deferred: the Explore mark card, the dead-zone nudge, the home's Walk here": the home's Walk here now has Go here beside it; the mark card has no card; the nudge stays deferred.
- `atlas/goHere.ts` gains `rowActions`, `cardCanGoHere`, `spotCanGoHere` and `shareLabel`; `GoHereSheet` moves to `components/` and takes an `anchor` and `walkOpen`.
- Native: Apple Maps from each host and the sheet have never run on a device (`docs/NATIVE_UNVERIFIED.md`).
