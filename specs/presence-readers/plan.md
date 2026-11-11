# Presence readers: plan

Resumed on main (T8, decision 0146): the plan was written on `0d03c4b`, before community parks moved `ATLAS_CODE` to a9; read its `a8.p1` and `a8.p2` as `a9.p1` and `a9.p2`, and `greenKind` as `discovery/green.ts`.

From G4, answered yes Nov 11 (`/tend inbox G4 yes`); decision 0140. Read by the steward, not held for the owner (decision 0130); the steward's findings are triaged at the end, with the owner's proxy's rulings.

## Files

- `src/lib/presence/presence.ts` (core):
  - the vocabulary gains `curiosity` (Viewpoints, curiosities), `structure` (History, structures), `woodland` (no category), and `recorded`, `historic_name`, `historic` (no weight; `historic` is History with no kind, so it is never a place's first class);
  - three classes renamed so that no class is spelled as a source's tag (PS7): `memorial` to `memorial_site`, `cemetery` to `burial_ground`, `nature_reserve` to `reserve`;
  - `classesOfArchive(cls)`: the archive's table (contract v2's 22 classes, each to one class, plus `recorded`), PS1, PS6;
  - `classesOfLandcover(cls, sub)`: `grass` with `park` or `garden` to `park`, `wood` to `woodland`, PS4;
  - `named(classes, name)`: adds `historic_name` when the name is notable, and `historic` to a `museum` that is recorded or whose name is notable once a neighbourhood's "Old Town" and "old and new" are read past (PS2, PS3);
  - `PRESENCE_CODE` `p2` (PS9).
- `src/lib/presence/notable.ts` (core) and `notable.json` (moved from `discovery/`): the one word list and `notableName` (PS3), with the word normalisation chains share (`normalizeBrand` becomes its alias in `noise.ts`).
- `src/lib/discovery/types.ts`: `Place.classes?: PresenceClass[]`, set by an adapter on a fresh read and never stored; `alsoBars` goes.
- `src/lib/discovery/tilePois.ts`: a place's classes are `named(classesOfOsm(...), name)`; `markable` from curation over them.
- `src/lib/discovery/archivePois.ts`: `archivePlace` asks presence (`classesOfArchive`, `named`), takes its category and kind from the mark class, `markable` from curation; `ARCHIVE_CLASSES` stays as a listing derived from presence, for PW5's pin and the contract test; `ARCHIVE_ALSO` goes.
- `src/lib/discovery/curation.ts`: `isMarkFor(classes)`: a mark class not ruled out, and `BY_NAME` only with `recorded` or `historic_name` (PS6); `countsToward(p)`: the atlas's rule (a findable category counts only places that could be marks, AG1), shared by the atlas and the planner (PS5).
- `src/lib/discovery/noise.ts`: `notableName` leaves (presence holds it); `MARK_CATEGORIES`, chains and `isMarkable` stay.
- `src/lib/discovery/bars.ts`: `barsOf(p)`: the place's category, and History beside it only from `historic` (PS2, PS11); `historicName` goes.
- `src/lib/atlas/atlas.ts`: `AtlasPlace.classes` for `alsoBars`; `presenceSteps` counts by `countsToward` and `barsOf`; `CARRIED` holds `a8.p1` for both levels (PS9).
- `src/lib/nav/scenicSignals.ts`: `greenKind` reads `classesOfLandcover` (PS4).
- `src/lib/walkPlanner/service.ts`: `MARK_KINDS` goes; places count by `countsToward` (PS5). A fresh read always sets `markable`, so the rule is the planner's own as it was.
- `src/lib/db/index.web.ts`: `putPlaces` leaves `classes` out of the stored object (the web stores a place as given; no stored field is added). Native writes named columns (`sqliteStore.ts`).
- `src/lib/landing/view.ts`: `LANDING_CARRIED` gains the `p1` version (no weight changed: PR4's golden).
- Docs: `.claude/rules/explore-and-discovery.md` (presence's lines: the second slice is done; the bars and the notable rule), `.claude/rules/navigation.md` (greens from presence), `docs/ARCHITECTURE.md` (codemap), `docs/DEFERRED.md` (the second slice and F3 settled; the steward's two silent points filed `[owner]`), `docs/PRODUCT.md` if it names the archive's table.

## Data

No new truth and no stored field. `classes` lives on fresh reads only (as `kind`), stripped where the web would store a place. `PRESENCE_CODE` p2 moves `ATLAS_CODE` to `a8.p2` and `LANDING_VERSION` on; rows of `a8.p1` and of the `p1` landing version stand (PS8 holds every derived answer).

## Tests (src/lib/__tests__/presence/)

- `readers.golden.json`, captured from the code before the slice (`0d03c4b4`) by a script kept in the run's scratchpad (named in the record): the archive's 22 classes under a plain, a notable and a neighbourhood name (category, kind, markable, bars); every `golden.osm` pair under the same three names; the landcover pairs OpenMapTiles emits (green or not, and which); and `ringOf`'s steps, marks and thinness for presenceSample's 152 areas and presenceTowns' 4.
- `readers.test.ts`, one test per id: PS1 (presence has `classesOfArchive`; `archivePois.ts` spells no category or kind; PW5's table unchanged), PS2 (a historic museum's classes are museum and historic, from the archive and from a name; `barsOf` reads classes; `alsoBars` gone), PS3 (one `notableName` and one word list, in presence; `bars.ts`, `curation.ts` and `noise.ts` hold no name rule; "Old Town Hall" is a historic name, "Old Town Museum" is not historic), PS4 (`greenKind` reads presence; the landcover golden holds), PS5 (no category list in `walkPlanner/service.ts`; a historic-named map museum lights History for the planner as the archive's does), PS6 (plain memorial: a mark from the archive, not from the map, a mark from the map by a notable name, one place where both hold it, the archive's), PS7 (the guard with no `ALLOWED`, over poi classes, Overture roots, the archive's distinctive classes and `grass`), PS8 (every golden row holds; PK5's ratio over the sample; the three "Old ..." civic names are marks), PS9 (`PRESENCE_CODE` is not `p1`; an `a8.p1` row and a `p1` landing row are current), PS10 (no weight; outside presence only `curation.ts` and `bars.ts` name them, and neither sorts), PS11 (a place with a second categorised class that is not `historic` lights its own bar alone).
- `presenceAudit.test.ts` (presence audit 2): `ALLOWED` emptied, as PS7 says.
- Re-pinned on purpose: TP10 and PW10 name `ATLAS_CODE`; they move to `a8.p2`.

## Screens

None change: the golden tables hold every bar and mark of the fixtures. By `docs/TESTING.md`, "Choosing the journeys", logic a unit test proves needs no journey; the slice runs `atlas` (the bars on screen) and `curiosities` (the archive's marks) once at the end, as the first slice ran its consumers' journeys.

## Deferred

G2 (Storefronts as a presence class) follows. A find keeps only its category (presence-and-kinds audit 4), unchanged.

## Native

None: pure modules, and the web store's `putPlaces`.

## The steward's findings (Nov 11), triaged

Rulings by the orchestrator, who holds the owner's delegated authority for this run.

- **S1 (medium) accepted.** PS3 as first planned took the bars' reading for marks, so a map town hall named "Old Town Hall" would have lost its "?" wherever no archive holds it (Boston's Old City Hall in presenceSample is an archive building, so the fixtures could not show it). Now one word list and one `notableName` decide; the read-past stays only in the step that makes a museum `historic`. PS8 gains the steward's criterion and lists no change, so no before and after pictures are owed (decision 0140's call 3 asks for them only for a change); the atlas carries `a8.p1` as landing carries `p1`.
- **S2 (low) accepted.** PS6 now states the rule itself (a mark where the archive records it, from the map by a notable name, one place where both hold it) and its test pins it; the spec's Decisions and Record say F3 is settled by keeping the difference, and why.
- **S3 (low-medium) accepted.** The classes are named for what they record: `recorded` (the archive) and `historic_name` (the name); curation judges (`BY_NAME` needs one). PS10 holds that they weigh nothing and rank nothing. `classes` is never stored (web stripped in `putPlaces`, native named columns), so this is no data-model change.
- **S4 (low) accepted.** PS11: a second bar only from `historic`; PK5's sample check runs inside PS8.
- **Silent points (a) and (b)** (an archive that fails to load leaves a recorded plain memorial without a mark; Philadelphia's Old City Hall museum stays out of History): existing behaviour and out of this slice; filed `[owner]` in `docs/DEFERRED.md`, Explore and discovery.
- **Q4:** nothing found (no score, count or ranking; nothing leaves the device; no stored field).
