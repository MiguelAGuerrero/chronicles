# Plan: Sights and Local life, phase 1 (SG1-SG9)

For the owner's review before any code. Decision 0197; spec `specs/sights-and-local-life/spec.md`.

## Files

| File | Change |
|---|---|
| `src/lib/atlas/atlas.ts` (core) | `KIND_GROUPS`: `[{ id: 'sights', label: 'Sights', kinds: [history, art, culture, parks, viewpoints] }, { id: 'life', label: 'Local life', kinds: [food, shops, nightlife] }]`, their concatenation equal to `ATLAS_ORDER` (SG8). `groupsPresent(steps)`: the tile's kinds per group, empty groups dropped (SG2). `MARKS_EXPLAINED`'s second line rewritten (SG5). |
| `src/components/atlas/AtlasCard.tsx` | The rows under two header texts (`atlas-group-sights`, `atlas-group-life`), `accessibilityRole="header"` (SG1, SG3, SG4). The section's own heading ("What's here") stays. |
| `src/components/atlas/KindStrip.tsx` | Chips per group from `groupsPresent`, a gap between groups (`atlas-strip-gap`, an empty view, `accessible={false}`), `nowrap` kept (SG2). |
| `scripts/e2e/journeys/atlas.js` | Checks for SG1-SG5, SG9 and a `shot()` of the card and a tile. |
| `scripts/features.js` | `IN_PROGRESS` entry; the spec under the `explore` feature. |

## Data

None: no truth, no cache, no migration, no `ATLAS_CODE` or `PRESENCE_CODE` bump. Steps are read as stored.

## Tests per criterion

| Id | Test | Where |
|---|---|---|
| SG1 | `SG1: the card's rows under Sights then Local life` | e2e `atlas` (headings and the row order by `data-testid`) |
| SG2 | `SG2: one row in two groups at 320 px` (`groupsPresent` unit test for order and empty groups) | `src/lib/__tests__/explore/sightsLife.test.ts`; e2e `atlas` at 320 px: tile height unchanged, gap only with both groups |
| SG3 | `SG3: headings are headers, before their rows` | e2e `atlas` (`role=heading` order in the card) |
| SG4 | `SG4: eight rows, both headings with a group all none` | e2e `atlas` (a neighborhood with no food in the fake grid) |
| SG5 | `SG5: the explanation names both groups, no digit` | unit `sightsLife.test.ts` over `marksExplained` for ring, outline and shape; e2e `atlas` panel text |
| SG6 | `SG6: a thin ring shows no heading` | e2e `grading` (Quiet Hollow), existing AG3 check extended |
| SG7 | `SG7: steps and pins unchanged over the presence sample` | unit, over `presenceSample.json` and `presenceTowns.json` against `readers.golden.json` |
| SG8 | `SG8: the groups hold every kind once, in ATLAS_ORDER` | unit `sightsLife.test.ts`; plus `waitingLabel` order |
| SG9 | `SG9: no digit or busy word on the card or tile` | e2e `atlas` (card and tile text: no `\d`, no "busy", "popular", "trending") |

New test file `src/lib/__tests__/explore/sightsLife.test.ts` in the existing `explore` feature. No new journey: `atlas`
already opens the card and the tiles; `grading` holds the thin ring.

## Deferred

- Everything of phase 2 (decision 0197): Culture and Community into Local life, the marks rule, the switches' headings,
  the out-of-town stars, `PRESENCE_CODE`. Held until chronicles-data covers National Park Service sites.
- The card's words for Local life ("Main Street: cafés, boutiques, a theater") and any map layer for it (0197).
- `characterLine` ("Plenty of food and shops") reads across both groups, unchanged: it says what the area holds, which
  stays true. Whether it should lead with Sights is a question for the owner (below).

## Native

No native-only code. `AtlasCard` and `KindStrip` render on both; `accessibilityRole="header"` on a phone is unverified:
one item in `docs/NATIVE_UNVERIFIED.md` (Do: open an area's card with VoiceOver; Expect: "Sights, heading" then five
kinds, "Local life, heading" then three).

## Cost

Two headers and one spacer per card, one spacer per tile; `groupsPresent` is a filter over eight kinds per render. No
read, write or per-frame work. Harness: none needed (`scripts/perf-explore.js` unaffected; device only for nothing).

## Goal to control

| Action | Goal, frequency, situation | Control | Matrix row | Adjacent apps |
|---|---|---|---|---|
| Read what an area has to find | Each look at an area, standing or before setting out | Rows under the header "Sights" | L1 (a list with section headers), row 11 for the rows that open the planner | Atlas Obscura shows only finds; Google's "Things to do" chip |
| Read what an area is like to be in | Same | Rows under the header "Local life" | L1 | Google's Restaurants, Coffee, Shopping chips; Walk Score's types (without its score) |
| Compare areas at a glance | Swiping the row | The tile's strip, two groups apart by a gap | none (a glanceable strip; L1 for order) | none recorded |
| Learn how the marks work | Rarely, first visits | "How the marks work", unchanged control, new words | row 19 (inline status in words) | none recorded |

**Where the owner will look first:** on the card, under "What's here", where the rows are today; the headings sit
directly above the first row of each group. On a tile, the strip under the name, where the icons are today.

**Defaults that make a control quieter** (the owner may overrule):
- The headings are small label text in ink, like the card's section titles, not panels or chips.
- **The tile has no words**, only a gap between groups: at 320 px eight chips use 218 of 224 px, so "Life" does not
  fit beside them. Decision 0197 named "Life" for a tight tile; this plan drops it there, and keeps it to the card.
- No totals per group, no colour per group: each kind keeps its colour.

## Against precedent

- **No chips to filter by type** (Google): Explore shows presence, it is not a search; the map is filtered by "What I'm
  into", not by the card.
- **No score per group** (Walk Score): Never "Scores".
- **Local life is on the card at all** (Atlas Obscura shows none): the owner's call (0197), presence of what is there
  helps a walker know a main street is alive; it stays words and dots.

## Open for the owner

1. The tile: a gap only, no word (recommended, room), or "Life" in place of the gap's room on wider phones only?
2. `characterLine`: leave it across both groups (recommended for phase 1), or lead with the Sights kinds?
