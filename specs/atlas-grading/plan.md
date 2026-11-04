# Atlas grading: plan

Approved by the owner 2026-11-04 ("Go ahead"), with distance weighting dropped in
favour of a next slice: dots across the whole area, density as its own layer.
Spec: `specs/atlas-grading/spec.md`.

## Files

| File | Change |
| --- | --- |
| `src/lib/atlas/atlas.ts` (core) | `AtlasPlace` gains `markable?: boolean`. `presenceSteps` skips places of the five findable kinds (`MARK_CATEGORIES`) that are not markable (AG1). `AtlasProfile` gains `thin?: boolean`; `thinRing` (fewer than `ATLAS_RULES.thinPlaces` = 3 places in the ring, AG3). `characterLine`, `tileLabel` say nothing about kinds for a thin ring. `MARKS_EXPLAINED` reworded (AG4). `ATLAS_CODE` a3 → a4 (AG6). |
| `src/lib/atlas/read.ts` (shell) | `profileFrom` passes `markable: isMarkable(p)` with each place and sets `thin`. |
| `src/components/atlas/AtlasCard.tsx` | A thin ring: no kind rows and no "How the marks work"; the waiting and found sections stay. |
| `src/components/atlas/AtlasTile.tsx` | A thin ring: no kinds and no character line. |
| `src/lib/discovery/tilePois.ts` | No behaviour change; exports `markableClasses()` so AG5's test can list them. |

## Data

Cache only. `profile` is JSON in `atlas_area` (SQLite) and a whole object in
IndexedDB, so `thin` needs no migration and no IndexedDB version. The `ATLAS_CODE`
bump makes every row stale, so every ring is read again; nothing is patched.

## Tests per criterion

| Id | Test |
| --- | --- |
| AG1 | `atlas.test.ts`, `AG1: the findable kinds count only markable places; food, shops, nightlife count all` |
| AG2 | `atlas.test.ts`, `AG2: a findable kind with a place waiting has a dot; one with no dot has nothing waiting` |
| AG3 | `atlas.test.ts`, `AG3: fewer than 3 places in the ring is thin, and the tile's words say nothing about kinds`; e2e `marks`: the card of a thin area shows no kind rows, when the fake grid has one |
| AG4 | `atlas.test.ts`, `AG4: how the marks work names what counts, with no digits` |
| AG5 | `discovery.test.ts`, `AG5: every markable class is in a findable kind and off the never list` |
| AG6 | `atlas.test.ts`, `AG6: a profile from older rules is not current` |

Existing tests that may change: AT4 and the e2e's `History: (some|plenty|lots)`
check, whose places must be markable.

## Deferred

- **Whole areas** (next slice, the owner's call): a town graded across its outline,
  a neighborhood across its share of the town; dots say how much the area holds;
  density as shading on the area's picture.
- Green by area (WHO, Natural England), already in `docs/DEFERRED.md`.
- A significance file per tile (Wikidata, QRank, heritage, Wikivoyage): decision 5.
- Retuning `STEPS` against real towns.

## Native

No native-only code. Native has never run on a device; the card and tile changes
are shared components, verified on the web build only.
