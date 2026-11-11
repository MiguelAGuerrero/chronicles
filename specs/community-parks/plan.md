# Community parks: plan

For the owner's review before any code. Spec: `specs/community-parks/spec.md` (PC1-PC14). Prefix PC (CP is the compass's).

## The idea in one paragraph

A park the tiles name is `parks` unless the evidence says it is plain; then it is `community_parks`, a second kind of the
same category. The kind is the only difference: category, colour, bar, mark, find and replay are the park's. The reader
switches the kind off in "What I'm into" and the plain ones go quiet; every other park stays. The judgement is a pure
core function over what a read already holds (the park point, the `landcover` outlines, the same read's places, the
archive's places), so nothing new is fetched.

## Files

New:
- `src/lib/discovery/parkKind.ts` (core): `parkKindOf(park, ctx)` and `outlineOf` (the area in m² of a ring set,
  the first ring outside, the rest holes, reusing `inRings` from `nav/scenicSignals` by moving it to a shared core file
  if the layer check wants it, else importing it); `PARK_RULES` (`smallM2: 10_000`, `largeM2: 50_000`, `signalNearM: 60`,
  `archiveNearM: 150`); `nameHas(words)`.
- `src/lib/discovery/communityWords.json`, `parkNotable.json`: data, like `notable.json`, whole words after `normalizeBrand`.
- `src/lib/__tests__/explore/communityParks.test.ts`: every criterion below. A new feature folder is not needed: it is
  the `explore` feature's folder.

Changed:
- `discovery/types.ts`: `Kind` gains `'community_parks'`.
- `discovery/tilePois.ts`: `placesFromTilePois(features, build, { complete, landcover })` sets `kind` through `parkKindOf`
  for `parks` places (the only change to its output: a park's `kind`). `markableFor` is untouched, so a community park is
  markable. No `landcover` means `parks` (PC3, PC11).
- `discovery/archiveMerge.ts`: `mergePlaces` promotes a `community_parks` place to `parks` when an archive place lies
  within `archiveNearM` (an upgrade only; the archive's places are never stored, PW1).
- `explore/explore.ts`: `KINDS` gets `{ id: 'community_parks', label: 'Community parks', icon: <not reader-outline or
  leaf-outline> }` after `parks`; `parseHidden` needs no shim (a kind not saved is on).
- The read sites that already hold `features.landcover` pass it: `atlas/read.ts` (`profileFrom`), `landing/read.ts`,
  `discovery/tileFetch.ts` (`collect`), `walk.tsx` (the walk's read), `finish.ts`, `walkPlanner/app.ts`,
  `nav/scenicRead/shell.ts`. The map views' reads (`collectView`) are checked in the first test; where they carry none a
  place stays `parks`.
- `discovery/bars.ts`: `PASS_BY` gains `community_parks` (a route still passes a park it does not go into).
- `atlas/atlas.ts`: `ATLAS_CODE` a8 to a9 (PC13).
- Kind readers: `ExploreSettings.tsx`, `AtlasTile.tsx`, `walkPlanner/service.ts`, `notify`, `deletion/saved.ts`,
  `gallery/layout.ts`, `landing/analyze.ts` import `KINDS`: each is read for a hard-coded list of kinds (first test: one
  that `KINDS` drives needs nothing; one that lists kinds by hand is fixed).

Not touched: the db (no migration: `kind` is read on a fresh read and a checklist item stores the string), `components/atlas/kinds.ts`
(colours and icons are by category, so the kind uses Parks').

## Data

Cache only. `kind` is set on fresh reads and snapshotted into checklist items, as `community` was. No new truth, no SQLite
migration, no IndexedDB bump, no meta key. A checklist built before this keeps `parks` until its area is read again (PC13);
the safe side: a park is shown, never hidden, in the meantime.

## The judgement (`parkKindOf`), exactly

Input: the park (name, point), the decoded green outlines (`greenFromTiles`'s `GreenArea`, parks and gardens only), the
read's other places, and, in `mergePlaces`, the archive's places. Output: `parks` or `community_parks`.

1. `parks` (keep) if any notable signal (PC2): a History, Art, Viewpoints or museum/theatre place inside the outline (within
   60 m of the point when no outline); a notable word in the name; an outline of 5 ha or more. (`mergePlaces` adds the archive
   place within 150 m.)
2. else `community_parks` if the name holds a community word (PC1a).
3. else `community_parks` if the outline is under 1 ha (PC1b), and `parks` with no outline (PC3).
4. else `parks`.

The point is in an outline when it is inside any ring of the `GreenArea` of its tile read (even-odd, a hole is outside);
two park points in one outline get one answer (PC5). A read that is not complete judges nothing (PC3, as `placesFromTilePois`).

## Tests, by criterion (`src/lib/__tests__/explore/communityParks.test.ts`, core: no fakes)

| Id | Test name | How |
|---|---|---|
| PC1 | `PC1: a community word with nothing near is community_parks; a small outline with nothing inside is; anything else is parks` | synthetic tile features: poi points and landcover rings |
| PC2 | `PC2: each notable signal keeps a park`, one case per signal | monument, artwork, viewpoint, museum, archive place (through `mergePlaces`), name word, 5 ha ring |
| PC3 | `PC3: no outline never demotes by size; an incomplete read changes nothing` | |
| PC4 | `PC4: both kinds are of category parks and markable, a dog park still never a mark` | |
| PC5 | `PC5: a multi-ring outline is judged as one, two points alike` | |
| PC6 | `PC6: Community parks is a kind after Parks with its own icon, on with nothing saved and after an old choice` | `KINDS`, `parseHidden` |
| PC7 | `PC7: no copy calls a park plain, mundane or notable and no count is made` | grep over the kind's label, `MARKS_EXPLAINED`, the walk and card strings (the vision check's words) |
| PC8 | `PC8: with the kind off a community park is not a "?", a waiting kind, an alert or a route lean; every parks place is; a found one stays` | `visibleMarks`, `waitingKinds`, `alertKeys`, `sightsFrom`/planner, with `hidden` |
| PC9 | `PC9: a community park is found by a capture within 60 m and shows in `foundList`` | `findFor` |
| PC10 | `PC10: Green is lit by a community park as by a park; presenceSample.json's bars are unchanged` | the recorded sample through `barsOf` and the atlas count; a check of `KIND_COLOR.parks` |
| PC11 | `PC11: parkKindOf is deterministic over its inputs and a read with no landcover is parks` | |
| PC12 | `PC12: no read adds a request`, the fetch log of a fake `PlaceSource`/`fetchTiles` equals before | |
| PC13 | `PC13: ATLAS_CODE is a9 and a stored place row carries no kind` | `placeRow` round trip |
| PC14 | `PC14: the named cases` | the six cases, the Allentown one only if its tiles are recorded |

The screen: one step in the `marks` journey (the "What I'm into" list shows "Community parks"; switched off, a
playground-named park on the harness's world is not a "?"; another park is). Todo-first `check.todo(...)`, `E2E_ONLY=marks`.

## Screens: each action

| Goal | When | Control | Matrix row |
|---|---|---|---|
| Skip the plain parks on this walk or for good | rarely, from the walk's drawer or the ready bar's options | one switch row in the existing "What I'm into" list, after "Parks and gardens" | settings switch (kind rows are already these) |

No other screen changes: the pin, dot, card and replay are the park's. The kind's label shows only where kinds are named
(the list, the area card's "Waiting to be found", the planner's kind page).

## Deferred, and why

- The map colouring of green spaces (the owner's next idea, its own gate). Park area in the Green bar. Trails as a signal.
- A fixture recorded from the Allentown park's real tiles: `tiles.openfreemap.org` is blocked from cloud sessions; the
  script `scripts/fixture-parks.mjs` records it from a machine that reaches it. Until then the cases are synthetic (PC14's
  last case is `deferred` in `scripts/features.js` with that reason).
- Subsets for other categories and a parent switch (the owner: parks only now).

## Native, unverified

The `landcover` of a decoded read is the same code on every platform (`tileDecode`); what is not known is whether the
native map view's own read (`collectView` on native) carries `landcover` (it is typed as optional). If it does not, native
parks stay `parks` until a decoded read (every walk and every Explore read decodes in code), so the failure is safe.
One `docs/NATIVE_UNVERIFIED.md` item: switch Community parks off and walk past a playground and a park with a monument.

## Open questions for the owner

1. The size threshold: under 1 ha with no signal is a community park. A small park with an unmapped plaque would be
   demoted by this alone, against "false positives for historic". A tighter 0.5 ha cuts that and keeps fewer demotions.
   Recommend 1 ha with the name-or-size rule, confirmed on the Allentown park; or demote by name only and leave size out
   until polygons are in use for the colouring.
2. The park you visited: its name, so the fixture is the real one.
3. Icon for Community parks (proposed `people-outline`; not `reader-outline` or `leaf-outline`).
4. Old checklists keep `parks` until their area is read again (PC13). Acceptable?
