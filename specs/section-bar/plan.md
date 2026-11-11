# Plan: the section bar names what Chronicle shows (SB1-SB5)

From G1 (decision 0130: the plan is read by the steward, not held for the owner).

## Files

| Criteria | Where |
|---|---|
| SB1, SB2, SB4 | `src/lib/resurface/section.ts` (core): `sectionOfSheet(kind, current)`, the section a sheet list names (`walks`, `days`, the rest `map`; a place's walks and a day's timeline keep `current`); `sheetForSection(section)`, the sheet a section opens (`walks`, `days`, `summary` for Map) |
| SB1, SB2, SB3 | `src/app/(tabs)/index.tsx`: `ChronicleMap` is no longer keyed by section, so one map stays mounted across Walks, Days and Map. The sheet's `onMode` also sets the section (`chronicleSection.set`), noting the section it now shows; a section that changes from the bar while the map is up sets the sheet's mode during render (React's "adjusting state when a prop changes", compared with the section last shown), never in an effect |
| SB5 | `scripts/e2e/journeys/chronicle.js`: a step after the walks list is reached |

`HomeSheet` and `SectionBar` do not change: the sheet already reports every list change through `onMode` (switch, Map, drag), and the bar already reports through `onChange`.

## Data

None: views and a core function. No migration, no stored field, no cache.

## Tests

- `src/lib/__tests__/resurface/section.test.ts`: `SB1` (each sheet list names its section), `SB2` (each section opens its sheet), `SB4` (a place and a day keep the section they were opened from; the existing RM1 tests hold the replay and the day's return).
- `scripts/e2e/journeys/chronicle.js`: `SB1` (the sheet's Walks, Days, Map: the bar follows), `SB2` (the bar's Walks, Days, Map: the sheet follows), `SB3` (one canvas, the map's `data-zoom` and centre unchanged across the moves), `SB5` (pictures `chronicle-sb-sheet-to-bar`, `chronicle-sb-bar-to-sheet`).

## Deferred

Nothing new. The sheet's own switch stays (0136); whether it is still needed once the bar is trusted is G1's "After it", for the owner.

## Native

No native code. The same views run on a phone (unverified on a device, as all of it): one map mounted across the three sections on MapLibre RN.

## Actions on the screen

| Action | Goal, how often | Control | Matrix |
|---|---|---|---|
| Choose Walks, Days or Map from the bar | change what Chronicle shows, every visit past Memories | segmented tabs at the top (unchanged) | row 13, two to five related views of the same content: a segmented control or connected button group |
| Choose Walks, Days or Map from the sheet | the same, within the thumb's reach | the sheet's switch and Map button (unchanged) | row 13; now kept in step with the bar (NN/g H4) |
