# 0114. The staged places build is folded into the places pipeline: only Wikidata's changes-first fetch is ported

Date: 2026-11-10 · Status: accepted · Area: explore, discovery, data

## Context
The staged places build (decision 0113, SB1-SB12) was built on this branch while another session built the places
pipeline (decision 0108), merged to main and moved to chronicles-data the same day. The pipeline already does most of
what the staged build did: it keeps each source's answers in a raw store between runs (PP2, PP15), builds from it with
no request (PP2), falls back to a source's last good answers (PP14), applies the owner's edits only at build (PP10),
publishes only when a z8 block's places change (PP11, PP12), and phones rebuild only areas whose block changed (PP13).
Its Wikidata adapter still asks every cell each week.

## Decision
The owner's call, Nov 10: port only what is new.
- **Ported to the pipeline's Wikidata adapter** (chronicles-data, its own criteria): the changes-first weekly fetch
  (each class by country, modified since the last run less a day; kept items modified away, merged or deleted leave;
  a new class asked whole), the safety sweep (one cell in thirteen a week, every cell once a quarter), a sweep by
  hand for a box, and a rebuild from the raw store with no fetch when `edits.json` or the classes change.
- **Not ported, the pipeline's own stands:** the kept-output format, the assemble script, tile change lists and the
  manifest's `since`/`changed` (blocks do this), the places-hash publish (PP12), and the app's change-aware staleness
  (PP13). This branch's copies were reverted.
- **0113's other calls stand where they still apply:** changes first, the daily check of inputs (now a push trigger
  on chronicles-data's `edits.json`, which lives there since 0108), the first archive from the new fetch's full first
  sweep. Its `sources` prerelease is the pipeline's `state-us`.

## Consequences
- `specs/staged-places-build` is removed here; the port's spec and tests live in chronicles-data (`docs/spec.md`).
- Places out of town's archive phase becomes adapters in the pipeline (OpenStreetMap, GeoNames, Canada), each its own
  slice there, as 0108 already says.
- PW16 waits for the pipeline's first published archive.
