<!-- Places pipeline. Written in the repo first (2026-11-09) from the owner's ask in session: "design an overall data
     pipeline that can ingest from a variety of sources through explicit crafted adapters that can bridge these data sets
     to a known shape ... produce an artifact that can be downloaded through a CDN ... region packs or town packs or city
     packs ... so users don't fall into rate limits or any other rules and regulations against external services", and the
     research doc "Places data pipeline: research" (https://claude.ai/artifact/R1GLx9Q5gurtYdJrLsRi4s). Grows decision
     0103's places archive; it does not replace it. -->

# Places pipeline: the app's side of the interface (PP)

Nov 9, 2026 · @Miguel Guerrero

The places pipeline, its schemas, its class names and its docs live in **chronicles-data**
(https://github.com/MiguelAGuerrero/chronicles-data: `docs/spec.md`, `docs/plan.md`, `contract/`). That repo is the
interface the app consumes: it builds the packs, publishes them with a manifest, and publishes its contract beside them.
This spec holds only what the app does with them. PP1-PP12, PP14 and PP15 were built here first and moved there with the
code (the owner, Nov 9); their ids are retired here.

## Vision

```
Idea: grow the places archive build into a pipeline that takes any source through its own adapter into one known shape,
  cut into packs phones download from our CDN; slice 1 is the frame with Wikidata moved behind it
Verb: earn (more open sources raise what a walker notices, under the same "worth the stop" gate; the rest of slice 1 is
  in the build job)
Touches: Never "Popularity, trending, foot traffic, other people's activity" (Worth the stop, not the most popular), the
  rule the adapters' roles guard; Never "Ratings, reviews, stars, 'best of', rankings of places", nearest fit
  "open-data signals such as a heritage listing"; Never "Data leaving the device without a tap", not touched (phones
  only download from our host, as in 0103); decisions 0016 (no dataset hard-coded) and 0103 (PW7: "significance is a
  gate, never a measure"; "never a count: no sitelinks, page views or rank")
Verdict: aligned
Shape: as asked; a nominating source can only propose a place a locating, open source confirms, and the nomination
  never reaches a pack
Criteria: PP5 (closed schema, no number but a position); PP7 (a place needs a locating source; nominations never change
  a pack); PP9 (one src, sources only in the registry, one license family per pack); PP1 (declaration required and
  enforced; a nominating adapter needs its own decision); PP6 (a gate blind to sources); PP12 (no change publishes
  nothing); PP16 (phones never call a source)
Open: none (the owner's calls below)
```

## Decisions (the owner's calls, Nov 9; decision 0107)

- **chronicles-data owns the pipeline and the contract**: the code, the schemas, the class names, the owner's edits and
  the pipeline's spec and plan. The app keeps a pinned copy of the contract and tests itself against it.
- **The owner's edits apply only when packs are built**, in chronicles-data (`edits.json`); the app no longer applies
  them, so they can no longer hide a place from the map's own tiles.
- The rest, as built: Node and TypeScript only, Zod in the data repo, opaque place IDs, packs as tile lists in a region
  file, nominations only on the owner's review list.

## Moved to chronicles-data

- **PP1 No adapter runs without its declaration, and the declaration is enforced.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP2 Only fetch touches the network.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP3 Each source at its own pace.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP4 Candidates are checked.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP5 Nothing in the shape is a score.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP6 The same places, through a gate blind to sources.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP7 A place needs a locating source; nominations never change a pack.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP8 Places keep their IDs.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP9 Every place says where it came from, once.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP10 The owner's edits still apply (in the build only).** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP11 Blocks carry their own hash.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP12 No change publishes nothing.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP14 A failing source doesn't sink the run.** Moved to chronicles-data (`docs/spec.md` there), retired here.
- **PP15 Runs weekly in chronicles-data.** Moved to chronicles-data (`docs/spec.md` there), retired here.

## Criteria (the app's side)

13. **PP13 Only changed areas are rebuilt.** The app rebuilds a checklist area or re-reads an atlas ring only when its
    block's hash changes, not on every new file version, and judges each area at its own point. Areas built before
    blocks existed are rebuilt once.
16. **PP16 Phones still never call a source.** No host in the contract's `sources.json` is in `ALLOWED_HOSTS` or
    `lib/net`'s host table, and no file under `src/` names one.
17. **PP17 The app keeps to the contract it pins.** The app holds a copy of chronicles-data's `contract/` (its
    `contractVersion` named in the test). Its class table has exactly the contract's class names; its reader reads the
    contract's example pack and manifest (blocks included) and keeps every place, with the four fields the feature
    schema allows. A new contract fails this test until the app takes it.

## Record (Nov 9)

- **Built here, then moved:** the pipeline and its tests (PP1-PP12, PP14, PP15) and the build-side Places worth the
  stop criteria (PW6, PW7, PW13, PW14, PW15, PW19) now live in chronicles-data, branch `claude/places-pipeline-contract`.
  The test-first history of PP1-PP16 is on this repo's `claude/places-pipeline-frame`.
- **Found while building:** Explore compared an area's archive tag with the tag at the walker's fix, so with blocks an
  area by a block's edge would have been read on every fix; each area is now tagged and judged at its own point.
