# Go here on the rest of the surfaces: the plan (GE1-GE13)

For the owner's review before any code.

## Files

| File | Change |
|---|---|
| `src/components/GoHere.tsx` (new, view) | `useGoHere({ walkOpen, start, later, say, anchor })` (`anchor`: `'bottom'` on Explore, `'top'` on Chronicle) returns `{ ask(target: { at, label }), sheet }`: the state (the target, whether a destination is already saved), Back and Escape, the maps and Chronicles calls (`goHereDo`, `openInMaps`, the failure notice). It renders the sheet it moved here (`GoHereSheet`, from `components/atlas/`). One place for the words and the calls. |
| `src/components/atlas/GoHereSheet.tsx` | Moved to `src/components/GoHere.tsx`'s directory as `GoHereSheet.tsx` (a path change only). |
| `src/app/(tabs)/explore.tsx` | The tile's `goHere` state and `chooseGoHere` become `useGoHere`; passes `ask` to `AtlasCard` (`onGoHere`) and to the spot card's new "Go here". |
| `src/components/atlas/AtlasCard.tsx` | Footer: a ghost "Go here" line under the primary (and under When I get there far off), hidden while the card is asking; each storefront and complex row gets a "Go here" text link beside its "Walk to", shown whether or not the row is walkable. New prop `onGoHere(at, label)`. |
| `src/lib/atlas/goHere.ts` (core) | `rowActions({ walkable })`: `{ walk: walkable, go: true }` (GE5); `spotCanGoHere({ zoom, asking })` and `cardCanGoHere({ here, asking })` (GE7); `goHereChoices(mapsApp, hint?, walkOpen?)`: the Chronicles hint is "Routes your walk" with a walk open (GE4); `shareLabel(kind, label)`: the label for the maps link, "Destination" for a star or a spot (GE3). |
| `src/components/HomeSheet.tsx` | A ghost "Go here" text link under the `place-go` pill (`place-go-here`); new prop `onGoHere`. |
| `src/app/(tabs)/index.tsx` | `useGoHere` with its own `startWalk` and `walkStart.later`; passes `onGoHere` to the sheet; the long-press card gets a ghost "Go here" line under "Walk here"; the card stays above the capture stack and the sheet is anchored at the top (GE9). |

Nothing changes `SNAP_RULES`, `STREET_CODE` or `LANDING_CODE`.

## Data

None new (GE11). The destination goes to meta `nav` through `useStartWalk().later`.

## Tests per criterion

| Id | Test | File |
|---|---|---|
| GE1 | `GE1: each host says Go here, with the place's name for a screen reader, 44 px high` (journey: the card footer, a storefront row, a complex row, the long-press card; journey: the star sheet and Chronicle's long press), plus the cold find | journeys `gohere` (Explore hosts) and `gohere-chronicle` |
| GE2 | `GE2: every host opens the one sheet; Escape and close save nothing` | both journeys |
| GE3 | `GE3: each host hands its own destination to the maps app alone; a failure says so once` (captured link per host, the pressed spot's point, the star's point) | both journeys |
| GE4 | `GE4: Chronicles saves the host's place and opens Navigate ready; no walk; a replaced destination is said once` | both journeys |
| GE5 | `GE5: rows too far to walk still have Go here; both choices work far and with no fix` (core `rowActions`, journey) | `src/lib/__tests__/explore/goHere.test.ts`; `gohere` |
| GE6 | `GE6: Walk to and Walk here on every host are as they were` | `drive` journey stays green; `gohere-chronicle` for Chronicle's |
| GE7 | `GE7: not on the area you are in; not below the long press's zoom` (core `spotCanGoHere`, journey) | `goHere.test.ts`; both journeys |
| GE8 | `GE8: no digits, minutes or "fastest" in a host's Go here; the primary keeps the accent` (journey: computed colours) | both journeys |
| GE9 | `GE9: the capture stack stays put and answers, with Go here shown and the sheet open, at 320 px` (boxes before and after; a tap on `cap-note`) | `gohere-chronicle` |
| GE10 | `GE10: at 320 px with the longest names nothing wraps past two lines or clips` | both journeys |
| GE11 | `GE11: nothing but meta nav is written; no host asked; a tap changes nothing familiarity says` | both journeys |
| GE13 | `GE13: the link carries coordinates only; the label is the area's name or "Destination"` (core `shareLabel`, `mapsUrls`; journey reads the opened link) | `goHere.test.ts`; both journeys |
| GE12 | `GE12: a record cites 0189, 0058 and 0121, lists the hosts and keeps the dead-zone nudge deferred` | `goHere.test.ts` |

A new journey `scripts/e2e/journeys/gohere-chronicle.js` (`E2E_ONLY=gohere-chronicle`); the Explore hosts extend `gohere.js`. Both belong to the `explore` feature, with `go-here-everywhere` in `specs` and `IN_PROGRESS` while it is built. The UI review runs with pictures of every host (390 x 844 and 320), then the cold find.

## For each action (goal, control, matrix)

- **Goal:** "get me to that place", from wherever it is shown, outdoors, one-handed. **Control:** the same quiet "Go here" with the arrow, then the sheet. **Matrix:** as the tile's (0189): a primary action with a secondary choice; a sheet, not a long press.
- **Where the owner looks first:** the host's own walk control: the footer under "Walk to <name>"; the row's right end beside "Walk to"; under "Walk here" on a long-press card and a star's sheet.
- **Defaults taken that make it quieter (the owner can overrule):** a ghost button under the primary on the cards, a text link on rows, a secondary pill on the star sheet; never the accent; never above the primary.

## Deferred

- **A single Go here for the whole card** that follows the selected area: the card already has it.
- **Open in Maps on a pin or capture viewer on the Chronicle tab** (a moment's place): CaptureView has Go here today (0058); not touched.

## Native

Apple Maps from each host and the sheet on a phone have never run on a device. The device suite gets one line per Chronicle host ("**Do:** select a place on Chronicle's sheet, tap Go here, then Apple Maps. **Expect:** Apple Maps opens with walking directions there (GE3)").

## Steward

To be run on the spec and this plan; findings are triaged here before the owner's go-ahead.
