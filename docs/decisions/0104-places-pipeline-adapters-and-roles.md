# 0104. The places archive becomes a pipeline of adapters; community sources may only nominate, for the owner's review

Date: 2026-11-09 · Status: accepted · Area: explore, discovery, data

## Context
The owner asked for a data pipeline that can take any source, including unconventional ones (Reddit, YouTube, forums),
through crafted adapters into one known shape, and ship packs phones download from a CDN at whatever granularity, so no
phone runs into a source's rate limits or terms. The research ("Places data pipeline: research",
https://claude.ai/artifact/R1GLx9Q5gurtYdJrLsRi4s) found the shape the large open projects share (Overture,
OpenAddresses, Who's On First): an adapter per source, a raw store, one versioned schema, opaque stable IDs, conflation,
dated static releases. The vision gate judged slice 1 aligned. The steward found that a nomination which could admit a
place would make membership depend on what people talk about.

## Decision
The owner's calls, Nov 9:
- **The pipeline:** fetch, raw store, adapt, conflate, gate, package, publish, in the chronicles-data weekly job. An
  adapter is a declaration (license, attribution, pace, allowed uses, role, terms checked) plus `fetch` and `adapt`.
  Slice 1 moves Wikidata behind it (`specs/places-pipeline/`, PP1-PP16).
- **Node and TypeScript only.** Python tools (Splink, dlt) wait until rule-based matching falls short.
- **Zod 4** (a dev dependency, build scripts only) is the canonical schema, exported as JSON Schema.
- **Our own opaque place IDs** from slice 1, with a crosswalk from source IDs.
- **Packs are tile lists inside one region file**, never a file per town; slice 1's unit of change is a z8 block.
- **Roles:** locates (may put a place on the map), confirms or denies, nominates. **A nomination never changes a pack,
  even when a locating source confirms it.** Nominations reach only a review list in the run's report; the owner adds a
  place through `archiveEdits.json` if they want it. Each nominating adapter needs its own decision record.

## Consequences
- 0103's "significance is a gate, never a measure" now holds for every source: the gate reads no source name, no number
  of sources and no count (PP5, PP6, PP7).
- A pack's feature keeps exactly name, class, src and id; the sources list lives only in the build's registry (PP9).
- The weekly job keeps a state asset (raw store, registry) in chronicles-data's releases; a source that may not be
  redistributed is left out of it (PP1).
- The research doc's version, where a confirmed nomination enters, is superseded by this record.
- VISION.md needs no edit to its rules; its Precedents table gains this row.
</content>

## Later the same day: the pipeline lives in chronicles-data

The owner, Nov 9, after slice 1 was built here: the data repo houses the frame, the schemas and the plans, as the
interface the app consumes.
- **chronicles-data owns the contract**: the schemas, the class names and the manifest's shape, generated from its code,
  checked by its CI and served beside the archives (`contract/`). The app pins a copy and a test (PP17) fails until it
  takes a new one.
- **The owner's edits apply only when packs are built** (`edits.json` there). The app no longer applies them, so they
  can no longer hide a place that comes from the map's own tiles.
- **The pipeline's spec and plan live there** (`docs/spec.md`, `docs/plan.md`); this repo's `specs/places-pipeline`
  keeps the app's side (PP13, PP16, PP17), and this record keeps the product rules both repos follow.
