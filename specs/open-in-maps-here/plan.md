# Open in Maps beside Walk: the plan (OM1-OM12)

For the owner's review before any code.

## Files

| File | Change |
|---|---|
| `src/lib/atlas/mapsButton.ts` (new, core; replaces `goHere.ts`) | `OPEN_IN_MAPS`, `openInMapsName(place)` ("Open in Maps, <place>"; OM3), `canOpenInMaps(listed)` (not `here`, has a point; OM5), `cardCanOpenInMaps({ here, asking })`, `spotCanOpenInMaps({ zoom, asking })` (zoom 12 and not asking), `rowActions({ walkable })` (Walk to only when walkable; Open in Maps always; OM4), `shareLabel(kind, label)` (OM10, kept), `tileWalk(choice)`: from `walkToChoice`'s `'start' \| 'ask' \| 'later'` the left button's label and what it does: `start` is "Walk there" and starts, the others "When I get there" and save for later (OM7). |
| `src/components/OpenInMapsButton.tsx` (new, view; replaces `GoHere.tsx` and `GoHereSheet.tsx`) | `useOpenInMaps(onFail)` returns `open(target)`: `feedback('tap')`, then `openInMaps(at, shareLabel(kind, label))` straight from the tap, the failure `onFail()` (OM2). `OpenInMapsButton({ target, variant, testID })` with three looks: `half` (the tile: outlined, flex 1, 44 px), `button` (outlined secondary, the card footer, star sheet, long-press cards) and `link` (a text link under a row's name). Always the external-link glyph (`open-outline`) and the words "Open in Maps"; ink, never the accent; `accessibilityLabel` from `openInMapsName`, hint `HANDOFF_HINT` (OM3). |
| `src/components/atlas/AtlasTile.tsx` | The 44 px strip becomes two half-width buttons, outside the tile's pressable: left the walk action (accent-filled when "Walk there", outlined when "When I get there"), right Open in Maps. New props `walkChoice` and `onWalk(key)`, `onMaps(key)`; the empty strip stays for the area you are in (OM6, OM9). |
| `src/components/atlas/AtlasCard.tsx` | Footer: the "Go here" link becomes an outlined Open in Maps button under the primary (not while asking; not on the area you are in); the far-off footer keeps When I get there above it. Storefront and complex rows: the link goes under the name; Walk to stays at the right (OM4, OM9). |
| `src/app/(tabs)/explore.tsx` | Drops `useGoHere`, `goHereFor` and the sheet. `useOpenInMaps` for the card, the rows, the long-press card (an outlined button under its row, where Walk here is offered) and the tiles. The tile's walk button: `walkToChoice(...)` for that area decides: start (`startWalk`) or `walkStart.later` (OM7). `covered` is the plan's alone; `pageBack` loses `goHere`. |
| `src/components/HomeSheet.tsx`, `src/app/(tabs)/index.tsx` | The star sheet's two pills side by side (Walk here accent, Open in Maps outlined; they wrap at 320); Chronicle's long-press card gets an outlined Open in Maps under Walk here. `ownKeys` loses `!gohere.open`; the top-anchored sheet and `useGoHere` go. |
| `src/lib/atlas/waitingPins.ts` | `pageBack`'s `goHere` option and `'gohere'` result go (OM11). |
| `src/components/GoHere.tsx`, `GoHereSheet.tsx`, `src/lib/atlas/goHere.ts`, `src/lib/__tests__/explore/goHere.test.ts`, journeys `gohere.js`, `gohere-chronicle.js` | Removed; their live behaviour moves to the files above and the journeys below. |
| `scripts/features.js` | `RETIRED`: `explore-go-here` GH1-GH15 and `go-here-everywhere` GE1-GE13 (the owner's call, Nov 17, decision 0191); the explore feature's `journeys` and `specs`; `open-in-maps-here` in `IN_PROGRESS` while built. |
| `.claude/rules/go-here.md` | Rewritten as `.claude/rules/open-in-maps-here.md` (paths: the new files). |
| `docs/PRODUCT.md`, `docs/decisions/0191-*.md`, `docs/decisions/README.md` | The product text; the decision that supersedes 0189 and 0190 (OM12). |

Nothing changes `SNAP_RULES`, `STREET_CODE` or `LANDING_CODE`.

## Data

None (OM2). Nothing is saved by Open in Maps; the tile's "When I get there" uses `useStartWalk().later` as the card does.

## Tests per criterion

| Id | Test | File |
|---|---|---|
| OM1 | `OM1: no Explore or Chronicle surface says "Go here"` (unit: a grep of `src` for the words, the walk screen excepted) plus the cold find on the pictures | `src/lib/__tests__/explore/mapsButton.test.ts`; the journeys |
| OM2 | `OM2: Open in Maps hands the destination alone, straight from the tap, saves nothing and starts no walk` (journeys: the captured link on each host, `nav` meta and the walk unchanged); the failure said once | journeys `openmaps`, `openmaps-chronicle` |
| OM3 | `OM3: the name is "Open in Maps, <place>" and each control is 44 px` (core `openInMapsName`; journeys: boxes) | `mapsButton.test.ts`; journeys |
| OM4 | `OM4: every host carries both controls` (journeys: the tile, the card, a complex row, the long-press card, the star sheet, Chronicle's long press); a row too far to walk keeps Open in Maps (core `rowActions`) | `mapsButton.test.ts`; journeys |
| OM5 | `OM5: not on the area you are in, not while asking, not below zoom 12` (core `canOpenInMaps`, `cardCanOpenInMaps`, `spotCanOpenInMaps`; journeys) | `mapsButton.test.ts`; journeys |
| OM6 | `OM6: two half-width 44 px buttons outside the tile's tap; every tile one height` (journey: boxes, a tap on the tile still selects) | journey `openmaps` |
| OM7 | `OM7: within 2 km with a fresh fix it is Walk there and starts the walk; otherwise When I get there, saved for Navigate, no walk` (core `tileWalk`; journey: the near and the far tile) | `mapsButton.test.ts`; journey `openmaps` |
| OM8 | `OM8: one accent-filled control per host; Open in Maps is never the accent; no minutes or counts` (journeys: computed colours) | journeys |
| OM9 | `OM9: nothing clips at 320 px` (the complex row with the longest name; the tile; the star sheet wraps) | journeys |
| OM10 | `OM10: the link carries coordinates; a star's title and "Your spot" never ride in it` (core `shareLabel` with `mapsUrls`; the captured links) | `mapsButton.test.ts`; journeys |
| OM11 | `OM11: no sheet, no sheet handler anywhere` (unit: a grep for `go-here-sheet`, `useGoHere`, `GoHereSheet` in `src`; `pageBack` has no sheet option) | `mapsButton.test.ts` |
| OM12 | `OM12: a record cites 0189, 0190, 0058 and 0121, lists the hosts, and keeps the walk screen's Go here` | `mapsButton.test.ts` |

Journeys: `scripts/e2e/journeys/openmaps.js` (Explore: the tiles, the card, a complex row, the long-press card; `E2E_ONLY=openmaps`) and `openmaps-chronicle.js` (the star sheet and Chronicle's long press, from the walk journey's walk), both in the `explore` feature. The UI review and the cold find run with their pictures (390 x 844 and 320).

## For each action (goal, control, matrix)

- **Goal 1, "show me the way in my maps app", from wherever a place is shown:** "Open in Maps ↗", outlined, the external-link glyph, one tap, no sheet. **Goal 2, "walk there with Chronicles guiding and recording":** the host's existing accent walk action. The two are told apart by the words and the glyph, and by colour (one accent per host). **Matrix:** a primary action beside an external hand-off, as maps and ride apps show them (`ui-references.md`, section 2).
- **Where the owner will look first:** beside Walk to / Walk here: under it on the card footer and the long-press cards, beside it on the star sheet, at the tile's foot on the right, under the name on a row.
- **Defaults taken that make a control quieter (the owner can overrule):** Open in Maps is outlined and 13 px in ink, never the accent; on a tile both buttons are 13 px; the tile's far "When I get there" is outlined, not accent-filled, since it starts nothing.

## Deferred

- **Open in Maps on the walk screen's other surfaces** already exist (0058) and are untouched.
- **A "Walk now" for a place 2-10 km away from a tile:** the tile's button saves it for later (OM7); Walk now is the card's question.

## Native

Apple Maps from every host has never run on a device (`docs/NATIVE_UNVERIFIED.md`: the two Go here items are replaced).

## Steward

To be run on the spec and this plan; findings triaged here before the owner's go-ahead.
