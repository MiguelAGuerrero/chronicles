<!-- Repo first: from the owner's request of Nov 17 (extend the data set; decision 0198). The data side is chronicles-data's docs/attractions/spec.md (AT1-AT6, contract v6). -->

# More attractions: museums by type, nature reserves, amusement parks and piers

Nov 17, 2026 · @Miguel Guerrero

## Vision

Idea: extend the data set for a richer experience with conventional attractions and highlights, beyond memorials and plaques (the owner, Nov 17).
Verb: earn ("what makes a place itself": a town's small museum, a wildlife refuge, a pier, an old amusement park)
Touches: VISION.md Never, "Popularity, trending, foot traffic" and "Ratings, reviews" (a type is the gate, never a measure: no source's popularity, rating or visitor count is read); Always, "Guidance is structural"; decisions 0103 (type decides), 0109 (remarkable and public), 0117 (nothing fetched only to sort), 0191 (an inclusive bar), PK1/PK19 (a museum lights History by its listing: amended here, a museum by type lights Culture alone).
Verdict: aligned
Shape: as asked: Wikidata types only, the same source and licence; every museum by type, Culture only unless listed; reserves and gardens but no parks (the map carries parks); amusement parks with zoos and aquariums.
Criteria: MA1-MA9.
Open: none; outside sources (Smithsonian sculptures, state markers, city public art) wait until each licence is confirmed at its source (the owner, Nov 17).

## How adjacent apps do it

- **Pikmin Bloom**: its places come from a structured database (Wayspots, seeded from historical markers) plus OpenStreetMap and Foursquare types; type and nomination, never ratings. Source: docs/research/small-places-wayspots.md (verified, Nov 14).
- **Google Maps**: "Things to do" lists attractions by category, ordered by star ratings and review counts; the counter-example: we take the categories, never the order. Source: from memory, unverified.
- **Atlas Obscura**: a curated, editorial list of nearby oddities; the counter-example for editorial guidance, and its data is not ours to reuse. Source: from memory, unverified.

## Decisions

- **Wikidata types this round** (the owner, Nov 17, "Wikidata types now").
- **All museums by type, Culture only unless listed** (the owner, Nov 17): a listed museum still lights History too (PK1).
- **Reserves and gardens only, no parks** (the owner, Nov 17).
- **Amusement and theme parks with zoos and aquariums** (the owner, Nov 17): the kind was to read "Zoos, aquariums and
  amusement parks"; it reads "Zoos and amusement parks", since the longer label wraps at 320 px (MA9); aquariums stay in
  it (amends `explore-subtypes audit 12`'s "Zoos and aquariums"). Superseded on Nov 18, below.
- **Amusement parks, their own row, on** (the owner, Nov 18, "Own row, on"): the kind reads "Zoos and aquariums" again, and
  every amusement, theme or water park, from the archive or the map, is its subtype "Amusement and theme parks", on by
  default (more-attractions audit 1; the map's theme parks leave Viewpoints, amending `explore-subtypes audit 12`).
- **A museum by type, Culture only** (the owner, Nov 18): never History, whatever its name (audit 2).
- **A pier or a suspension bridge, "Only when listed"** (the owner, Nov 18): an unlisted pier keeps its row and adds nothing
  to History (audit 3). The app cannot tell a listed `bridge` from a typed one (the feature carries no listing), so bridges
  stay as they were until a contract change.
- **Natural national monuments, "Own subtype under Nature"** (the owner, Nov 18): "Natural monuments" under Nature, on,
  never History (audit 18; contract v7's `natural_monument`).

## Criteria

- **MA1** (the task): an exploring walk past an archive museum that no listing names (a town's aviation museum) shows it as a
  "?", named within 60 m, and a capture beside it finds it.
- **MA2** a museum by type (`museum_by_type`) is a museum of Culture, under Museums and galleries, and lights Culture alone; a
  listed museum (`museum`) still lights Culture and History.
- **MA3** a nature reserve is under Parks and gardens, in its own subtype "Nature reserves", on by default.
- **MA4** an amusement, theme or water park, from the archive or the map, is under "Amusement and theme parks", a row of
  its own under "Zoos and aquariums", on by default; a reader with zoos or Viewpoints off before keeps it off (amended by
  more-attractions audit 1, the owner, Nov 18).
- **MA5** a pier or boardwalk is under Buildings and structures, in "Piers and boardwalks", on by default.
- **MA6** a suspension bridge is a Bridge; a national monument is under Monuments and memorials, but a natural one (Devils
  Tower) is under Natural monuments in Nature (audit 18); every new garden type is a Garden.
- **MA7** the app pins chronicles-data's contract v6; its class names are exactly the archive table.
- **MA8** none of the new classes is named or labelled for significance, and none carries a number (XS19, XS25 hold).
- **MA9** every new label fits one line at 320 px (XS22 holds), Amusement and theme parks and Natural monuments among them.

## Record (Nov 17)

- **Built:** MA1-MA9, tested first by history (9 of 9): eight unit tests (`src/lib/__tests__/explore/moreAttractions.test.ts`),
  MA9 in the `subtypes` journey. `npm test` (2956), typecheck, lint, docs and vision checks pass; on the `/chronicles`
  build the journeys `subtypes`, `small-places`, `curiosities`, `marks`, `nudge`, `outing` and `replay` pass.
- **Data:** chronicles-data's contract v6 (AT1-AT6) on `claude/more-attractions`, merged after this deploys.
- **Not run:** the steward on this spec (an account usage limit stopped the session's helpers that evening); not audited.
- **Native:** nothing native changed; never run on a device.

## Audit (Nov 18, the owner's /audit)

The auditor, the steward (S1-S6) and the UX reviewer's cold find; triaged in one numbering:

1. The theme-park split (the map's theme parks under Viewpoints, the archive's under the zoos kind): accept, the owner's
   "Own row, on": Amusement and theme parks under Zoos and aquariums, every source; `more-attractions audit 1`.
2. A museum by type lights History by its name ("Historical Museum", "Old Jail Museum"): accept, the owner's Culture only;
   presence's `by_type`; `more-attractions audit 2`.
3. An unlisted pier or suspension bridge lights History: accept for piers (`bar: 0`), the owner's "Only when listed";
   bridges cannot be told apart without a contract change, left as they were; `more-attractions audit 3`.
4. Nature reserves sits before Community gardens: accept; `more-attractions audit 4`.
5. Nature reserves wears a bug: accept, `binoculars-outline`; `more-attractions audit 5`.
6. Docs drift (the subtypes rules, 0198's p7, the contract README, presence's comments, PRODUCT.md's "them"): accept,
   fixed in the docs; no test (`npm run check:docs`).
7. MA1, MA4 and MA6 could not fail; no test of an unnamed new class: accept, each made able to fail;
   `more-attractions audit 7`.
8. The cold find's pictures skipped Culture and the amusement row: accept, two `shot()` steps and checks in the
   `subtypes` journey; `more-attractions audit 8` (e2e).
9. Places you can't walk to (a refuge, an amusement park, a national monument as one point deep inside it; a Wikidata-only
   reserve never checked for `access=no`): defer, the owner's to deliberate (Nov 18); DEFERRED and "Needs the owner".
10. No noise review of the v6 additions (decision 0109, steward S5): defer, the owner's.
11. The "Viewpoints and attractions" label (steward S6): defer, renaming is the owner's.
12. The Walk-me-back button over the drawer at 320 px: defer, predates the slice ([loop]).
13. Amusement parks in only by a listing or off (steward S1): reject, the owner chose its own row, on (Nov 18).
14. The cold find's "no museums row": reject, "Museums and galleries" is under Culture; audit 8 adds the picture.
15. A listed church or theatre also typed museum, or a listed amusement park, loses its listed class: accept, fixed in
    chronicles-data (branch claude/more-attractions-audit-data).
16. A statue that is also a national monument moves from Statues to Monuments: accept, fixed in chronicles-data (branch
    claude/more-attractions-audit-data).
17. A National Register listing did not win over every v6 type (national monument, suspension bridge, the new gardens):
    accept, fixed in chronicles-data (branch claude/more-attractions-audit-data).
18. Natural national monuments land under Monuments in History: accept, the owner's "Own subtype under Nature": Natural
    monuments under Nature, contract v7's `natural_monument`; `more-attractions audit 18`.

18 findings, 9 fixed in the app plus 3 on the data side, 4 deferred, 2 rejected (2026-11-18). Tests: `more-attractions
audit 1`, `2`, `3`, `4`, `5`, `7`, `18` (`src/lib/__tests__/explore/moreAttractionsAudit.test.ts`, with MA1, MA4 and MA6
in `moreAttractions.test.ts`), `more-attractions audit 8` in the `subtypes` journey; audit 6 in the docs. `PRESENCE_CODE`
p9, `ATLAS_CODE` a14.p9, nothing carried; the readers' golden re-captured (theme_park, water_park, the five new classes;
Central Point's theme park now Amusement and theme parks).
