<!-- Repo first: from the owner's request of Nov 17 (extend the data set; decision 0197). The data side is chronicles-data's docs/attractions/spec.md (AT1-AT6, contract v6). -->

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
  it (amends `explore-subtypes audit 12`'s "Zoos and aquariums").

## Criteria

- **MA1** (the task): an exploring walk past an archive museum that no listing names (a town's aviation museum) shows it as a
  "?", named within 60 m, and a capture beside it finds it.
- **MA2** a museum by type (`museum_by_type`) is a museum of Culture, under Museums and galleries, and lights Culture alone; a
  listed museum (`museum`) still lights Culture and History.
- **MA3** a nature reserve is under Parks and gardens, in its own subtype "Nature reserves", on by default.
- **MA4** an amusement or water park is under "Zoos and amusement parks", which a reader with zoos off before keeps
  off.
- **MA5** a pier or boardwalk is under Buildings and structures, in "Piers and boardwalks", on by default.
- **MA6** a suspension bridge is a Bridge; a national monument is under Monuments and memorials; every new garden type is a
  Garden.
- **MA7** the app pins chronicles-data's contract v6; its class names are exactly the archive table.
- **MA8** none of the new classes is named or labelled for significance, and none carries a number (XS19, XS25 hold).
- **MA9** every new label fits one line at 320 px (XS22 holds).

## Record (Nov 17)

- **Built:** MA1-MA9, tested first by history (9 of 9): eight unit tests (`src/lib/__tests__/explore/moreAttractions.test.ts`),
  MA9 in the `subtypes` journey. `npm test` (2956), typecheck, lint, docs and vision checks pass; on the `/chronicles`
  build the journeys `subtypes`, `small-places`, `curiosities`, `marks`, `nudge`, `outing` and `replay` pass.
- **Data:** chronicles-data's contract v6 (AT1-AT6) on `claude/more-attractions`, merged after this deploys.
- **Not run:** the steward on this spec (an account usage limit stopped the session's helpers that evening); not audited.
- **Native:** nothing native changed; never run on a device.

