<!-- Repo first: written from the owner's request in a session (Nov 14, 2026), judged at the vision gate the same day. Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Explore: Go here on every tile (GH)

Nov 14, 2026 · @Miguel Guerrero

On Explore, each area's tile gets a quick "Go here". Today you must open the card to reach Walk to. If the tile's preview is enough, you want a way to that place straight from the row, and a choice of how: the phone's maps app, or Chronicles' own Navigate.

## Vision

```
Idea: Each Explore tile gets a "go here" quick action, so you don't open the card first; it offers Apple Maps or the app's navigator (the owner, Nov 14).
Verb: earn (Navigate: getting to a place you noticed, which feeds the walk and its moments).
Touches: Always "A route is a suggestion; drifting is never nagged". Shapes: "Several routes to one point, Apple Maps style" is out, "Open in Maps hands that job to the phone's maps app". 0058: Open in Maps sends only the destination, on a tap; "the Explore mark card" was deferred there. 0121: the card's Walk to starts at once within 2 km and asks beyond; "When I get there" saves the destination and starts nothing. 0095: scenic routes belong to Navigate, not to Explore (Explore's route preview is deferred). Never "Several ways ranked by minutes; fastest as a label" (holds). Never "Data leaving the device without a tap" (holds: the Maps choice is a tap).
Verdict: aligned
Shape: As asked: one "Go here" on the tile opens a sheet of two choices, the phone's maps app and Chronicles. Chronicles saves the destination and opens Navigate, ready (0121's "When I get there"); the walk starts only on Start. No minutes, no "fastest", no ranked routes on the tile or the sheet.
Criteria: GH1-GH13.
Open: none (the owner, Nov 14: Go here on Navigate, every tile, one button opening a two-option sheet).
```

## Decisions (the owner's calls, Nov 14)

- **Chronicles means Go here on Navigate**: the destination is saved and Navigate opens ready; the walk starts on Start, never at once (0121). It works at any distance.
- **Every tile** has the action, not only the selected one.
- **One button, then a two-option sheet**, not two buttons on the tile.

## Criteria

### The task, in the owner's words

1. **GH1 · Go here, from the row.** From Explore's row of tiles, without selecting or opening a card, you can ask for a way to a place. Finding criterion: someone not told where it is sees the words "Go here" with an arrow symbol on each tile and taps it. The picture at 390 px wide with the longest name shows it fully, unclipped.
2. **GH2 · Two choices.** Tapping it opens a sheet with exactly two choices: the phone's maps app (named for the phone: "Apple Maps" on iOS and iPhones in a browser, "Google Maps" in other browsers, "Maps" on Android) and "Chronicles". A close control and Back or Escape close the sheet; nothing is saved or opened then.
3. **GH3 · The tile still selects.** A tap on the tile's body selects it, and on a selected tile opens its card, exactly as today. A tap on Go here does neither.

### The choices

4. **GH4 · The maps app.** Picking the maps app opens walking directions to the area's walk target (the one Walk to leads to) in the phone's maps app, called straight from the tap. Only the destination leaves the device (0058). Chronicles' recording and any open walk go on.
5. **GH5 · Chronicles.** Picking Chronicles saves the place as Navigate's destination and opens Navigate, ready, as "When I get there" does (DW3, DW4): no walk starts, nothing is recorded, nothing is watched. With a walk open it routes that walk there, as the card's Walk to does (NV10).
6. **GH6 · Any distance.** Both choices work at any distance, with no Walk now question and no "too far" refusal.
7. **GH7 · A maps app that won't open.** When no maps app took it, the sheet closes and says so once in words (NH8's wording); nothing else changes.

### Which tiles

8. **GH8 · Where it is, where it isn't.** Every tile that has a place to go to has Go here: the row's tiles, a town's neighborhoods and a town's heading card. The tile for where you are (the card's "here" area, with no Walk to) has none, nor has a tile with no known place.
9. **GH9 · The card is as it was.** The card's Walk to, its far-place question and its busy-street Walk to behave as DW1-DW14 say.

### Restraint

10. **GH10 · No minutes, no ranking.** Neither the tile's action nor the sheet shows minutes, an arrival time, "fastest", a count or two routes compared. The choice is two ways of being taken, not two routes.
11. **GH11 · Quiet ink.** Go here is in ink, not the accent: the accent stays for a card's single primary action (0172). Its pressed state shows.
12. **GH12 · The row keeps its shape.** Adding the action changes no tile's height and wraps nothing at 320 px wide; the row's tiles are the height they were. The capture stack stays where it is, one tap away, with the sheet open.
13. **GH13 · Nothing new is kept.** The only thing saved is the destination Navigate already holds for no walk (meta `nav`); no new truth or cache, migration or dependency, and no host is asked beyond the maps app's own link on a tap.

### Not in this slice (a line each, from the hosts of the area's Walk to)

- The card's footer and busy streets: the card already has Walk to; Open in Maps there stays deferred (0058), unless the owner asks.
- Complexes' rows, Explore's long-press card and mark card, Chronicle's Walk here, HomeSheet's `place-go`: other hosts; the owner named Explorers' tiles.

## Routes and data

No new route, truth or cache, migration or dependency. Reuses `nav/openInMaps.ts`, `nav/handoff.ts` and `useStartWalk.later`.

## Tests

See `plan.md`.
