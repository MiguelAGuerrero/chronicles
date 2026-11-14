# Explore: Go here on every tile: the plan (GH1-GH13)

For the owner's review before any code.

## Files

| File | Change |
|---|---|
| `src/lib/nav/handoff.ts` (core) | `mapsName(target)`: "Apple Maps" (`apple`, `appleApp`), "Google Maps" (`google`), "Maps" (`geo`) (GH2). |
| `src/lib/atlas/goHere.ts` (new, core) | `goHereChoices(env)`: the two choices, in order, with labels, ids and hints; `canGoHere(listed)`: false for `here` and `unplaced` (GH8). No digits in any label (GH10). |
| `src/components/atlas/AtlasTile.tsx` | A sibling "Go here" `Pressable` (`atlas-go-here`) under the tile's pressable, not inside it (a button in a button is invalid on web). Arrow icon and the words "Go here", ink, with a pressed state, in the slot the footer uses so no tile's height changes (GH1, GH3, GH11, GH12). New prop `onGoHere(key)`. |
| `src/components/atlas/GoHereSheet.tsx` (new, view) | A small sheet over the row, never a `Modal` (it stacks on iOS): the area's name, two rows (`go-here-maps`, `go-here-app`) and a close (`go-here-close`). Back and Escape close it (GH2). |
| `src/app/(tabs)/explore.tsx` | Holds `goHere` state; passes `onGoHere` to the tiles; the maps row calls `openInMaps(walkTarget(area).at, label)` straight from the tap and says `NH8`'s wording when it resolves false (GH4, GH7); the Chronicles row calls `walkStart.later({ at, label, kind: 'point' })`, or `startWalk` with a walk open (GH5). |
| `src/lib/nav/openInMaps.ts` | Unchanged. |

Nothing changes `SNAP_RULES`, `STREET_CODE` or `LANDING_CODE`.

## Data

None new (GH13). The destination goes to meta `nav` through the existing `savePendingDest`.

## Tests per criterion

| Id | Test | File |
|---|---|---|
| GH1 | `GH1: each tile shows Go here, found from the row` (journey: the words and the arrow on a tile, picture at 390 px with the longest name) plus the cold find | journey `gohere` |
| GH2 | `GH2: two choices named for the phone; Back and close save nothing` (core: `goHereChoices`, `mapsName`; journey: the sheet) | `src/lib/__tests__/explore/goHere.test.ts`; journey `gohere` |
| GH3 | `GH3: Go here neither selects nor opens the card; the tile's tap still does` | journey `gohere` |
| GH4 | `GH4: the maps app gets only the destination, from the tap` (the journey's captured link is `maps.apple.com/?daddr=<lat,lng>&dirflg=w`, no other parameter, no other request) | journey `gohere`; `handoff.test.ts` for the link |
| GH5 | `GH5: Chronicles saves the destination and opens Navigate ready; no walk starts; with a walk open it routes it` | journey `gohere` |
| GH6 | `GH6: both work past 10 km, with no question` (journey: a far area) | journey `gohere` |
| GH7 | `GH7: a maps app that won't open says so once` (the journey's `openInMaps` fails; the notice shows once) | journey `gohere` |
| GH8 | `GH8: not on the here area or an unplaced tile; on a town's heading card` (core: `canGoHere`; journey: the tiles) | `goHere.test.ts`; journey `gohere` |
| GH9 | `GH9: the card's Walk to is unchanged` | the `drive` journey stays green |
| GH10 | `GH10: no digits, minutes or "fastest" in the labels` (core) and the journey reads the sheet's text | `goHere.test.ts`; journey `gohere` |
| GH11 | `GH11: ink, not accent` (journey: computed colour) | journey `gohere` |
| GH12 | `GH12: tile heights are unchanged and nothing wraps at 320 px; the capture stack stays` (boxes before and with the sheet open) | journey `gohere` |
| GH13 | `GH13: no new host or write but meta nav` (the request log; the shell test's writes) | journey `gohere` |

A new journey `scripts/e2e/journeys/gohere.js`, run with `E2E_ONLY=gohere`, owned by the `explore` feature (`journeys` and `specs` in `scripts/features.js`; `explore-go-here` in `IN_PROGRESS` while it is built). The UI review runs with its pictures (390 x 844), then the cold find.

## For each action (goal, control, matrix)

- **Goal:** "get me to that place now", from a tile I'm already looking at, often outside, one-handed. **Control:** a "Go here" text button with an arrow icon at each tile's lower edge, then a two-row sheet. **Matrix:** a primary action with a secondary choice, as `ui-references.md` section 2 gives for a row's quick action; the choice is a sheet, not a long press, because a hidden control is not found (the "Found before quiet" rule).
- **Where the owner looks first:** the lower edge of the tile, where the selected card says what a tap does. They see an arrow and "Go here".
- **Defaults taken that make it quieter:** ink, not accent; small type (14 px); no pressed-state animation beyond the dim. The owner can overrule any of them.

## Deferred

- **Open in Maps and Go here on the other hosts** (complexes' rows, mark card, long press, HomeSheet's `place-go`): the owner named Explorers' tiles. They are added to `docs/DEFERRED.md`.
- **Scenic route preview on Explore itself:** stays deferred; Navigate shows it.

## Native

Apple Maps from the app and the sheet on a phone have never run on a device. The device suite gets: "**Do:** on Explore tap Go here on a tile, then Apple Maps. **Expect:** Apple Maps opens with walking directions to that place, and Chronicles keeps recording (GH4)." and "**Do:** pick Chronicles. **Expect:** Navigate opens ready to that place, no walk started (GH5)."

## Steward

To be run on the spec and this plan; findings are triaged here before the owner's go-ahead.
