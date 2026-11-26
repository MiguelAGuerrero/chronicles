# 0268. Town fixtures fold in Wikidata's libraries now; a station is a fixture unless it is heritage; a tourist office is its tag

Date: 2026-11-26 · Status: accepted · Area: explore, data packs · Amends: [0255](0255-town-fixtures-resume-with-their-data.md) (which sources are folded in now; what "a visitor centre tied to one attraction" means for `information=office`)

## Context
G13's plan review (Nov 26) found the plan had left Wikidata out of the fixtures pack, with Overture, although 0255 said
both are folded in where they are strong. The plan had kept Wikidata out because its only fetch is the places pack's own,
so asking it for libraries would move the places pack the week it lands. Three questions the plan had answered by itself
went to the owner with it: unnamed fixtures, which stations count, and visitor centres tagged as tourist offices.

## Decision
The owner's answers, in person, Nov 26:
- **"Add Wikidata too"** (over the recommendation of OpenStreetMap only): Wikidata's public libraries are folded in now:
  `P31 = Q28564` exactly, no subclass walk, an item dissolved or closed (`P576`, `P3999`) yields nothing. Its read is its
  own, beside the places pack's Wikidata fetch, on the same host and pace, so the places pack does not move.
  OpenStreetMap is preferred at every step of the merge: an element whose `wikidata` tag names the item takes it, else a
  library of the same name (a trailing parenthetical or ", <town>" aside) within 250 m does, and a Wikidata-only library
  is kept only when none matches. Overture waits: it is not a source of chronicles-data's build, and needs a new host and
  a dependency there.
- **"Map only"**: an unnamed square, market or common is kept in the pack and drawn on the map later; a town's card names
  only fixtures that have a name (for the screens' slice; nothing is drawn now).
- **"All but heritage"**: every `railway=station` is a fixture, subway and light rail included (a walk may start there);
  a preserved or scenic railway's station (`railway:preserved=yes`, `usage=tourism`, or the station also tagged a museum,
  an attraction or `historic=railway_station`) is not, and stays a find.
- **"Trust the tag"**: `information=office` is a tourist office wherever it is, a park's or a battlefield's visitor centre
  tagged so included. This narrows 0255's "a visitor centre tied to one attraction stays with its attraction" to the
  other tag: `information=visitor_centre` stays out.

## Consequences
- chronicles-data's fixtures pack (its `docs/fixtures/spec.md`, FX1-FX14) holds both sources; the pack is built only from
  a run whose OpenStreetMap answers hold the fixtures, so no Wikidata-only pack is ever published.
- The places and stores packs are not republished by this work.
- Overture's fold is in `docs/DEFERRED.md`, the owner's call.
