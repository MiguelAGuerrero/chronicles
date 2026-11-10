# A staged places build: the plan

For the owner to review before any code. The criteria are `spec.md` (SB1-SB10). The open choices are at the end. The research behind it: `docs/research/incremental-places-builds.md`.

## What was found (Nov 9)

- `chronicles-data` has two workflows. `weekly-build.yml` checks out this repo's `main`, runs `fetch-wikidata.mjs --region us` (about 630 cells of 2°, one query at a time, 1.5 s apart, nothing kept), `build-places-archive.mjs`, then `publish.mjs`, which compares the file's SHA-256 with the manifest's and makes a release. `pages.yml` downloads the newest three releases' `places-*.pmtiles`, writes `manifest.json` with its own `scripts/manifest.mjs` (untested, in the data repo), and deploys Pages. It skips drafts and prereleases.
- The weekly build has never completed: its two runs failed on a YAML error, fixed in `95bf8c5` after Monday's slot. No release exists; the live manifest has no regions.
- This session can push to `chronicles-data` but cannot start its workflows (403 for the GitHub App): runs by hand are the owner's, from the Actions tab.
- **Measured against the Wikidata Query Service (Nov 9, one-off test queries):**
  - "Items of a class modified since a date", filtered by **country** (`wdt:P17`): 1-7 s per class (statue, memorial, war memorial, sculpture), a few to 71 changed items each over 30 days.
  - The same filtered by the region's **box** (`wikibase:box`): sculpture 46 s, memorial over the 60 s limit; all classes at once over the box: 504.
  - One 2° cell (central Pennsylvania), every class: 8 s, 177 items, 3 of them (about 2%) with no country. A full sweep of about 630 cells is then roughly 1-2 hours.
  - So a changes-first run is about 35 country-filtered queries plus the kept-items check: minutes, not hours.
- Phones: `archiveStale` (`explore/explore.ts`) and `archiveStaleProfile` (`atlas/atlas.ts`) compare versions only. A checklist area is built from one read of 1.5 km around its point; an atlas area from its ring (800 m) or, for a town, its outline's extent (at most 60 z14 tiles).
- The owner's edits are applied by the app at read time (`applyEdits`), and passed to the build (`--edits`), but an area already built picks them up only on a new version (audit F8).

## Design

### Kept outputs

- **Where:** a prerelease named `sources` in `chronicles-data` (open choice 2). Assets are replaced in place (`gh release upload --clobber`): `wikidata-us.jsonl.gz` and `wikidata-us.sha256`. Being a prerelease, `pages.yml` already ignores it, so it never counts among the newest three.
- **Cell attribution:** each Wikidata row gains `cell`, the index of its 2° cell in `cellsFor`'s order (a split cell's rows keep the parent's index), so a re-asked cell replaces exactly its own rows (SB4).

### Scripts (this repo, `scripts/places-archive/`, tested here)

1. **`fetch-wikidata.mjs`** gets two modes, both reading `--kept <file>`:
   - **changes** (the scheduled run, SB3, SB4, SB11): `--since <time>` (the last run's start, from the kept file's header, less a day). One query per pinned class and one for National Historic Landmarks, each filtered by the region's countries (`us`: Q30; Canada later: Q16) and `schema:dateModified > since`; rows in the region's boxes are added or replaced. Then the kept items modified since (`VALUES` batches of 400 ids) that the class queries did not return are dropped, as are kept ids the service no longer knows (merged or deleted). A class in the pinned list but not in the kept file's header is asked once with no date filter.
   - **sweep** (SB12): today's cell-by-cell fetch, for all cells when nothing is kept, or `--box w,s,e,n` for that box's cells; it replaces the kept rows of the cells it asked (each row carries `cell`).
   - The pure parts (`changesQuery`, `mergeChanges(kept, changed, stillThere)`, `cellsToAsk`, `mergeCells`) are exported and tested. The kept file's first line is a header: `{ startedAt, classes }`.
2. **`assemble.mjs` (new, replaces the build step):** reads the kept outputs and `archiveEdits.json`, applies the edits (SB7), writes the archive as `build-places-archive.mjs` does today, and writes `places-sha256` (the hash of the sorted rows, SB5). No network (SB2): the script imports no `fetch`, and a test runs it with the network module stubbed to throw.
3. **`changes.mjs` (new):** given the previous archive's rows and the new ones, the z12 tiles where a place was added, removed or changed (SB6). Writes `changes-<region>-<version>.json` (`{ since, tiles: [[x, y], ...] }`).
4. **`publish.mjs`:** `decide` compares `places_sha256`, not the file's (SB5).
5. **`manifest.mjs` (moved here from the data repo, tested):** each served version carries `places_sha256`, `since` and `changed` from its changes file (SB6). `pages.yml` checks out this repo to run it.

### Workflows (`chronicles-data`, kept thin: they only call the scripts)

- **`fetch-wikidata.yml`** (replaces `weekly-build.yml`): weekly in changes mode; by hand in sweep mode with an optional box; plus, in the same run, a sweep of this week's thirteenth of the cells (the quarterly safety sweep); on success uploads the kept output to `sources` (SB1, SB3, SB12). The first run, with nothing kept, sweeps every cell.
- **`assemble.yml`:** on a completed fetch (`workflow_run`), daily, and by hand (SB8). Downloads `sources` and the newest release's archive; builds; publishes a release with the archive and its changes file only when `places_sha256` differs; starts `pages.yml` (SB5, SB9). The daily run checks the app repo's `main` for a change to `archiveEdits.json` or the class lists by hashing them (open choice 1).
- A failed step stops before any upload or release (SB9).

### The app

1. **`discovery/archiveManifest.ts`:** `ArchiveFile` gains `since` and `changed` (optional; a manifest without them still parses). `changedSince(region, version)`: the union of `changed` along the chain from `version` to `current`, or `'all'` when `version` is not in the chain or a link has no list (SB10).
2. **`explore/explore.ts`:** `archiveStale(area, now, changed)` is true when the version differs and `changed` is `'all'` or holds a z12 tile of the area's 1.5 km read (`archiveTilesFor` over the read's box).
3. **`atlas/atlas.ts`:** the ring read records `profile.archiveTiles` (the z12 tiles it covered); `archiveStaleProfile` uses it as above; a row without it is stale as today. No change to grading, so no `ATLAS_CODE` bump.
4. **`discovery/archive/shell.ts`:** exposes `changedSince(at, version)` from the loaded manifest.

## Data

- No new store, table or migration. `profile.archiveTiles` is a new optional field of a derived row (`atlas_area`); rows from before it rebuild as today.
- The manifest keeps `schema: 1`: the new fields are optional and old clients ignore them.

## Tests (feature `explore`, `src/lib/__tests__/explore/`)

| Criterion | Test | Kind |
|---|---|---|
| SB1 | `placesArchiveStaged.test.ts`: "SB1: a failed fetch leaves the kept output as it was" | build |
| SB2 | `placesArchiveStaged.test.ts`: "SB2: assemble makes no request and writes the same bytes twice" | build |
| SB3 | `placesArchiveStaged.test.ts`: "SB3: changes mode asks one query per class by country since the last run, and no cell" | build (pure, the query log) |
| SB4 | `placesArchiveStaged.test.ts`: "SB4: a kept item modified away, merged or deleted leaves; an unmodified one stays unasked" | build (pure) |
| SB11 | `placesArchiveStaged.test.ts`: "SB11: a newly pinned class is asked once across the region; the others are not" | build (pure) |
| SB12 | `placesArchiveStaged.test.ts`: "SB12: nothing kept sweeps every cell; a box sweeps its cells and replaces only their rows" | build (pure) |
| SB5 | `placesArchiveStaged.test.ts`: "SB5: unchanged places with different bytes publish nothing" | build (pure) |
| SB6 | `placesArchiveStaged.test.ts`: "SB6: an added, a removed and a moved place list their z12 tiles; the manifest carries them" | build |
| SB7 | `placesArchiveStaged.test.ts`: "SB7: an edit alone makes a version listing only its tile" | build |
| SB8 | `placesArchiveStaged.test.ts`: "SB8: inputs whose hashes match publish nothing" | build (pure) |
| SB9 | `placesArchiveStaged.test.ts`: "SB9: a failed assemble writes no release files" | build |
| SB10 | `placesArchiveStaged.test.ts`: "SB10: an area away from the changed tiles is kept; one under them, or of an unserved version, is rebuilt" | core |

The workflows themselves can't run here; they only call the tested scripts, and the first real run is checked by hand (the owner starts it).

No screen changes, so no e2e journey.

## Deferred, and why

- OpenStreetMap and GeoNames fetch jobs: Places out of town adds them onto this structure (OP1).
- Wikidata's recent-changes feed: the query service's own `schema:dateModified` answers the same question per class, measured fast enough, so the feed isn't needed.
- The app's own `applyEdits` stays: it is the only way to remove a place the map tiles carry.

## Native, never run on a device

None new: SB10 is core logic used by the same shells on every platform.

## The owner's choices (Nov 9, decision 0110)

1. The daily assemble checks the app's `main` for changed edits or class lists; no token.
2. Kept outputs live on a `sources` prerelease in `chronicles-data`.
3. Wikidata is asked for changes first (SB3, SB4, SB11); a cell sweep runs only when needed (SB12).
4. The first archive comes from the new pipeline's first run, which sweeps every cell.

5. The safety sweep runs every quarter, spread out: each weekly run also sweeps the cells whose index modulo 13 equals the ISO week modulo 13 (about 50 cells, a few minutes).
