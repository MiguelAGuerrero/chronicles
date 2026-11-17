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
Criteria: GH1-GH15.
Open: none (the owner, Nov 14: Go here on Navigate, every tile, one button opening a two-option sheet).
```

## Decisions (the owner's calls, Nov 14)

- **Chronicles means Go here on Navigate**: the destination is saved and Navigate opens ready; the walk starts on Start, never at once (0121). It works at any distance.
- **Every tile** has the action, not only the selected one.
- **One button, then a two-option sheet**, not two buttons on the tile.

## Criteria

### The task, in the owner's words

1. **GH1 · Go here, from the row.** From Explore's row of tiles, without selecting or opening a card, you can ask for a way to a place. Finding criterion: someone not told where it is sees the words "Go here" with an arrow symbol on each tile and taps it (cold find). Its accessible name is "Go here" plus the place's name, and its tap target is at least 44 px high. The picture at 390 px wide with the longest name shows it fully, unclipped.
2. **GH2 · Two choices.** Tapping it opens a sheet with exactly two choices, Chronicles first and the phone's maps app second, neither marked better. The maps row names the app that gets the destination before the tap: "Apple Maps" on iOS and iPhones in a browser, "Google Maps" in other browsers, "Maps" on Android. The Chronicles row's hint says "Opens Navigate, ready". A close control and Back or Escape close the sheet; nothing is saved or opened then.
3. **GH3 · The tile still selects.** A tap on the tile's body selects it, and on a selected tile opens its card, exactly as today. A tap on Go here does neither.

### The choices

4. **GH4 · The maps app.** Picking the maps app opens walking directions to the area's walk target (the one Walk to leads to) in the phone's maps app, called straight from the tap. Only the destination leaves the device (0058). Any open walk goes on. On native, recording goes on; on the web the row carries `HANDOFF_HINT`, that recording pauses while Chronicles is hidden (0058).
5. **GH5 · Chronicles.** Picking Chronicles saves the place as Navigate's destination and opens Navigate, ready, as "When I get there" does (DW3, DW4): no walk starts, nothing is recorded, nothing is watched. With a walk open it behaves exactly as the card's Walk to does (NV10). When a destination was already saved, the sheet says once, in words, that it replaces it ("Replaces where you were heading"), and the Chronicles row shows no other change.
6. **GH6 · Any distance.** Both choices work at any distance, with no Walk now question and no "too far" refusal.
7. **GH7 · A maps app that won't open.** When no maps app took it, the sheet closes and says so once in words, with the wording Open in Maps already uses for a failed hand-off (NH8, `nav/openInMaps` callers); nothing else changes.

### Which tiles

8. **GH8 · Where it is, where it isn't.** Every tile whose area has a point (`area.at`) has Go here: the row's tiles, a town's neighborhoods and a town's heading card. With no position fix, every such tile still has it and both choices work (the tile says no distance, as today; 0121's planning case). Only the tile for where you are (the card's "here" area, with no Walk to) and an area with no point have none.
9. **GH9 · The card is as it was.** The card's Walk to, its far-place question and its busy-street Walk to behave as DW1-DW14 say.

### Restraint

10. **GH10 · No minutes, no ranking.** Neither the tile's action nor the sheet's own words show minutes, an arrival time, "fastest", a digit or a count, or two routes compared (the place's name, which may hold digits, is not the sheet's words). The choice is two ways of being taken, not two routes.
11. **GH11 · Quiet ink.** Go here is in ink, not the accent: the accent stays for a card's single primary action (0172). It is the weakest element on the tile: no fill or border at rest, its type no larger than the tile's meta line. Its pressed state shows.
12. **GH12 · The row keeps its shape.** Every tile in the row is the same height, with a slot for Go here whether or not that tile has the action; on a town tile both Go here and "See its neighborhoods" show unclipped at 320 px wide, and nothing wraps. The picture shows a plain tile, a town tile and the heading card. Explore has no capture stack (it is on the walk screen), so the sheet covers none of the tab bar.
13. **GH13 · Nothing new is kept.** The only thing saved is the destination Navigate already holds for no walk (meta `nav`); no new truth or cache, migration or dependency, and no host is asked beyond the maps app's own link on a tap.

### Not in this slice (a line each, from the hosts of the area's Walk to)

- The card's footer and busy streets: the card already has Walk to; Open in Maps there stays deferred (0058), unless the owner asks.
- Complexes' rows, Explore's long-press card and mark card, Chronicle's Walk here, HomeSheet's `place-go`: other hosts; the owner named Explorers' tiles.

### Records and restraint of reach

14. **GH14 · A record.** A decision record cites 0058 and 0121 and lists the tile as a host of Open in Maps and of "When I get there"; the Chronicles row says it opens Navigate, ready, so no walk starting is no surprise, though the card's Walk to within 2 km does start one.
15. **GH15 · A tap is not a visit.** A Go here tap, either choice, never feeds familiarity, "New to you" or any list of places you went to: nothing is read from it later.

## Routes and data

No new route, truth or cache, migration or dependency. Reuses `nav/openInMaps.ts`, `nav/handoff.ts` and `useStartWalk.later`.

## Tests

See `plan.md`.

## Record (Nov 14)

- **Passed:** GH1-GH15, by `src/lib/__tests__/explore/goHere.test.ts` (GH2, GH5, GH6, GH8, GH10, GH14, GH15) and the journey `gohere` (GH1-GH13), the journeys the files reach, typecheck and lint.
- **Cold find:** found once a tile is centred; not found on a tile peeking at the row's edge (its action is off-screen until the row scrolls it in, which selects it). Left-aligned so more shows; the limit is the row's own and is in `docs/DEFERRED.md`.
- **UI review:** U1 accepted (`explore-go-here ui 1`, the maps row's external glyph), U4 accepted (`explore-go-here ui 2`, 8 px between rows). U2 (rename the Chronicles row) rejected: "Chronicles, Opens Navigate, ready" is the spec's words; U3's ✕ is already 44 px, and no scrim is by design (GH12); swipe-down is not built. U5-U7 are opinion: the quiet defaults stand.
- **Deferred:** the other hosts of Walk to (a line each in `docs/DEFERRED.md`).
- **Not audited** (`/audit` is the owner's to ask). Native has never run on a device: Apple Maps from the sheet and the sheet itself (`docs/NATIVE_UNVERIFIED.md`).

