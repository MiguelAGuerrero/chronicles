# Plan: Places worth the stop (the archive and Curiosities)

Spec: `specs/places-worth-the-stop/spec.md` (PW1-PW16). Decision 0096. Nothing here is built; the owner reviews it first.

## The seam

`placesFromTilePois` has six callers (`landing/read.ts` `readAround`, `atlas/read.ts` `profileFrom`, `tileFetch.ts`, `walk.tsx`, `finish.ts`, `nav/scenicRead/shell.ts`). The archive enters at the two that decide marks and grading, as Overture does:

- `readAround` (the explore read, so checklists and "What's good here"): read the archive for the same tiles in parallel with the map tiles, merge, and give `buildChecklists` the merged places. Archive places are **not** put in the `place` cache (its `build` tag is the tile build; the archive has its own version). They are memoized per tile and version in memory, like Overture's.
- `profileFrom` and the atlas ring read: the same merge, so the dots and the "?" agree (AG1).
- Not wired: `tileFetch.ts`, `walk.tsx`, `finish.ts` (they only fill the place cache) and the scenic routes' read (deferred, below).

## Files

**Core (new), `src/lib/discovery/`:**
- `archivePois.ts`: the only file that knows the archive's schema (as `tilePois.ts` knows OpenMapTiles'): decodes a tile's features into `Place[]` (`markable: true`, a `kind`), through the pinned class table (PW5). Unnamed places dropped.
- `archiveMerge.ts`: `mergePlaces(tilePlaces, archivePlaces)` (same name within 50 m in any category is one, the archive winning; PW8) and `applyEdits` (PW13).
- `archiveManifest.ts`: parse `manifest.json`, `pickRegion(manifest, centre)`, `manifestDue(checkedAt, now)` (PW2).
- `archiveEdits.json`: the owner's removals and adds, beside `chains.json`.

**Shell (new), `src/lib/discovery/archive/`:**
- `shell.ts`: `createPlacesArchive(p: Pick<Ports, 'db' | 'clock'>, io)`, a factory taking its archive opener and text fetch; the manifest check, the region's reader, the version known. `index.ts`: the app's instance (`// @instance`). `useArchiveVersion.ts`: a view hook beside `useOvertureRelease`, for the atlas's staleness.
- `activity/reader.ts`: generalize `OvertureReader` into one reader over `T extends { id: string }` (the audit-hardened timeouts, abort, afresh-on-failure and once-per-tile memo), with `OvertureReader` kept as its Overture-typed use so its tests don't change. One robust reader, not a second copy.

**Changed:**
- `discovery/types.ts` and `explore/explore.ts`: `Kind` and the kinds list gain `curiosities` (the "What I'm into" switches derive from the list). `buildChecklists` takes merged places; `ChecklistArea` gains `archive: string | null`.
- `explore/exploreRun.ts`: passes the archive version; an area built without it while one is known, or with an older one, is rebuilt (PW12).
- `landing/read.ts`, `atlas/read.ts`, `atlas/atlas.ts`: the archive read and merge; `profile.archive`; `ATLAS_CODE` a6; `readQueue` rereads a ring measured without the archive while one is known.
- `lib/meta.ts`: `places_archive_manifest` and `places_archive_checked_at`, declared in `META`.
- `db/`: `checklist_area.archive` (below); `areaRow` mapping; a `dbContract.ts` case first.
- `scripts/check-vision.js`: the host in `ALLOWED_HOSTS`, with its reason (the owner's call, 0096).
- `scripts/features.js`: `places-worth-the-stop` moves from the `places` feature to `explore` (the code is in `discovery/**`), and the `explore` feature gains the `curiosities` journey.

**Build and fixtures (new):**
- `scripts/build-places-archive.js` with `scripts/places-archive/classify.js` (type decides; PW6), the gate and the writer, and `queries/` (the SPARQL and the OSM tag filter it expects). Output: a region's `places.pmtiles` and `manifest.json`, the same bytes each time. It reuses `scripts/pmtiles-encode.mjs` and `scripts/mvt-encode.mjs` (the e2e's encoders).
- `scripts/e2e/journeys/curiosities.js`: a fake manifest and archive served by byte range beside the fake Overture, an archive place and a tile place that are one, and a host that answers 404.

**Docs:** `docs/ARCHITECTURE.md` (the codemap), `.claude/rules/explore-and-discovery.md`, `docs/DEFERRED.md`, `docs/NATIVE_UNVERIFIED.md`, `docs/PRODUCT.md`, `docs/STATUS.md`, and the spec's record.

## Data

- **Truth:** nothing new. **Cache:** archive places are never stored; a checklist item still snapshots its place (E13), so a new archive version never loses a find.
- **SQLite:** one new entry at the end of `MIGRATIONS`: `ALTER TABLE checklist_area ADD COLUMN archive TEXT` (null for rows built before, which reads as "built without", so each is rebuilt once an archive is known). The next `user_version` is `MIGRATIONS.length + 1`.
- **IndexedDB:** `VERSION` is 16. Rows are whole objects, so the new field needs no store or index change; I will bump it only if the contract suite shows one is needed.
- **Atlas:** `atlas_area.profile` is one column; `profile.archive` needs no migration, and `ATLAS_CODE` a6 reads every ring again.
- **Meta:** the two keys above.

## Tests, by criterion

Names are `PWn: ...`. Pure logic in `src/lib/__tests__/explore/`, shells over `fakePorts()`, the screen in the journey.

| Id | Test |
|---|---|
| PW1 | `archiveShell.test.ts`: a fake archive records every `getZxy`; only the read's tiles, one region file. `check:vision` holds the host. Journey: the request log shows only ranged requests, with no cookie or credential header. |
| PW2 | `archiveManifest.test.ts`: `pickRegion`, the daily due time, a failed check's wait, no manifest and outside every region. |
| PW3 | `archiveShell.test.ts`: offline, timeout, 403, 404 and a header that never arrives each give no places and no error; the explore read equals one without the archive. Journey: the host answers 404; the tab is unchanged. |
| PW4 | `explore.test.ts`: the kinds list holds Curiosities, on by default, in the viewpoints category; the switch hides its places. Journey: "What I'm into" lists it. |
| PW5 | `archivePois.test.ts`: the pinned class table; an unmapped class is dropped. |
| PW6 | `placesArchiveBuild.test.ts`: a listed folly is a curiosity, a listed ordinary house is history, a statue is a monument. |
| PW7 | `placesArchiveBuild.test.ts`: output properties are exactly name, class, source and id; a place enters by a rule and never by a count. |
| PW8 | `archiveMerge.test.ts`: same name within 50 m across categories is one, the archive winning; a find on either source counts. |
| PW9 | `explore.test.ts`: `buildChecklists` with archive places (kind, area, unnamed dropped). Journey: a "?" for an archive place, found by a capture; a quiet walk reads it. |
| PW10 | `atlas.test.ts`: `profileFrom` counts them across a ring and an outline; dots and "?" agree; `profile.archive`; a ring measured without it is stale once one is known. |
| PW11 | Journey: no digit in the new strings. `check:vision` stays green. |
| PW12 | `exploreRun` shell test: an area built without the archive is rebuilt when one is known; a found item stays found. |
| PW13 | `archiveMerge.test.ts`: a removal and an add. |
| PW14 | `placesArchiveBuild.test.ts`: fixtures in, the same bytes out twice; the manifest names the region and its box. |
| PW15 | Journey, once the owner places it. |
| PW16 | Not automated: one fetch against the Pages deploy, recorded in the spec. |

A new journey, `curiosities`, because the slice changes what a screen shows. It also runs with the existing `marks`, `grading`, `atlas`, `tabs` and `walk` journeys that `check:affected` will name; `tabs.js` and `walk.js` name the kinds and need their counts updated.

## Order of work

1. **Sample real data first** (if this session can reach Wikidata and Overpass): a few miles around Phillipsburg and Catasauqua, to see what lands in each class before the table is pinned. If it can't, the fixtures stand and the owner runs the script.
2. Tests first, criterion by criterion; the generalized reader first, since two readers depend on it.
3. The build script and fixtures; then the reader and the merge; then the wiring and the atlas; then the journey.
4. PW16 once a real archive is on the Pages site.

## Deferred, and why

- **Scenic routes' Sights leaning.** It marks `viewpoints` places of a kind switched on, but reads the tiles only, so curiosities don't reach it until wired. Wiring is a separate choice: it would change routes people have already seen.
- **Wikivoyage, a line of why a place is worth the stop, the one-of-a-kind shops tier, an arrival list** (the doc's open questions 1 and 4): not this slice.
- **Regions beyond the US.** The script and manifest take them; no archive is built.
- **Native:** byte-range reads of the archive by `fetch` on a phone, the new migration, and the quiet walk's background archive read. All go in `docs/NATIVE_UNVERIFIED.md`. Native has never run on a device.

## Questions for the owner (they change the work)

1. **One reader, or a second?** I would generalize `OvertureReader` (its tests stay as they are). The alternative is a copy of its hardening for the archive.
2. **Who builds the archive?** The doc says a scheduled GitHub Actions job; decision 0096 says an owner-run script. The script is the same either way; the job would add a workflow that commits to or builds into the Pages artifact.
3. **Where is the credit line** for OpenStreetMap-derived places (PW15)?
4. **The place sheet's tally.** Curiosities join an area's checklist, so its "N of M" grows with the pool (Open question 6). Leave it, soften it or remove it now?
5. **The doc.** Its "Region packs" call (R2, a scheduled job) predates 0096. Update it, or should I mark the mirror as the newer text?
