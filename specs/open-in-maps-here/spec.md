<!-- Repo first: written from the owner's request in a session (Nov 17, 2026), after the owner found "Walk here" and "Go here" confusing. Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Open in Maps beside Walk: two controls named for where you end up (OM)

Nov 17, 2026 · @Miguel Guerrero

"Walk here" and "Go here" read as the same job, and they are not: the first starts a recorded walk that Chronicles guides, the second only got you there, through Chronicles' Navigate or the phone's maps app. The owner asked for the UI to be reimagined so the difference is clear: **just opening Maps** against **walking there through the app itself**. This slice replaces "Go here" and its two-choice sheet (decisions 0189 and 0190) with a plain "Open in Maps ↗" beside the walk action.

## Vision

```
Idea: "Reimagine the UI so there is a clear distinction between just opening Maps and walking there through the app itself" (the owner, Nov 17).
Verb: earn (Navigate: getting to a place you noticed; the walk it starts feeds the moments).
Touches: 0058 (Open in Maps hands the destination to the phone's maps app: only the destination, on a tap; the Shapes table: "Open in Maps hands that job to the phone's maps app"); 0121 (Walk to asks when far; "When I get there" saves the destination and starts nothing); 0189 and 0190 (Go here and its sheet, superseded here, their hosts and privacy kept); Always "A route is a suggestion"; Never "Several ways ranked by minutes" and "Data leaving the device without a tap" (both hold).
Verdict: aligned
Shape: Every host shows two controls named for the outcome: the host's walk action (the accent: Chronicles guides and records) and "Open in Maps ↗" (outlined, an external-link glyph: leaves the app, nothing recorded). No sheet, no choice to make after the tap.
Criteria: OM1-OM14.
Open: none (the owner, Nov 17: two outcome-named buttons, both on every Explore tile).
```

## Decisions (the owner's calls, Nov 17)

- **Two outcome-named buttons** on every host, in place of "Go here" and its sheet (over a single "Take me there" with an explaining sheet, and a split button).
- **Both on every Explore tile**, as two half-width buttons: the walk action on the left, Open in Maps ↗ on the right.
- **A tile 2-10 km away, or with no fresh fix, opens the card with its question showing** (Walk now / When I get there), over silently saving it for later; **past 10 km the button reads "Set as destination"** (over "When I get there"); **the walk screen's own "Go here" becomes "Route here"** so the word is gone from the app (all the owner, Nov 17, answering the steward's findings S1, S2, S5).
- Kept from 0189 and 0190: the hosts, the rules for where each shows, and what leaves the device (coordinates, and a neutral label for a star or a spot).

## What stays and what goes

- **Stays:** "Walk to <place>" on the card footer, "Walk here" on the long-press cards and the star sheet, "When I get there" on the card for a far place, and the walk screen's own Open in Maps and routing (its "Go here" label becomes "Route here", OM13).
- **Goes:** the quiet "Go here" link, the sheet (`GoHereSheet`, `useGoHere`), its Chronicles row, the "Replaces where you were heading" line, the sheet's Back and Escape handling.

## Criteria

### The task, in the owner's words

1. **OM1 · Two controls, two outcomes.** On every host, the walk action and "Open in Maps ↗" sit together and say where you end up: the walk action keeps its accent look and its words ("Walk to <place>", "Walk here", "Walk there" on a tile); Open in Maps is outlined, in ink, with the words "Open in Maps" and an external-link glyph. Finding criterion: someone not told which is which, shown only the picture of a host, says the first guides and records a walk and the second opens the phone's maps app (cold find, both tasks). The words "Go here" appear nowhere in the app: the walk screen's long-press card and a pin's viewer, which route you inside a walk, now say "Route here" (OM13).
2. **OM2 · Open in Maps does one thing.** A tap opens the phone's maps app with walking directions to the host's place, called straight from the tap. No sheet, no second choice. Only the destination leaves the device (0058). It saves nothing (no destination, no walk, nothing familiarity or "New to you" reads), works at any distance and with no position fix. A maps app that won't open says so once, in the words Open in Maps already uses ("Couldn’t open a maps app.").
3. **OM3 · Its name and its hint.** Each control's spoken name is "Open in Maps, <place>"; its hint is `HANDOFF_HINT` (on the web, recording pauses while Chronicles is hidden: said only on the web). Each is at least 44 px high.

### Where it is

4. **OM4 · The hosts.** The seven hosts of 0190 each carry both controls: an Explore tile, the area card's footer, a storefront row, a complex row, Explore's long-press card, Chronicle's star sheet and Chronicle's long-press card. Rows too far to walk still carry Open in Maps.
5. **OM5 · Where it isn't.** As 0190: not on the tile or card of the area you are in, nor while the card's far question is open, nor on a long press below its zoom (Walk here's own condition); an area with no point has none.
6. **OM6 · The tile's two buttons.** The foot of an Explore tile holds two half-width 44 px buttons, outside the tile's own tap (a tap on the tile still selects it, and on a selected one opens its card). Left: the walk action. Right: Open in Maps ↗. Every tile keeps the strip, so every tile stays one height; the area you are in leaves it empty.
7. **OM7 · The tile's walk button names what its tap does, at every distance (0121).** Within 2 km with a fresh fix it is "Walk there" and starts the same walk the card's Walk to starts, to the same place. Farther than 2 km, or with no fresh fix, it is still "Walk there" and opens that area's card with the card's own question showing (Walk now / When I get there): a tile never starts a walk past 2 km or with no fresh fix, and never saves a destination silently. Past 10 km (too far to walk, N5) it reads "Set as destination", hint "Saves it in Navigate; starts nothing", and saves the place as Navigate's destination and opens Navigate, ready (DW3). With a walk open, "Walk there" routes that walk as the card's Walk to does (NV10), with no question. A tile's Walk there is busy ("Starting…") while a walk starts, and a failure is said the way Explore says it today.

### Restraint and shape

8. **OM8 · One accent at rest.** Open in Maps is never the accent (0172). Each card or sheet has one accent-filled control, the walk action (on a row, where Walk to is a text link, none). Across Explore's row at rest at most one control is accent-filled: the selected tile's Walk there; every other tile's two buttons are outlined, in ink (a 390 px picture of the row shows three tiles and one accent). No minutes, arrival time, "fastest", count or ranking in either (VISION: several ways ranked by minutes).
9. **OM9 · Fits at 320 px.** Nothing is clipped or overlaps at 320 px wide with the longest names (a complex row with the longest name; a tile): tile buttons stay one line, a star sheet's two buttons wrap to a second line, a row's Open in Maps sits under its name. Every tile is one height.
10. **OM10 · What leaves the device is the destination.** The link carries the coordinates; the only label on it (Android's `geo:` link) is the area's name for an area, a complex or a street, and "Destination" for a star or a pressed spot (0190's rule, kept).
11. **OM11 · The sheet is gone.** No `go-here-sheet`, no `useGoHere`, no sheet Back or Escape handler, and `pageBack`, the card and Chronicle's home sheet know nothing of one.
12. **OM12 · A record.** A decision record supersedes the two-choice sheet and "Go here" of 0189 and 0190 (it cites both and 0058 and 0121), lists the hosts, says Chronicles' own navigator is reached through Walk to, Walk here and When I get there, and says the walk screen's label became "Route here". The criteria GH1-GH15 and GE1-GE13 are retired by it (`RETIRED`).

### In the walk

13. **OM13 · "Route here".** The walk screen's long-press card and its two other "Go here" buttons, and the pin viewer's menu item (`viewer-go`), say "Route here"; what they do (choose a route, then navigate inside the walk) and their test ids are unchanged. Open in Maps beside them is unchanged (0058).

### States and speech

14. **OM14 · States, and what a screen reader hears.** With no position fix, every tile still has both buttons (its walk button opens the card, as OM7 says). A town's heading card (`wide`) and a drilled town tile carry the same two buttons as any tile. A tile's buttons sit outside the tile's own control, so a screen reader reads the tile, then its walk button, then Open in Maps; "Walk there" has a spoken name with the place ("Walk there, <place>") and the "Set as destination" button its hint. Open in Maps says it failed in Explore's banner and, on Chronicle, in Chronicle's banner, once.

## Routes and data

No new route, truth or cache, migration or dependency. Reuses `nav/openInMaps.ts` and `useStartWalk` as they are.

## Tests

See `plan.md`.
