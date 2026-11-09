<!-- Repo first: written from the owner's calls in a session (Nov 9), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# A staged places build: small changes stay small

Nov 9, 2026 · @Miguel Guerrero

The places archive (Places worth the stop, decision 0103) is built by one weekly job that asks Wikidata about every cell of the region, keeps nothing between runs, writes the whole file, and publishes when the file's bytes differ. Phones then rebuild every area, because they compare the archive's version only. The owner does not want a long run, and every phone redoing its areas, to add one or two places or one new source. Comparable pipelines keep each source's output, assemble from what is kept, and tell clients what changed (`docs/research/incremental-places-builds.md`). This slice reshapes the build that way, before Places out of town adds its sources.

## Decisions (the owner's calls, Nov 9)

- **A staged build with tile change lists**: each source fetched by its own job and kept; a short assemble step merges what is kept with the owner's edits; phones rebuild only the areas whose tiles changed.
- **Its own slice, before Places out of town**, so the new sources (OpenStreetMap, GeoNames, Canada) arrive as separate staged fetches.
- **Not adopted**: a workflow engine (Dagster), binary diffs of the archive file, Wikidata's dumps (the research's reasons).

## Vision

Idea: Reshape the places archive's build so a new source or a few places don't re-run everything, and phones rebuild only the areas whose places changed (the owner, Nov 9).
Verb: none (engineering: how the archive is built and when phones refresh)
Touches: none. No screen, copy or count changes; places are never ordered, labelled or counted differently; the phone asks no new host (the manifest it already reads carries the change lists).
Verdict: no surface
Shape: as asked
Criteria: none
Open: none

## Criteria

### The build (`scripts/places-archive/`, run by `chronicles-data`)

1. **SB1 One fetch per source, kept.** The Wikidata fetch runs as its own job and keeps its output with its SHA-256 where the next run and the assemble can read it. When a source's fetch fails, its last kept output stays in use.
2. **SB2 Assembling fetches nothing.** The assemble step builds a region's archive from the kept source outputs, the owner's edits and the app's class lists, and makes no request to any source. The same inputs give the same bytes.
3. **SB3 Wikidata a quarter at a time.** A scheduled Wikidata fetch re-asks only this week's quarter of the region's cells (a fixed rule from the cell's index and the week) and keeps every other cell's items from the last output. A run by hand with a box re-asks only that box's cells. With no kept output, every cell is asked once.
4. **SB4 Items leave with their cell.** An item that its re-asked cell no longer returns leaves the output; the items of cells not re-asked stay.
5. **SB5 Published when the places change.** A new archive is published only when the hash of its sorted place rows differs from the current release's, never because of the file's bytes alone.
6. **SB6 Each version lists its changed tiles.** Each published version lists the z12 tiles whose places were added, removed or changed since the version before it, and the manifest carries that list for every version it serves.
7. **SB7 The owner's edits at assemble.** The assemble applies `archiveEdits.json`. A change to that file alone produces a new version with no source fetched, and its list names only the edited places' tiles.
8. **SB8 Assembled when an input changes.** The assemble runs after a fetch keeps a new output, and at least once a day; it publishes nothing when no input changed (each kept output's SHA-256, the edits, the class lists).
9. **SB9 A failure changes nothing.** A failed fetch or assemble publishes nothing and leaves the current archive and every kept output in place.

### Phones

10. **SB10 Only areas that read a changed tile are rebuilt.** A checklist area or an atlas area built with an older archive version is rebuilt only when a z12 tile its read covered is in the change lists between its version and the current one. When its version is not among the versions the manifest serves, or its covered tiles are unknown, it is rebuilt as today.

## Record

Spec and plan written Nov 9; waiting on the owner's review.
