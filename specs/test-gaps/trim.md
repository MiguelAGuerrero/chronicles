# The test trim (Nov 5)

The owner asked to trim unnecessary tests, retire the ones out of date, and keep the device-only ones as acceptance tests for the first mobile run. Four read-only reviews (unit tests in three parts, and the e2e) proposed candidates; each cut below was checked against the code before it was made, and every criterion id stays named by a test, retired, or recorded.

## Cut: a test that repeats another

| Test | Kept instead |
|---|---|
| `walkability/walkHeadsUp` "WH2: a new route over the same stretch is the same stretch" | `walkability/walkAhead` WK15, the same calls and one more assert, now "WK15, WH2" |
| `walkability/walkAheadWatch` "WK16: ending the route clears the line…" | `walkHeadsUp` WH10, the same steps on the same watch (WK16 stays named in `walkAhead`) |
| `places/townBorders` "TB5: a walk's towns are tinted…" | TB1 (the same `bordersFor` call) and "TB3, TB5" (the same point through `outlineIdsOf`) |
| `navigation/nav` "walk me back never cuts a corner" | N1, the same trace and route; its 485 m floor moved into N1 |
| `landing/landing` "only places a scan recognizes count (L4)" | `explore/discovery` D3 and TP11 (supermarkets and corner shops left out); L4 stays named |
| `explore/explore` "E11: the low names places revealed…" | `tabs/tabsAuditQuiet` U13, every case and one more; E11 stays named |
| `explore/explore` "E19: a place alerts once" | PA2, which covers both cases through `pocketAlert`, now "E19, PA2" |
| `replay/ceremony` "RR20: a day's walk whose replay could not load…" | `moments/days` M11, the same input built through `buildDays`; RR20 stays named |
| `explore/atlas` "atlas round 3: How the marks work…", "…Walk to names the area" | AG4 (its length check moved there) and AT8 |

## Cut: a test that could not fail

- `recording/still` "still 4": `readTrace(pts, 0, [], [])` against `readTrace(pts, 0, [])`, the same call (stills default to `[]`).
- `walk-screen/navigateReady` NR2, NR3: they compared functions returning literals with those literals. The e2e checks the behaviour (`launch`, `ready`).
- `walkHeadsUp` "WH8, WH13": two asserts on the test's own object and on ports the watch was never given. Replaced by a check that the watch's modules import no notifier, motion, recorder or db (fault-proved: an import of `../motion` fails it).
- E2E: guards that an element is absent whose test id no source renders any more (`walk-options`, `start-dialog`, `start-explore`, `start-here`, `open-settings`, `settings`); `check(true, 'unwalked streets near me shows a count')` after N12, whose regex matched anything (now `^[1-9]\d* unwalked nearby$`); `|| /m/` in WH13 (now the bar's words, distances aside); `ends == null ||` in qol QL1; `|location` in ready NR13.

## Cut: code nothing uses, with its tests

- `explore/exploreTab.ts` (the old tab's drawer, gone with decision 0066) and its five tests; NV14 retired.
- `findsLine` ("Found 2 art · 1 culture"): the card uses `foundList`.
- `HOTSPOT_PIN`, the Start here pin's colour (retired by decision 0034).
- `RIDE_RULES.replayMs` and `ridesShare`: the replay rhythm (0085) replaced the ride squeeze. The ride tests now hold rides to the rhythm's own cap, a glide and a zip.
- The retired scan's `Db` writes (`saveScan`, `addOffered`, `listOffered`, `updateMark`) in both stores and the fake, with their contract cases (the owner's call). `listMarks` stays: old walks' replays read marks. The contract seeds those rows as an older app wrote them.
- The one-release clear of `ambient-` notifications at stop, and its test (the owner's call; DEFERRED said to drop it).

## Retired criteria (`RETIRED` in `scripts/features.js`, each with its reason)

H2, H3, H10, N6 (v0.5-places), E14 (v1-discovery), L17 (v1.5-landing), NV14 (navigation-and-tabs), NH8 (bridges-and-open-in-maps), CP7 (compass), MR2 (memories-on-revisit), MO3 (motion), R10 (rides). H10, N6, NH8, CP7, MR2, MO3 and R10 are the owner's call (Nov 5): their text no longer matches the code. The baseline went from 40 to 27 entries (ceiling 27): those retirements, and MO4, MO7 and MO9, now named by the tests that check them.

## Kept on purpose

- **The same check in two journeys** (the ready bar pulled up in `tabs`, `ready` and `walk`; the long-pressed destination in `ready` and `walk`; muted video in three): each journey runs alone for the files it covers, and their `covers` differ, so a change can select one without the other.
- **Audit regression tests** that overlap a later test (`fix ward-subdivision audit 3`, `landing audit 11`): they record a fix.
- **`toFrame`** (the editor uses its inverse, `fromFrame`): ME11 and ME19 still check the rotation and crop through it. Pointing them at `fromFrame` is a test to write, not a cut.

## Device-only

Tests whose names claimed what only a phone runs now say what they check (D5's flush, TH5's migration source, NT8 and NT9's pure routing, the two SQLite halves of the contract), and the device halves are items in `docs/NATIVE_UNVERIFIED.md`, the device acceptance suite.
