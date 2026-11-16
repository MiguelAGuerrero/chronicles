<!-- Repo first: written from the owner's request in a session (Nov 16, 2026), a continuation of specs/explore-go-here. Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Go here on the rest of the surfaces (GE)

Nov 16, 2026 · @Miguel Guerrero

Explore's tiles have a quiet "Go here" that opens a sheet of two choices, Chronicles or the phone's maps app (decision 0180). The owner asked for it on every other surface that shows one place and a way to start a walk to it.

## Vision

```
Idea: "Go here for the rest of the surfaces that allow it" (the owner, Nov 16): the same quick way to a place, on every surface that already offers a walk to one.
Verb: earn (Navigate: getting to a place you noticed, which feeds the walk and its moments).
Touches: 0180 (the tile's Go here: the same two choices, the same words, aligned at the gate Nov 14); 0058 (Open in Maps: only the destination, on a tap; it lists the Explore mark card and the home's Walk here as deferred); 0121 (Walk to starts at once near, asks far; "When I get there" starts nothing); Always "A route is a suggestion", "Capture is one tap away on every screen you walk or capture from" (Chronicle's surfaces carry the capture stack); Never "Several ways ranked by minutes" and "Data leaving the device without a tap" (both hold).
Verdict: aligned
Shape: One shared sheet and one set of words on every host (GH2's); the host's own Walk to or Walk here is untouched; Go here is the weakest control on its host, in ink; no minutes, no ranking. On Chronicle's surfaces it never covers or moves the capture stack.
Criteria: GE1-GE13.
Open: none (the owner, Nov 16: "the rest of the surfaces that allow it"; which those are comes from the code, below).
```

## The surfaces, from the code (decision: every host of a place with a walk to it)

`grep -rn "Walk to\|Walk here\|place-go" src --include=*.tsx`, Nov 16:

| Host | Where | Its walk today | Go here |
|---|---|---|---|
| Explore's area card footer | `AtlasCard` | "Walk to <name>" (`atlas-walk`), or When I get there far off | GE1 |
| Explore's busy areas | `AtlasCard`, `atlas-busy-area` rows | "Walk to" on a row within walking distance | GE1, GE4 |
| Explore's complexes | `AtlasCard`, `atlas-complex` rows | "Walk to" on a row within walking distance | GE1, GE4 |
| Explore's long-press card | `explore.tsx`, `walk-here` | "Walk here" at zoom 12 and over, asks when far | GE1 |
| Chronicle's star sheet | `HomeSheet`, `place-go` | "Walk here" on a selected place | GE1 |
| Chronicle's long-press card | `index.tsx`, `walk-here` | "Walk here" at street zoom (NV12) | GE1 |

Not hosts, each with its reason:
- **The walk screen** already has Go here and Open in Maps on its long-press card and pin viewer (0058).
- **The Explore mark** (`MarkPinView`) is a map pin with no pointer events, not a card; no control to attach to.
- **The walk planner and the kind walk** plan a route; a place is not their destination.
- **"The areas next door" chips and the kinds** select an area or a kind; the area's own tile has Go here.
- **Navigate, ready** and the replay show no place to go to.

## Decisions (the owner's calls)

- **Every surface above** (Nov 16: "the rest of the surfaces that allow it").
- **Inherited from 0180** (Nov 14): Chronicles first, the phone's maps app second; the sheet is a plain card, never a Modal; ink, no fill or border at rest; a saved destination is said to be replaced, once.

## Criteria

### The task, in the owner's words

1. **GE1 · Go here, from each surface.** On each host above, without opening anything further, you can ask for a way to its place. Finding criterion: someone not told where it is sees the words "Go here" with the arrow glyph on that host, in the place they would look (the card's footer, each row, the long-press card, the star sheet, Chronicle's long-press card), and taps it (cold find). Its accessible name is "Go here" plus the place's name, and its tap target is at least 44 px high.
2. **GE2 · One sheet, one set of words.** On every host the tap opens the same sheet as the tile's (GH2): two choices, Chronicles first, the maps app named for the phone second, the same hints, a close control, Back and Escape closing it, nothing saved or opened when it is closed. A host's long-press spot is named "Your spot".

### The choices

3. **GE3 · The maps app.** Each host hands its own destination to the maps app, straight from the tap: the card's walk target, the row's point, the pressed spot, the star's point. Only the destination leaves the device (0058). A maps app that won't open says so once, with the wording the tile uses (GH7). The link carries the coordinates; the label that Android's `geo:` link also carries is the area's name for an area, a complex or a street, and a neutral "Destination" for a star or a pressed spot, so the owner's own words (a star's title) never leave the device (the steward's S7, 0058).
4. **GE4 · Chronicles.** On each host Chronicles saves the place as Navigate's destination and opens Navigate, ready (0121's When I get there); no walk starts. With a walk open it does what that host's own Walk to or Walk here does with a walk open (NV10), and the Chronicles row's hint says "Routes your walk" instead of "Opens Navigate, ready", on every host including the tiles (the steward's silence 2, amending 0180's tile). A destination already saved is said to be replaced, once (0180).
5. **GE5 · Any distance, and a row too far to walk.** Both choices work at any distance and with no position fix. A busy-area or complex row too far to walk, which has no Walk to, still has Go here, whose sheet says "Opens Navigate, ready" and no distance or minutes; the far question (DW2) is never asked by Go here. On the card's footer that is only "When I get there" (too far to walk), Go here is shown too: the sheet is the way to the maps app, and its Chronicles row does the same as the footer's button (a default the owner can overrule).

### Hosts as they were

6. **GE6 · The host's own walk is unchanged.** Each host's Walk to or Walk here behaves as DW1-DW14 and NV12 say, with or without the sheet open.
7. **GE7 · Where it isn't.** The card of the area you are in, which says "You're in <area>" and has no Walk to, has no Go here; a long press below zoom 12 on Explore, and below street zoom on Chronicle (no Walk here there), has none. While a host's far question is open (the card's "Walk now / When I get there / Not now", the long-press card's asked state), Go here is not shown, so no card holds five actions (the steward's S4).

### Restraint

8. **GE8 · No minutes, no ranking, quiet.** No host shows minutes, an arrival time, "fastest", a digit of its own or a count in Go here or its sheet; the scan covers the button's and the sheet's own words, not the place's name. Go here is the weakest control on its host: a ghost text link on its own line under the host's buttons (on the cards, the star sheet and the long-press cards) or beside "Walk to" (on a row): its computed background is transparent and its border zero, never the accent. Each host has exactly one accent-filled control, as before, and at 320 px its buttons stack into no more rows than before Go here was added (0172, the steward's S2).
9. **GE9 · Capture stays one tap away.** On Chronicle's surfaces, with Go here shown, at 320 px wide, at the home sheet's peek and half heights, the long-press card sits above the capture stack without overlapping it and the pressed spot's mark stays visible (a box test); with the sheet open, the sheet's box intersects neither the camera, mic and note buttons nor the recording bar, and each answers one tap (DW13; the steward's S1, S3). On Chronicle the sheet is placed where the capture band is not (see the open choice below).
10. **GE10 · Nothing wraps, nothing is clipped.** At 320 px wide, with the longest place names, each host's Go here shows unclipped; a row keeps its name readable (it wraps to two lines at most) and the host's other control stays.

### Truth

11. **GE11 · Nothing new is kept.** The only thing saved is the destination Navigate already holds for no walk (meta `nav`); no new truth or cache, migration or dependency, and no host is asked beyond the maps app's own link on a tap. A tap is not a visit: it feeds familiarity and "New to you" nothing (GH15).
12. **GE12 · A record.** A decision record cites 0180, 0058 and 0121, lists each host above, says 0058's deferred "Explore mark card" has no card, that the home's Walk here now has Go here beside it, and that the dead-zone nudge stays deferred. It says the star sheet is a place's surface of Navigate, not a moment's toolbar, so 0114's rule on a moment's actions does not apply.
13. **GE13 · What leaves the device is the destination.** The link handed to the maps app carries the coordinates; the only label on it (Android's `geo:` link) is the area's name for an area, a complex or a street, and "Destination" for a star or a pressed spot. Neither a star's title (the owner's words) nor "Your spot" leaves the device (the steward's S7, 0058).

## Open choices (defaults taken in the plan; the owner decides)

- **Where the sheet sits on Chronicle**: at the top of the screen under the status bar (a default: it can never touch the capture band, which is at the foot), against above the card in place (reach is better, a collision is more likely).
- **Chronicle's long-press card**: Go here is offered at a bare spot named only "Your spot" (a default: yes, the same job as Explore's).
- **The far footer**: Go here is shown beside "When I get there", whose Chronicles row repeats the button (a default).

## Routes and data

No new route, truth or cache, migration or dependency. One shared hook, `useGoHere`, and the tile's sheet moves to `components/GoHere.tsx` for every host to use.

## Tests

See `plan.md`.
