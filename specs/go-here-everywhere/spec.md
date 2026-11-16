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
Criteria: GE1-GE12.
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

3. **GE3 · The maps app.** Each host hands its own destination to the maps app, straight from the tap: the card's walk target, the row's point, the pressed spot, the star's point. Only the destination leaves the device (0058). A maps app that won't open says so once, with the wording the tile uses (GH7).
4. **GE4 · Chronicles.** On each host Chronicles saves the place as Navigate's destination and opens Navigate, ready (0121's When I get there); no walk starts. With a walk open it does what that host's own Walk to or Walk here does with a walk open (NV10). A destination already saved is said to be replaced, once (0180).
5. **GE5 · Any distance, and a row too far to walk.** Both choices work at any distance and with no position fix. A busy-area or complex row too far to walk, which has no Walk to, still has Go here; the far question (DW2) is never asked by Go here.

### Hosts as they were

6. **GE6 · The host's own walk is unchanged.** Each host's Walk to or Walk here behaves as DW1-DW14 and NV12 say, with or without the sheet open.
7. **GE7 · Where it isn't.** The card of the area you are in, which says "You're in <area>" and has no Walk to, has no Go here; a long press below zoom 12 on Explore, and below street zoom on Chronicle (no Walk here there), has none.

### Restraint

8. **GE8 · No minutes, no ranking, quiet.** No host shows minutes, an arrival time, "fastest", a digit of its own or a count in Go here or its sheet. Go here is the weakest control on its host: ink, no fill or border at rest where it is a link, and a secondary (not the accent) button where its host's controls are buttons; the host's primary action keeps the accent (0172).
9. **GE9 · Capture stays one tap away.** On Chronicle's surfaces, with Go here shown and with the sheet open, at 320 px wide, the camera, mic and note buttons stay where they were, visible and answering one tap each (DW13).
10. **GE10 · Nothing wraps, nothing is clipped.** At 320 px wide, with the longest place names, each host's Go here shows unclipped; a row keeps its name readable (it wraps to two lines at most) and the host's other control stays.

### Truth

11. **GE11 · Nothing new is kept.** The only thing saved is the destination Navigate already holds for no walk (meta `nav`); no new truth or cache, migration or dependency, and no host is asked beyond the maps app's own link on a tap. A tap is not a visit: it feeds familiarity and "New to you" nothing (GH15).
12. **GE12 · A record.** A decision record cites 0180, 0058 and 0121, lists each host above, and says 0058's deferred "Explore mark card" has no card and the home's Walk here now has Go here beside it.

## Routes and data

No new route, truth or cache, migration or dependency. One shared hook, `useGoHere`, and the tile's sheet moves to `components/GoHere.tsx` for every host to use.

## Tests

See `plan.md`.
