# Plan: Sights and Local life, phase 1 (SG1-SG11)

For the owner's review before any code. Decision 0197; spec `specs/sights-and-local-life/spec.md`. Revised after the
plan review (the spec's "Plan review" section: steward, auditor, UX reviewer, Nov 18).

## Files

| File | Change |
|---|---|
| `src/lib/atlas/atlas.ts` (core) | `KIND_GROUPS`: `sights` (history, art, culture, parks, viewpoints) and `life` (food, shops, nightlife), labels "Sights" and "Local life", their concatenation `ATLAS_ORDER` (SG10). `groupsPresent(steps)`: each group's present kinds, empty groups dropped (SG2, SG9). `SIGHTS_LINE` (SG1). `MARKS_EXPLAINED` lines 1-3 rewritten, the ring's line kept last (SG7). `tileLabel` says the groups (SG5). |
| `src/components/atlas/AtlasCard.tsx` | Inside `!p?.thin` and only with `p`: a heading per group (`atlas-group-sights`, `atlas-group-life`), `accessibilityRole="header"` with `aria-level` one under "What's here" on the web; `SIGHTS_LINE` muted under Sights; the rows under their heading (SG1, SG3, SG4, SG6). A new `groupTitle` style. |
| `src/components/atlas/KindStrip.tsx` | Chips 4 px apart within a group, the first Local life chip 16 px from the last Sight (`marginLeft`), no spacer element; `nowrap` kept (SG2). |
| `scripts/e2e/harness.js` | A gated fixture area that lights all eight kinds (served behind a flag, as `smallWorld` is) (SG2). |
| `scripts/e2e/journeys/atlas.js`, `grading.js` | Checks for SG1-SG7, SG10, SG11 and a `shot()` of the card and of a tile; grading: no `atlas-group-*` on a thin card or tile (SG8). |
| `src/lib/__tests__/explore/atlas.test.ts` | AG4's words updated to the rewritten explanation (the auditor's finding 3). |
| `docs/research/adjacent-apps.md` | The spec's three precedents under a new job, unverified (S7). |

## Data

None: no truth, no cache, no migration, no `ATLAS_CODE` or `PRESENCE_CODE` bump. Steps are read as stored.

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

New test file `src/lib/__tests__/explore/sightsLife.test.ts` in the existing `explore` feature. No new journey.

## Deferred

- Everything of phase 2 (decision 0197), held until chronicles-data covers National Park Service sites.
- Local life's line in words and any map layer for it (0197).
- Whatever the owner answers to "Open" 2 and 3, if not now.

## Native

No native-only code. Unverified on a phone, one item in `docs/NATIVE_UNVERIFIED.md`: the group headings on VoiceOver and
TalkBack (no heading levels there) and their read order; the tile's 16 px between groups inside the `nowrap` row at
320 px.

## Cost

Two headings, one line and a margin per card; a margin per tile; `groupsPresent` filters eight kinds per render. No read,
write or per-frame work. No harness needed.

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
- **The tile has no words**, only 16 px between groups: "Life" does not fit at 320 px (0197 named it; dropped here,
  pending "Open" 1).
- No colour, icon or total per group; each kind keeps its own colour.

## Against precedent

- **No chips to filter by type** (Google): Explore shows presence, not a search; the map is filtered by "What I'm into".
- **No score per group** (Walk Score): Never "Scores".
- **Local life is on the card at all** (Atlas Obscura shows none): the owner's call (0197); it says which kinds of places
  are there, in dots and words.

## Open for the owner

1. **The tile:** 16 px between the groups and no word (recommended: "Life" does not fit at 320 px), or "Life" on wider
   phones only?
2. **The tile's top line** (`characterLine`, "Plenty of food and shops"): it is the first thing read on a tile and
   repeats the Stroudsburg claim. Lead it with the Sights kinds when any are present, falling back to Local life
   (recommended), or leave it across both for phase 1?
3. **Switched-off kinds:** with every History kind off in "What I'm into", History still reads "plenty" under Sights and
   no "?" appears (0127: the bars group the kinds, the switches do not change them). Leave it and record it in
   `docs/DEFERRED.md` for phase 2 (recommended), or make the Sights bars follow the switches now (a change to what a bar
   counts, so no longer view only)?
