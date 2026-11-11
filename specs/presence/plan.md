# Presence: plan

From G3, answered yes Nov 11 (`/tend inbox G3 yes`); decision 0140. Read by the steward, not held for the owner (decision 0130).

## Files

- New, core: `src/lib/presence/presence.ts`: the vocabulary (`PresenceClass`, each class's density weight and, where it has one, its category and kind), `PRESENCE_CODE`, `classesOfOsm(cls, sub)` (one ordered table: subclass rules that hold under any class, then class rules, then class defaults) and `classesOfOverture(hierarchy)`, and the readers `densityWeight(classes)` (the greatest) and `markClassOf(classes)` (the first with a category).
- `src/lib/activity/weights.ts`: `osmWeight` and `overtureWeight` become `densityWeight` of presence's classes; the tables move to presence. Exported names stay, so `points.ts` and its tests are unchanged.
- `src/lib/discovery/tilePois.ts`: `categoryOfPoi`, the kind and `markable` come from presence's class; `MARKABLE_CLASSES` is listed from presence's table; `TRANSIT` stays (stations are not presence, and the landing's start is not a place).
- `src/lib/discovery/noise.ts` (or `tilePois.ts`): the curation sets keyed by presence class (`NEVER_MARK`, `BY_NAME`).
- `src/lib/atlas/atlas.ts`: `ATLAS_CODE` carries `PRESENCE_CODE`; `src/lib/landing/view.ts`: `LANDING_VERSION` carries it.
- `scripts/features.js` (a feature `presence`), `.claude/rules/explore-and-discovery.md` (paths, and the presence section), `docs/ARCHITECTURE.md` (the codemap), `specs/atlas-grading/spec.md` ("What a mark is": the classes PR5 adds), `docs/decisions/0080` (a line: amended by 0140).

## Data

No new truth and no stored field. Atlas rows and landing rows are re-derived once, as their codes change. Cached places keep their category from their read; nothing reads them (`placesIn` has no caller). Checklist items (kept) snapshot their place and are rebuilt only as today (a new build, E4, PW12): a class change reaches a checklist at the next tile build. Recorded in `docs/DEFERRED.md`.

## Tests (src/lib/__tests__/presence/)

- `golden.json`: every realistic poi pair's weight, category, kind and mark (plain and notable name), and Overture hierarchies' weights, captured from the code before the slice.
- `presence.test.ts`: PR1 (vocabulary, several classes, code), PR2 (no tag table outside presence: the poi class and Overture root names appear in `src/lib` only under `presence/`), PR3 (marks from classes), PR4 (weights from classes, both sources), PR5 (each listed change, same class for marks and density), PR6 (codes carry `PRESENCE_CODE`), PR7 (curation keyed by class), PR8 (every other golden row identical).
- The pinned list of markable classes (`explore/discovery.test.ts`, AG5) gains the classes PR5 adds: a deliberate change to "What a mark is".

## Screens

None change in a journey's fixture (none holds a PR5 tag). The journeys that cover the moved files run once at the end: `marks`, `atlas`, `grading`.

## Deferred

The archive's classes, bars, notable names, scenic routes' greens and the planner move onto presence in the second slice; G2 after. A checklist reclassifies at the next tile build, not at once.

## Native

None: pure modules only.
