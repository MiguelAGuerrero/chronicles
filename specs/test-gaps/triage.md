# Live criteria no test names: a triage for the owner (Nov 4)

`npm run check:specs` lists 24 live criterion ids that no unit test, e2e check or step names, after test gaps round 1 wrote tests for M15, AC11, NT12 and named R10, N14 and L18 in the nothing-leaves check, and after the v1 retired list was corrected to the spec's own "Retired by this slice" line. Each needs one of three calls: **retire** it (it goes into `RETIRED` in `scripts/features.js`, with who retired it), **test** it (built, a test is owed), or **build** it (not done). The column "Read" is the agent's reading from the code and the later slices; it is a suggestion, not a call.

| Spec | Id | Criterion (short) | Read | Why |
|---|---|---|---|---|
| v0.5-places | H2 | With no stopped walks: a world view, "Walk somewhere and it is starred here", Start | retire? | The home became the tabs (Navigation & tabs); Start moved to the ready bar (decision 0076) |
| v0.5-places | H3 | One Start button above the sheet; "Return to your walk" | retire? | Same: Start is the ready bar's, the walk comes back through the recording bar |
| v0.5-places | H9 | The open walk shows nowhere until it stops | test | Still the rule for Chronicle; an e2e check in `chronicle` would hold it |
| v0.5-places | H10 | The home reads only walks, summaries, areas, never traces or media | test | A structural unit test over the tab screens' imports and db calls |
| v0.5-places | N6 | The route drawn bold in blue with a white edge; trace, pins, walker visible | test | A `walk` journey check on the route layer's paint |
| v0.5-places | N12 | Recording, pause, captures, fog and streets work while navigating | test | Partly in the `walk` journey's navigation steps; one named check owed |
| v1-discovery | E14 | On upgrade, scan and ambient marks are no longer read or drawn | retire? | A one-time upgrade from Nov 1; nothing left to read |
| v1-discovery | E15 | On the web, exploring works while the page is open | test | The `marks` and `nudge` journeys explore on the web; name it in one |
| v1.5-landing | L17 | Remembered pockets feed the v1 scan and ambient as context only | retire? | Scan and ambient are retired (v1-discovery's retired line) |
| bridges-and-open-in-maps | NB6 | `STREET_CODE` 3 drops the street cache once | test | A unit test on `STREET_CODE` and the cache drop in `tileBuild` |
| bridges-and-open-in-maps | NH8 | "Couldn't open a maps app." when nothing opens it | build? | That text is not in the code; ask whether the banner shipped under other words |
| compass | CP7 | Turning stops following like a pan; Recenter and Locate resume and keep the bearing | test | A `ready` or `qol` journey check through `window.__turn` |
| explore-atlas | AT9 | The small map above the grid follows | test | An `atlas` journey check on the mini map's centre |
| explore-atlas | AT15 | The title floats over the map | test | An `atlas` journey layout check |
| filling-gaps | G13 | The rule change marks every walk to snap again | test | A unit test that `SNAP_RULES` was bumped with the gap rules |
| memories-on-revisit | MR2 | Memory pins group by screen distance, with a count | build? | `memories.ts` doesn't group through `pinsFor`; ask whether grouping shipped |
| memories-on-revisit | MR9 | The same on the web build | test | The `memories` journey runs on the web; name it there |
| memories-on-revisit | TH5 | One thumbnail model on phones and web; migration 12 | test | Native half unverifiable here; the web half is the `walk` journey's thumbnails |
| motion | MO6 | When steps start, the dot moves within 2 s | test | The `sensors` journey fakes DeviceMotion; a timing check is owed |
| motion | MO10 | Motion is read only while a walk is open and on screen | test | The `sensors` journey can count listeners after pause and blur |
| quality-of-life | QL3 | Markers above the trace, under pins and walker, never take a tap | test | A `qol` journey check: a tap on a start-marker pin still opens it |
| quality-of-life | QL21 | Navigate's own fix on focus stays quiet when denied | test | The `qol` journey's denied context can check no banner |
| replay-rhythm | RR17 | With a screen reader, both replays step through the moments | native | react-native-web always reports a screen reader; only a device can check it |
| rides | R12 | On a ride, Explore names nothing, no pocket alert, no read; the fog reads nothing | test | Several unit tests prove parts (PA3 "on a ride"); one named test owed |

## Suggested next step

Confirm the four "retire?" rows (H2, H3, E14, L17) and the two "build?" rows (NH8, MR2). The 17 "test" rows are owed tests, mostly e2e checks in journeys that already exist; they need no call and can be written as a round 2 of test gaps.
