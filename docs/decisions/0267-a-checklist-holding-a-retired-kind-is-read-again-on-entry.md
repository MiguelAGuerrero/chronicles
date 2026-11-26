# 0267. A checklist that holds a retired kind is read again on entry

Date: 2026-11-26 · Status: accepted · Area: explore · Amends: E4 (`specs/v1-discovery/spec.md`, "When the build changes, the checklist is rebuilt quietly the next time you enter the area"; `.claude/rules/explore-marks.md`, "a build change clears it, so areas are read again and rebuilt") · Follows: 0254 (clock towers apart from water towers, HK9, HK10) · From: T65, filed by the poi-hide-from-card diff review (F9)

## Context
Since `PRESENCE_CODE` p12 (G12, decision 0254) clock towers and water towers are two kinds. A checklist item read before
the split keeps the kind `towers` until its area is read again, which E4 tied to a new tile build (and PW12, PP13 to its
archive block's places changing). No store holds a place's class, so nothing can tell which tower an old item is: it
reads as Buildings and structures alone on its card and sheet (HK10) and stays on the map with Water towers off until
both tower switches are; 1,288 of the live places-us archive's 1,309 towers are water towers.

## Decision
The owner's answer in person, 2026-11-26, to T65: **"Yes, as recommended (Recommended)"**.

- An area whose checklist items hold a kind a split retired (`RETIRED`, `discovery/subtypes.ts`) counts as stale on
  entry, beside `archiveStale`: the next walk there reads it again and its towers take their own kinds.
- No migration and nothing stored anew: the staleness is read from the items already kept.
- A read that leaves such an area as it was is not asked again on the same screen, so it never reads on every check.

## Consequences
- `explore.ts` `retiredAreas` and `readCentre`'s `retired`; `exploreRun.ts` leaves such an area out of what it keeps;
  `useExplore.ts` asks once per area per screen. Test: `tend explore T65` (`src/lib/__tests__/explore/retiredReread.test.ts`).
- What a person sees changes only as the towers' kinds do after the read: a water tower hides with Water towers off.
  Finds keep the old kind and its words (HK10).
- The wording of E4 in `specs/v1-discovery/spec.md` and of the rule lines that state it is the owner's to amend (filed
  under "Open before the loop"); the loop added lines beside them.
