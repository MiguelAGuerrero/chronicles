# Plan: Sights and Local life, phase 1 (SG1-SG13)

For the owner's review before any code. Decision 0200; spec `specs/sights-and-local-life/spec.md`. Revised after the
plan review (the spec's "Plan review" section: steward, auditor, UX reviewer, Nov 18).

## Files

| File | Change |
|---|---|
| `src/lib/atlas/atlas.ts` (core) | `KIND_GROUPS`: `sights` (history, art, culture, parks, viewpoints) and `life` (food, shops, nightlife), labels "Sights" and "Local life", their concatenation `ATLAS_ORDER` (SG10). `groupsPresent(steps)`: each group's present kinds, empty groups dropped (SG2, SG9). `SIGHTS_LINE` (SG1). `MARKS_EXPLAINED` lines 1-3 rewritten, the ring's line kept last (SG7). `tileLabel` says the groups (SG5). `presenceTally` keeps each Sights place under its kind in `shares` (Local life stays in `counts`), so `stepsFrom` drops a switched-off kind as it does a small subset (SG12); `ATLAS_OWN` a15, none carried. `characterLine` leads with Sights (SG13). |
| `src/components/atlas/AtlasCard.tsx` | Inside `!p?.thin` and only with `p`: a heading per group (`atlas-group-sights`, `atlas-group-life`), `accessibilityRole="header"` with `aria-level` one under "What's here" on the web; `SIGHTS_LINE` muted under Sights; the rows under their heading (SG1, SG3, SG4, SG6). A new `groupTitle` style. |
| `src/components/atlas/KindStrip.tsx` | Chips 4 px apart within a group, the first Local life chip 16 px from the last Sight (`marginLeft`), no spacer element; `nowrap` kept (SG2). |
| `scripts/e2e/harness.js` | A gated fixture area that lights all eight kinds (served behind a flag, as `smallWorld` is) (SG2). |
| `scripts/e2e/journeys/atlas.js`, `grading.js` | Checks for SG1-SG7, SG10, SG11 and a `shot()` of the card and of a tile; grading: no `atlas-group-*` on a thin card or tile (SG8). |
| `src/lib/__tests__/explore/atlas.test.ts` | AG4's words updated to the rewritten explanation (the auditor's finding 3). |
| `docs/research/adjacent-apps.md` | The spec's three precedents under a new job, unverified (S7). |

## Data

No truth and no migration. The cached profile's `tally` changes meaning: Sights places are kept by kind in `shares`
(today only small subsets are), Local life by bar in `counts`. Stored `steps` are counted with every small subset off,
as now, so with the default switches they are unchanged (SG9). `ATLAS_OWN` a14 to a15 with nothing carried: a profile of
a14 has no per-kind Sights, so every area is read once more (the atlas's own queue, one ring at a time). `PRESENCE_CODE`
is unchanged.

## Tests per criterion

| Id | Test | Where |
|---|---|---|
| SG1 | headings, their order, the rows under each, the line under Sights | e2e `atlas`; the cold find on the built card (decision 0167) |
| SG2 | `groupsPresent` order and empty groups (unit); at 320 px, on the selected tile of the all-eight fixture, the last chip's right edge inside the strip; no wider space with one group | `src/lib/__tests__/explore/sightsLife.test.ts`; e2e `atlas` |
| SG3 | headings' `aria-level` one under "What's here", read order within the section | e2e `atlas`, scoped to the section |
| SG4 | eight rows; both headings on Green Row (Local life all none); none while reading | e2e `atlas` |
| SG5 | `tileLabel` names the groups present, in order | unit `sightsLife.test.ts`; `atlas.js:51`'s `History: (some|plenty|lots)` still matches |
| SG6 | headings sentence case, not the section title's style; no per-group colour; Storefronts after the section | e2e `atlas` (computed style and DOM order) |
| SG7 | the explanation's words for ring, outline and shape, no digit; AG4 and `hoodAudit` held | unit `sightsLife.test.ts`, `atlas.test.ts` AG4, `hoodAudit.test.ts` |
| SG8 | no heading on a thin card or tile | e2e `grading` (Quiet Hollow) |
| SG9 | PS8 unedited; over `presenceSample.json` the groups' kinds end to end equal the present kinds in `ATLAS_ORDER` | `readers.test.ts` (unchanged), unit `sightsLife.test.ts` |
| SG10 | the groups hold every kind once, in `ATLAS_ORDER`; the spoken and waiting lines in that order | unit `sightsLife.test.ts` |
| SG11 | no digit or busy word in the section, the strip, the spoken line or the panel | unit over the strings; e2e `atlas` scoped |
| SG12 | a tally with History kinds off reads History "none", back on restores it; Local life unmoved; a historic museum off leaves both bars | unit `sightsLife.test.ts` over `presenceTally`/`stepsFrom`; e2e `atlas`: switch off a kind in "What I'm into", the card's row says "none" |
| SG13 | the line over Sights first, Local life only with no Sight; the old AG lines | unit `sightsLife.test.ts`; `atlas.test.ts`'s character test updated ("Lots of history and food" becomes "Lots of history") |

New test file `src/lib/__tests__/explore/sightsLife.test.ts` in the existing `explore` feature. No new journey.

## Deferred

- Everything of phase 2 (decision 0200), held until chronicles-data covers National Park Service sites.
- Local life's line in words and any map layer for it (0200).
- Whatever the owner answers to "Open" 2 and 3, if not now.

## Native

No native-only code. Unverified on a phone, one item in `docs/NATIVE_UNVERIFIED.md`: the group headings on VoiceOver and
TalkBack (no heading levels there) and their read order; the tile's 16 px between groups inside the `nowrap` row at
320 px.

## Cost

Two headings, one line and a margin per card; a margin per tile; `groupsPresent` filters eight kinds per render. A switch
reads `stepsFrom` per listed area, as small subsets already do (at most a few dozen areas). The a15 bump reads every
listed area's ring once more, through the existing one-at-a-time queue: the same cost as any `ATLAS_CODE` bump. No harness
needed (`scripts/perf-explore.js` is unaffected).

## Goal to control

| Action | Goal, frequency, situation | Control | Matrix row | Adjacent apps |
|---|---|---|---|---|
| Read what an area has to find | Each look at an area, standing or before setting out | Rows under the heading "Sights", its one muted line | L1 (a list with section headers) | Atlas Obscura shows only finds; Google's "Things to do" |
| Read what kinds of places an area has to go into | Same | Rows under the heading "Local life" | L1 | Google's Restaurants, Coffee, Shopping; Walk Score's types, without its score |
| Compare areas at a glance | Swiping the row | The tile's strip, the groups 16 px apart; the tile's spoken line names them | none recorded for the strip; WCAG 1.3.1 for the spoken line | none recorded |
| Learn how the marks work | Rarely, first visits | "How the marks work", unchanged control, new words | row 19 (inline, in words) | none recorded |

**Where the owner will look first:** on the card, under "What's here", where the rows are today; each heading sits right
above its group's first row. On a tile, the strip under the name, where the icons are today.

**Defaults that make a control quieter** (the owner may overrule):
- The headings are sentence case, about 14 px, semibold, in ink: below the card's name and apart from the uppercase,
  muted section titles (the UX review's U1).
- **The tile has no words**, only 16 px between groups: "Life" does not fit at 320 px (0200 named it; dropped here,
  decision 0201).
- No colour, icon or total per group; each kind keeps its own colour.

## Against precedent

- **No chips to filter by type** (Google): Explore shows presence, not a search; the map is filtered by "What I'm into".
- **No score per group** (Walk Score): Never "Scores".
- **Local life is on the card at all** (Atlas Obscura shows none): the owner's call (0200); it says which kinds of places
  are there, in dots and words.

## The owner's answers (Nov 18, decision 0201)

1. The tile: space alone, no word.
2. The tile's line leads with the Sights kinds, Local life only when there is no Sight (SG13).
3. The Sights bars follow "What I'm into" now (SG12): a change to what a bar counts, so the tally changes and the atlas's
   own code goes to a15.
