# Plan: places on the ready map (RQ1-RQ17)

For the owner's review before any code. Branch `slice/ready-map-places`, from `main` at `ef78794`.

**The base it lands on** (`node scripts/tend.js base explore walk-screen layers`; this checkout is shallow, so the
reading may be incomplete):

- lands on a rough base: explore (a change since its sweep added a screen or a control (6e79b28))
- lands on a rough base: walk-screen (a change since its sweep added a screen or a control (1b4d486, 6e79b28))
- layers is unseen: nothing above low open (never swept)

## How it was found

The owner, standing in Capitol Square, Richmond (Nov 21), saw nothing on Navigate's map before Start. Measured that day:

- The data is there. The map tiles (OpenFreeMap build `20261115_080022_pt`) and the places archive
  (`places-us-20261118.35`) give about forty markable places within 400 m of the square through the app's own
  `placesFromTilePois` and `placesFromArchive` (the State Capitol 10 m, George Washington 24 m, the Governor's
  Mansion 98 m, Old City Hall 118 m, Mile Marker 0 124 m ...).
- The live site at that position: Explore's map zoomed in on the square draws "?" marks; a started walk with Places
  turned on draws them (Old City Hall named); the ready map, with its Places switch on, draws none.
- The cause: `useExplore` runs on the walk screen while no walk is open but reads and loads nothing without a
  `walkId` (`useExplore.ts`, `if (!here || !opts.walkId) return`), and the ready map's `WalkMap` is given no
  `discoveries`. MD11's test checks only that `useReady.tsx` mentions `layers.on.places` (for the ring).

## Files to touch (6 source files)

| File | Change |
|---|---|
| `src/lib/explore/explore.ts` (core) | `placesSurface({ walkOpen, walkPlaces, readyPlaces, readyActive })`: the one decision of what the walk screen's places do: `{ places, reads, alerts, card: 'walk' \| 'ready' \| null }`. Before Start: places and reads follow the ready map's Places while the ready screen is in front; alerts never. On a walk: as today. |
| `src/lib/explore/useExplore.ts` (view hook) | Takes `ready: boolean`. Reads and item loads run with a walk or `ready` (no other change to the read: same queue, same failure wait, `readCentre`'s rules). The pocket alert reads `alerts`, so it never fires before Start. `record` already does nothing without a walk (RQ8). |
| `src/components/walk/useReady.tsx` (view) | Returns `fix`, `placesOn` (the ready map's `layers.on.places`), `active` and `chooseDest`, which it already has inside. Nothing it draws changes. |
| `src/app/walk.tsx` (route) | While no walk is open, `useExplore` is given the ready map's fix, Places and `ready: true`; the ready `WalkMap` gets `discoveries={explore.pins}`, `spreadMarks` and `onDiscoveryPress`, opening the ready card. The live walk's wiring is unchanged. |
| `src/components/walk/ReadyPlaceCard.tsx` (new, view) | The card (RQ6, RQ7, RQ13-RQ16): title as the walk's card words it, distance in words, the reach line (`mark-reach`), "Moments here" for a found place (`explore.momentsAt`), "Set as destination" (primary, `kind: 'find'` with the place's key), `OpenInMapsButton`, close. Placed by the walk's `cardAt` (above the bar, left of the stack). Built from the walk card's styles, without the capture row. |
| `src/lib/layers/notes.ts` (core) | The Places row's note takes the ready read's state: "Reading…" or "Not available now" (the words Walkability's row already uses), else the range as today (RQ17). |

`npm run book:files -- HEAD --max-src 8` is checked before the review.

## Data

No new truth, no migration. Two things change in what is written, both in existing derived or kept stores:

- **Default for the owner to overrule:** a read on the ready map builds the area's checklist (`checklist_area`,
  `checklist_item`, `explore_read`), as a walk's read does today. These are the same rows a walk would build there a
  moment later; nothing is a find, and no walk is touched.
- Nothing about a find changes: a find still needs a walk and a capture on a place's card (decision 0224).

## Tests per criterion

Unit tests in `src/lib/__tests__/explore/readyPlaces.test.ts` (feature `explore`), written failing first as
`{ todo: ... }` literals (so `check:test-first` can read them; the MD gap, decision 0234):

- `RQ2: before Start, the places shown are visibleMarks around the ready fix within the range` (core over fake items)
- `RQ4: with Places off before Start, placesSurface draws nothing and reads nothing`
- `RQ5: before Start, a read is allowed only while the ready screen is in front, through the same queue and failure wait`
- `RQ8: before Start, placesSurface never alerts and gives the ready card, never the walk's capture card`
- `RQ9: a walk opened from the ready map takes the walk's layers, not the ready map's`
- `RQ11: no copy in ReadyPlaceCard or the ready map's wiring says how many, left or nearby to find` (source scan)
- `RQ14: Set as destination from a ready "?" is a find destination with the place's key`
- `RQ17: the Places note says reading or not available while a ready read runs or failed, never a count` (over `layerNotes`)
- MD11's test is rewritten to check the "?" as well as the ring (none deleted).

Journey: the `marks` journey gains a ready-map section (`walk` already holds MD11's ring checks and is left alone):

- RQ1, RQ2: at the fixture area, on Navigate before Start, `mark-pin`s are drawn and named by their spoken labels;
  turned off from Layers → Places, none; on again, back.
- RQ3: the range slider at 60 m and 200 m changes which pins are drawn.
- RQ6, RQ7, RQ12: a tap opens the card (a dialog; title, "Set as destination", Open in Maps, no `mark-camera`);
  "Set as destination" shows the destination line, and Start begins a walk there.
- RQ9: on that walk, no `mark-pin` until Places is turned on.
- RQ10, RQ15: with the bar up, and with the ready card open, each capture button and Locate is the topmost element at
  its centre.
- RQ13: after a find on that walk and a return to Navigate, the found place's ready card lists "Moments here".
- RQ14: on the walk to a "?", the destination line says "A place to find", then the name within 60 m.
- RQ16: the fixture's unreachable place (the `marks` fixture's private-ground place, or one added) shows `mark-reach`.

**Testing size: flow** (wiring between the ready map, its card and the walk; `docs/TESTING.md`, decision 0223):
`marks` (its own checks, new and edited), `ready` (the ready screen's wiring), `walk` (MD11's ring and the ready bar,
whose wiring changes), `modes` (MD3: a walk starts with every layer off). Each once, about 20 to 25 minutes in all.
`grep` for removed or renamed test ids: none are removed or renamed.

## Deferred, and why

- Places along a destination's route before Start (`routeMarks` on the ready map): not asked for; a later slice.
- A capture row on the ready card: a find without a walk is a data-model change (the owner, Nov 21: not now).

## Native

The ready map's pins and card use the same `WalkMap` pin path and card styles as the live walk, which have never run
on a device. Two items for `docs/NATIVE_UNVERIFIED.md` (through `npm run records`):

- `- [ ] **Do:** On Navigate before Start, in a town, with Places on. **Expect:** the "?" within your range around you; a tap opens its card with "Set as destination". (RQ1, RQ6)`
- `- [ ] **Do:** Tap "Set as destination" on a ready map "?", then Start. **Expect:** the walk routes there; its map shows no "?" until Places is turned on. (RQ7, RQ9)`

## Cost (`.claude/rules/performance.md`)

- **Reads:** at most one area read per ready-map fix of an area not yet read for this build, through the existing queue
  (one at a time; a failure waits 2 min and 100 m). The ready map's fix changes on focus and on Locate, never per GPS
  fix, so there is no per-fix work. Hosts: unchanged (the map tiles and the places archive, as a walk's read).
- **Per render:** `visibleMarks` over the items within `itemBounds` of the fix (the walk's n, tens to low hundreds in a
  dense core), memoised on the fix, range and items. `declutterMarks` over at most 8 pins.
- **Harness:** `scripts/perf-walk.js` covers the live walk, unchanged. No harness opens the ready map with places;
  the read is the walk's, measured there. Recorded as such in the slice's record.

## Screens and actions

| Action | Goal, how often, situation | Control | Matrix row | Adjacent apps |
|---|---|---|---|---|
| See places around you before a walk | Each time Navigate is opened somewhere new; standing, phone in hand | "?" pins on the map (none new: the walk's) | 11 (a map item opening its detail), the walk's precedent | Komoot's highlights, AllTrails' points, Google Maps' places, all on the map before a route |
| Open a place | Occasional; curiosity | A tap on the pin opens its card in the ready map's card place | 24 (a quick, scoped sub-task without losing context: one card, never a card over a card) | Each opens a card or sheet from the pin |
| Walk there | Occasional | "Set as destination", primary, then Start | 22's spirit for the primary action: one prominent button at the bottom of the card | Komoot: add to route; Google Maps: Directions first |
| Leave it | Constant | Close X, a map tap | 23 (dismiss: close symbol) | Close or swipe down |

- **Against precedent:** Google Maps leads its card with ratings and busy times; ours shows none (Never, "Scores").
  Every recorded app names its places on the map at any distance; ours keeps a "?" until 60 m, as a walk does
  (decision 0132's restraint, the "?" as something to come upon). Komoot and AllTrails both offer a capture-like
  "save" on the card; ours has none before Start (the owner, Nov 21).
- **Where the owner will look first:** on the map, around the blue dot, where they looked in Richmond. They will
  see the "?" there; if Places was switched off, the Layers button's outlined glyph and the Places row in its panel.
- **Defaults that make something quieter, for the owner to overrule:** the "?" stay unnamed beyond 60 m (a walk's
  rule); at most 8 are drawn (a walk's rule); no pocket alert before Start.

## The steward (run on this spec and plan, Nov 21)

Six drifts and one tone finding; no breaches.

| Finding | Triage |
|---|---|
| S1: the ready card dropped "Moments here" for a found place, which the owner never decided | **Accepted**, RQ13. Only the capture row goes. |
| S2: "as a long press does" makes a plain point; the walk could never name the place it routes to | **Accepted**, RQ14: the destination is the place (`kind: 'find'`, its key), as the walk's Route here sets it. Whether that walk's destination opens the place's card with Places off is the owner's question below. |
| S3: the card had no defined home and could cover the capture stack | **Accepted**, RQ15: the walk's `cardAt`, with a topmost-element check on every stack button. |
| S4: the card left out the reach line | **Accepted**, RQ16. |
| S5: a read in progress or failed looked like an empty map, the very symptom reported | **Accepted**, RQ17: the Places row's note says it in words, no count. |
| S6: Komoot's highlights are other walkers' picks | **Accepted**: the spec marks Komoot a counter-example in part, cited for the how only. |
| S7: two labels for one act ("Set as destination", "Route here") | **Rejected**: they are two acts. "Set as destination" is Explore's existing label for saving a destination in Navigate that starts nothing (`lib/atlas/mapsButton.ts`, OM8); "Route here" on a walk routes at once. The ready card does the first. |
| Silent: does opening Navigate now read the places archive without a tap? | Yes, as Explore's tab does on opening: the same hosts (the map tiles, the places archive by byte range, decision 0103), whose view is tile coordinates, never the person. No new host. Only while Places is on and the ready screen is in front (RQ4, RQ5). |

## For the owner

1. **A walk started to a ready "?": should it open with Places on, or does MD3 hold (every layer off at a walk's
   start)?** Recommended: MD3 holds, and the place you walk to is the one exception. Its pin and card stay
   reachable on that walk (so you can capture there and find it) while the other "?" stay off until you turn Places on.
   Otherwise you set out for a place and lose it the moment you press Start.
2. The defaults above: the ready map's reads build checklists outside a walk; no pocket alert before Start; "?"
   unnamed beyond 60 m; at most 8.
