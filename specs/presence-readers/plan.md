# Presence readers: plan

From G4, answered yes Nov 11 (`/tend inbox G4 yes`); decision 0140. Read by the steward, not held for the owner (decision 0130).

## Files

- `src/lib/presence/presence.ts` (core):
  - the vocabulary gains `curiosity` (Viewpoints, curiosities), `structure` (History, structures), `woodland` (no category, no weight), `notable` and `historic` (no weight; `historic` is History, with no kind, so it is never a place's first class);
  - three classes renamed so that no class is spelled as a source's tag (PS7): `memorial` to `memorial_site`, `cemetery` to `burial_ground`, `nature_reserve` to `reserve`;
  - `classesOfArchive(cls)`: the archive's table (contract v2's 22 classes, each to one class, plus `notable`: the archive admits only recorded places), PS1, PS6;
  - `classesOfLandcover(cls, sub)`: `grass` with `park` or `garden` to `park`, `wood` to `woodland`, PS4;
  - `named(classes, name)`: adds `notable` when the name is notable, then `historic` to a notable `museum`, PS2, PS3;
  - `PRESENCE_CODE` `p2` (PS9).
- `src/lib/presence/notable.ts` (core) and `notable.json` (moved from `discovery/`): `notableName`, the one rule (PS3): a listed word as whole words, reading past "Old Town/City/Quarter/Village" and "old and new" (the bars' rule, presence-and-kinds audit 5).
- `src/lib/discovery/types.ts`: `Place.classes?: PresenceClass[]`, set by an adapter on a fresh read and never stored; `alsoBars` goes.
- `src/lib/discovery/tilePois.ts`: a place's classes are `named(classesOfOsm(...), name)`; `markable` from curation over them.
- `src/lib/discovery/archivePois.ts`: `archivePlace` asks presence (`classesOfArchive`, `named`), takes its category and kind from the mark class, `markable` from curation; `ARCHIVE_CLASSES` stays as a derived listing for PW5's pin and the contract test; `ARCHIVE_ALSO` goes.
- `src/lib/discovery/curation.ts`: `isMarkFor(classes)`: a mark class not ruled out, and `BY_NAME` only with `notable` (PS6); `countsToward(p)`: the atlas's rule (a findable category counts only places that could be marks, AG1), now shared by the atlas and the planner (PS5).
- `src/lib/discovery/noise.ts`: `notableName` leaves (presence holds it); `MARK_CATEGORIES`, chains and `isMarkable` stay.
- `src/lib/discovery/bars.ts`: `barsOf(p)` reads `p.classes` (its category first, then each other class's), else the category alone; `historicName` goes (PS2, PS3).
- `src/lib/atlas/atlas.ts`: `AtlasPlace.classes` for `alsoBars`; `presenceSteps` counts by `countsToward` and `barsOf`.
- `src/lib/nav/scenicSignals.ts`: `greenKind` reads `classesOfLandcover` (PS4).
- `src/lib/walkPlanner/service.ts`: `MARK_KINDS` goes; places count by `countsToward` (PS5). For a fresh read `markable` is always set, so the rule is the planner's own as it was.
- `src/lib/db/index.web.ts`: `putPlaces` leaves `classes` out of the stored object (the web stores a place as given; no stored field is added).
- `src/lib/landing/view.ts`: `LANDING_CARRIED` gains the `p1` version (no weight changed: PR4's golden).
- Docs: `.claude/rules/explore-and-discovery.md` (presence's lines: the second slice is done; the bars and notable names), `.claude/rules/navigation.md` if it names `greenKind`, `docs/ARCHITECTURE.md` (codemap), `docs/DEFERRED.md` (the second slice and F3 settled), `specs/presence/spec.md` untouched.

## Data

No new truth and no stored field. `classes` lives on fresh reads only (as `kind`), stripped where the web would store a place. `PRESENCE_CODE` p2 moves `ATLAS_CODE` to `a8.p2`: atlas rows are read again once (PS3's change can move a mark). Landing rows of `p1` stand.

## Tests (src/lib/__tests__/presence/)

- `readers.golden.json`, captured from the code before the slice by a script kept in the run's scratchpad (named in the record):
  the archive's 22 classes under a plain and a notable name (category, kind, markable, bars); every `golden.osm` pair under a plain name, a notable name ("Old ...") and a neighbourhood name ("Old Town ...") (category, kind, markable, bars); the landcover pairs OpenMapTiles emits (green or not, and which); and `presenceSteps` for each of presenceSample's 152 areas and presenceTowns' 4.
- `readers.test.ts`, one test per id:
  PS1 (presence has `classesOfArchive`; `archivePois.ts` spells no category or kind; PW5's table unchanged), PS2 (a historic museum's classes are museum and history, from the archive and from a notable name; `barsOf` reads classes; `alsoBars` is gone), PS3 (one `notableName`, in presence; `bars.ts` and `curation.ts` call no name rule), PS4 (`greenKind` reads presence; the landcover golden holds), PS5 (no category list in `walkPlanner/service.ts`; a notable museum from the map lights History for the planner as from the archive), PS6 (a memorial with the same classes and name answers alike from both adapters; plain from the map: no mark; from the archive: a mark), PS7 (the PR2 guard, `presenceAudit.test.ts`, with `ALLOWED` emptied and the archive's and landcover's distinctive classes added), PS8 (every golden row holds but PS3's listed change), PS9 (`PRESENCE_CODE` is not `p1`; a `p1` landing row is current).
- Re-pinned on purpose: TP10 and PW10 (`ATLAS_CODE` `a8.p2`), presence audit 1's version test if it names `p1`.

## Screens

None change: the golden tables hold every bar and mark of the fixtures. No journey's fixture holds a PS3 name. By `docs/TESTING.md`, "Choosing the journeys", logic a unit test proves needs no journey; the slice runs `atlas` (the bars on screen) and `curiosities` (the archive's marks) once at the end, as the first slice ran its consumers' journeys.

## Deferred

G2 (Storefronts as a presence class) follows. A find keeps only its category (presence-and-kinds audit 4), unchanged.

## Native

None: pure modules, and the web store's `putPlaces`.

## The steward's findings

(To be triaged here.)
