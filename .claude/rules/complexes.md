---
paths:
  - "src/lib/complexes/**"
  - "src/lib/__tests__/complexes/**"
  - "src/components/ComplexLabel.tsx"
  - "scripts/fixture-complexes.mjs"
---
# Complexes (CX1-CX16, decision 0146)

A named place made of other places, on the area card and map and in a moment's arrival line. Information only. `lib/complexes/` (`rule.ts` core; `shell.ts`, `overtureReader.ts`, `index.ts` shells; `overtureSource.ts` the adapter that alone knows Overture's `buildings` and `places` tiles); the spec is `specs/complexes/spec.md`.

- **Judged on real data.** `scripts/fixture-complexes.mjs` saves the named buildings and the places inside them from Overture tiles (Harrisburg, Whitehall); `rule.test.ts` runs the rule on them. Tune `MIN_GO`, `MIN_MARKET`, `MIN_CAMPUS`, `MIN_CIVIC` there and bump `COMPLEX_CODE`. In dense downtowns many named buildings hold places (a bank building held 24, mostly offices): Shopping counts only places to go (presence weight 1), never offices or services.
- **Tiles carry a buffer, so a building is in more than one.** Strawberry Square lies whole in one z14 tile with a 3-point fragment in the next; the Lehigh Valley Mall is cut across two. Pieces are joined by the building's Overture id, and a building is judged only when every tile that holds a vertex of any of its pieces is read (`neededTiles`); one not fully read is missing, never a partial outline. The shell keeps pieces and places by tile for the session (`tiles`), so a repeat asks for nothing.
- **Kinds come from the building's type and what it holds** (the owner's call, 0146): markets by two market-category places; stations by `transportation` subtype and a class that is not parking; campuses by `medical` or `education`; civic by `civic`; shopping by contents. First match wins. A courthouse that holds eight places is Civic.
- **Viewing a moment never fetches** (CX12): the resurface and gallery shells ask `db.complexesNear` and `complexAt`; only `useComplexes` (the selected area on Explore) reads tiles, silently, and a failure is asked again after 90 s.
- **Never counted, ranked or marked.** The card's rows are name, kind word and Walk to; nearest first, then name, then id; "See more" has no number; the map layer's labels are name and kind word only. `notMark`, `notVisited` and `surfaces` tests hold the invariants.
- **The e2e world:** `complexWorld.serve` (harness) serves Wickenden Arcade (a building and nine restaurants near Fox Point) only while the `complexes` journey runs; every other journey gets an empty `buildings.pmtiles`.
- **Native** (unverified): the outline source and the Markers, migration 23. See `docs/NATIVE_UNVERIFIED.md`.
