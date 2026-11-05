# Live criteria no test names: a triage for the owner (Nov 4)

`npm run check:specs` listed 25 live criterion ids (24 at the first count, and TB12 from main's town borders) that no unit test, e2e check or step names, after test gaps round 1 wrote tests for M15, AC11, NT12 and named R10, N14 and L18 in the nothing-leaves check, and after the v1 retired list was corrected to the spec's own "Retired by this slice" line. Each needs one of three calls: **retire** it (it goes into `RETIRED` in `scripts/features.js`, with who retired it), **test** it (built, a test is owed), or **build** it (not done). The column "Read" is the agent's reading from the code and the later slices; it is a suggestion, not a call.

Round 2 (Nov 4) wrote a test for 15 of the 18 "test" rows (below). It stopped on three where the code no longer says what the criterion says (H10, N6, CP7): those now wait on the owner with the rest.

| Spec | Id | Criterion (short) | Read | Why |
|---|---|---|---|---|
| v0.5-places | H2 | With no stopped walks: a world view, "Walk somewhere and it is starred here", Start | retire? | The home became the tabs (Navigation & tabs); Start moved to the ready bar (decision 0076) |
| v0.5-places | H3 | One Start button above the sheet; "Return to your walk" | retire? | Same: Start is the ready bar's, the walk comes back through the recording bar |
| v0.5-places | H10 | The home reads only walks, summaries, areas, never traces or media | reword? | Later slices widened it: Chronicle also reads every capture row (the days, M7), checklist areas and finds, and its moment pins load photos' small copies (QL26). Still true: no trace is read but by `lib/backlog` (placing old walks, H8). A test of "never traces" is ready to write once the owner rewords it |
| v0.5-places | N6 | The route drawn bold in blue with a white edge; trace, pins, walker visible | reword? | The trace steps aside while navigating (the owner's call, Nov 2; the `walk` journey checks "the trace hides while navigating"), and QL3's markers go with it. The route (blue, 8 px on a 12 px white edge), the pins and the walker hold |
| v1-discovery | E14 | On upgrade, scan and ambient marks are no longer read or drawn | retire? | A one-time upgrade from Nov 1; nothing left to read |
| v1.5-landing | L17 | Remembered pockets feed the v1 scan and ambient as context only | retire? | Scan and ambient are retired (v1-discovery's retired line) |
| bridges-and-open-in-maps | NH8 | "Couldn't open a maps app." when nothing opens it | build? | That text is not in the code; ask whether the banner shipped under other words |
| compass | CP7 | Turning stops following like a pan; Recenter and Locate resume and keep the bearing | build? | Half holds: a turn by hand (shift-arrow on the walk's map) stops following and Recenter resumes it at the same bearing (checked in `qol`, Nov 4, then left out). Locate does not keep the bearing: its fit (`fitBounds` with no `bearing`) turns the map back to north (Explore, 90° → 0°). `window.__turn` is a camera move in code, so it never stops following |
| memories-on-revisit | MR2 | Memory pins group by screen distance, with a count | build? | `memories.ts` doesn't group through `pinsFor`; ask whether grouping shipped |
| replay-rhythm | RR17 | With a screen reader, both replays step through the moments | native | react-native-web always reports a screen reader; only a device can check it |

## Covered in round 2 (Nov 4)

- **H9** `places/places.test.ts` "H9: the open walk shows nowhere on Chronicle until it stops: no star, no row, no place, no day, no count"
- **N12** e2e `walk` "N12: while navigating, the walk records, a photo is kept, Pause holds the bar's distance, and the fog counts its streets"
- **E15** e2e `marks` "E15: on the web, with the page open, an exploring walk reads its area, keeps its checklist and names what it passes"
- **NB6** `streets/tileRules.test.ts` "NB6: STREET_CODE 3 drops the street cache once and marks every walk to re-snap" (`tiles.ts` run from its own source over the fake db)
- **AT9** e2e `atlas` "AT9: the small map shows the areas' points, and a selected tile frames its area with its 800 m ring"
- **AT15** e2e `atlas` "AT15: the title and subtitle float on a shadowed card over a map that runs to the top"
- **G13** `streets/tileRules.test.ts` "G13: the gap rules bumped SNAP_RULES, which marks every walk to snap again and keeps the street pieces"
- **MR9** e2e `memories` "MR9: on the web build, a later walk shows memory pins, previews one and opens its spot's memories"
- **TH5** `captures/thumbModel.test.ts`, three "TH5: ..." tests: migration 12 (read from the native list; SQLite never ran), the web record, one module
- **MO6** e2e `sensors` "when steps start, the dot moves within 2 s (MO6: ...)": 1.8-2.0 s with a fix every quarter second; at 1 Hz the fix wait can add up to a second, so a phone may take longer than 2 s
- **MO10** e2e `sensors` "MO10: motion is read only while the walk is open and on screen" (listeners counted: ready, walking, paused, resumed, hidden, back, stopped)
- **QL3** e2e `qol` "qol QL3: the start marker sits above the trace and goes with it while navigating" (pixels read from the page) and "qol QL3: a tap on a pin over the end marker opens the pin"
- **QL21** e2e `qol` "qol QL21: denied, Navigate's own fix on focus stays quiet; Locate says why"
- **R12** `rides/rides.test.ts` "R12: on a ride, and at a stop on it, Explore waits: ..." (the decisions: `ridingAt`, the pocket alert, what the walked fixes name; the gates in `useExplore`, `useNavigation` and `walk.tsx` are views no Node test loads)
- **TB12** `places/townBordersRetry.test.ts`, three "TB12: ..." tests: the z10 read's 45 s in `overtureOutlines.ts` and the 30 s retry in `useOutlineSet`, each run from its own source under mocked timers

## Suggested next step

Confirm the four "retire?" rows (H2, H3, E14, L17), the "build?" rows (NH8, MR2, and CP7's Locate) and the two "reword?" rows (H10, N6).
