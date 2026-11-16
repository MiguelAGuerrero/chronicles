# Small places: the plan

For the owner's review before any code. Spec: `spec.md` (SP1-SP18); the data side: `handoff.md`.

## Order of work, and the blocker

The app pins chronicles-data's contract, and PP17 fails until the app's archive table is exactly the contract's classes.
So the data side comes first: contract v3 and its classes (handoff.md), then this repo takes the copy. **chronicles-data
is not attached to this session** (attaching it was refused by the session's permission check), so either the owner
attaches it (or allows `add_repo` for it) and I build the data side first, or the data side is built in a session on
that repo and this slice starts from its contract. Until then nothing below can pass SP17.

## Files

| File | Change |
|---|---|
| `src/lib/__tests__/explore/contract/*` | contract v3, copied from chronicles-data (SP17) |
| `src/lib/presence/presence.ts` | new classes `plaque`, `small_memorial`, `old_stone`, `wayside_shrine`, `time_capsule`, `public_bookcase`, `community_garden` (the archive's `artwork` reads presence's `artwork`), each with a category, a kind and a new `bar` weight (¼, ½ or 1; absent is 1), never `storefront` (SP14); the archive table gains them; `PRESENCE_CODE` p4 |
| `src/lib/discovery/types.ts` | `Kind` gains `plaques`, `small_memorials`, `old_stones`, `wayside_shrines`, `time_capsules`, `little_libraries` |
| `src/lib/discovery/smallPlaces.ts` (new, core) | the six refinements (a place's presence class decides its subset), `SMALL_KINDS`, `DEFAULT_OFF`, and each class's unnamed label (SP3, SP5) |
| `src/lib/discovery/refinements.ts` | the refinements registered after `communityParks` |
| `src/lib/discovery/archivePois.ts` | an unnamed place of a small class enters as `generic` with its label as name; other classes still need a name (SP5, SP6) |
| `src/lib/explore/explore.ts` | `KINDS` gains the six rows, each after its parent; `parseHidden` adds a `DEFAULT_OFF` kind missing from `explore_kinds_known` (SP7, SP8) |
| `src/lib/atlas/atlas.ts`, `atlas/profile.ts` | bars weigh by `bar`; a profile keeps the base counts apart from each small subset's share; `stepsShown(profile, hidden)` derives the dots; `ATLAS_CODE` bump (SP12, SP13) |
| `src/components/atlas/AtlasTile.tsx`, `AtlasCard.tsx`, `KindStrip.tsx` consumers, `atlas.ts`'s tile label | read `stepsShown` with the reader's switches instead of `profile.steps` (SP13) |
| `src/lib/walkPlanner/service.ts`, `nav/scenicSignals.ts` | leave the small subsets out (SP16) |
| `src/lib/discovery/parkKind.ts` | a small place is never a signal that keeps a park a park (SP19) |
| `explore/explore.ts` (`passedPlaces`, `passedLine`), `components/atlas/AtlasCard.tsx` (Found) | small places named only when nothing else was passed; articles and plurals; unnamed finds of one type as one row (SP20-SP22) |
| `scripts/e2e/journeys/small-places.js` (new) | the archive fixture with a time capsule, plaques and an unnamed little library; SP1, SP2, SP7, SP9-SP11, SP13 |
| `scripts/features.js` | the slice in `IN_PROGRESS`; the journey on the explore feature |
| `.claude/rules/small-places.md` (new) | the subsets, the defaults, the bar weights and their trap (below) |
| `docs/PRODUCT.md`, `docs/STATUS.md` | the feature; the slice's rows (by `npm run records`) |

## Data

- **No new truth and no migration.** The switches stay in meta `explore_hidden` and `explore_kinds_known` as they are.
- **Cache:** the atlas profile (`atlas_area`, a derived store) gains two fields; `ATLAS_CODE` is bumped, so every row is
  read again once. **The owner's call (data model):**
  - **A. Recommended:** `counts` (each category's count without the small subsets) and `shares` (each small subset's
    weighted sum per category); the dots are thresholds over `counts` plus the shares of the subsets switched on. Exact,
    and a switch only re-adds.
  - B: derive the five findable categories' dots from `profile.marks` at render. No new field, but the marks are not
    exactly what bars count today (a chain's mark counts toward a bar but isn't a "?"), so existing bars would move.
- Checklists need nothing new: a place's kind comes from its fresh read, and an area is rebuilt when its archive block's
  hash changes (PP13).

## Tests

| Ids | File | Kind |
|---|---|---|
| SP3, SP4, SP5, SP6, SP18 | `src/lib/__tests__/explore/smallPlaces.test.ts` | core: the archive table, unnamed labels, the cell, the merge |
| SP7, SP8, SP9, SP10, SP11 | same file | core: `parseHidden`, `kindRows`, `kindSwitch`, `visibleMarks`, `waitingMarks` |
| SP12, SP13 | `src/lib/__tests__/explore/smallPlacesBars.test.ts` | core: `presenceSteps`, `stepsShown` over a profile |
| SP14 | `src/lib/__tests__/presence/presence.test.ts` | core: no small class is a storefront |
| SP15 | `smallPlaces.test.ts` + `npm run check:vision` | core: `passedLine` with five plaques; copy has no count |
| SP16 | `src/lib/__tests__/walk-planner/` | core: a History leaning ignores plaques |
| SP17 | `placesContract.test.ts` (PP17, existing) | the contract copy |
| SP19 | `src/lib/__tests__/explore/communityParks.test.ts` | core: `parkKind` ignores small places as signals |
| SP20, SP22 | `smallPlaces.test.ts` | core: `passedPlaces`, `passedLine` |
| SP21 | `smallPlaces.test.ts` + the journey | core: the Found list's rows; e2e on the card |
| SP1, SP2 (and SP7, SP9, SP10, SP11, SP13 seen) | `scripts/e2e/journeys/small-places.js` | e2e |

## Screens: goals and controls

| Action | Goal, how often, situation | Control | Matrix row | Where the owner looks first, and what they see |
|---|---|---|---|---|
| Turn a small type on or off | Occasional, in the walk's drawer or the ready bar's settings | A switch in a list row under its parent, as Community parks | 14 (a switch in a list row, effective immediately) | "What I'm into", under the parent's row: an indented row with the subset's name and its switch |
| See a small place | Each walk | the existing "?" and the card | (existing) | the map's "?", named within 60 m |

Precedent: Community parks under Parks and gardens (decision 0143), the same row and indent.

**Defaults to overrule** (each quieter than it could be, or a choice the decision left open):
- **Murals and sculptures and community gardens get no switch of their own:** they join Public art and Parks and gardens.
  Both are on by default, and their parents already hold the same things from the map's tiles; a switch of their own
  would split tile artworks from archive artworks by source, not by type.
- **The four History subsets start off** (the owner's defaults): a new reader sees no plaque until they look in "What I'm
  into". Nothing announces the new rows.
- **The planner and scenic routes leave every small subset out**, on or off (SP16), so a route never detours for
  benches; whether a reader's switched-on subsets should lean a route is for the breakdown slice.
- **Unnamed labels are singular nouns** ("Plaque", "Memorial", "Milestone"); a Stolperstein is "Memorial" when unnamed.

## Deferred

- The breakdown of a bar by type (the owner's own later slice, decision 0183).
- Labels in other languages (the app's copy is English).
- Overture places of these types (0109: Overture stays for storefronts).

## Native

Nothing native is new: the switches, the reads and the cards are shared code. The rows' layout on a phone is unverified
on a device, as the rest of "What I'm into"; added to `docs/NATIVE_UNVERIFIED.md` with the slice.

## The rule file's trap

The dots are no longer `profile.steps`: every reader of an area's bars goes through `stepsShown(profile, hidden)`, or an
off subset lights a bar.
