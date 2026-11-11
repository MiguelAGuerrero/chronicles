# 0142. OpenStreetMap locates places too: the archive is the superset of OpenStreetMap's and Wikidata's monuments

Date: 2026-11-11 · Status: accepted · Area: explore, discovery, data

## Context
The owner walked past a significant obelisk in Harrisburg (the Dauphin County veterans memorial) and the app offered
nothing. Wikidata, the archive's only source of places (0103, 0108), holds no obelisk, monument or memorial near the
Capitol area (checked Nov 11: Wikidata and Wikipedia within 2-3 km). The map's tiles carry several monuments nearby
and none by this name. chronicles-data reads OpenStreetMap only as a confirming source: elements carrying a
`wikidata` tag, saying open, closed or gone (RD7-RD10); a place only OpenStreetMap knows can never reach a pack.
0110 chose that ("OpenStreetMap only corroborates", on the worry that such places make a derived ODbL database), and
0115 already named "OpenStreetMap places with a name and a pinned tag that have no Wikidata entry (... memorials)" as a
source for out-of-town places. The vision gate (0094) judged the idea **aligned if reshaped**: it serves Earn and
touches no Never; the reshaping is a bound on scope, because a bare `historic=memorial` is also a plaque, a bench or
a paving stone.

## Decision
The owner's calls, Nov 11:
- **OpenStreetMap locates places, beside Wikidata.** The archive is the union of the two for monuments and memorials
  (the owner: "a superset between the two data sets"). Wikidata has proven incomplete.
- **Corroboration is deferred.** "I would rather those points be there." A place no second source confirms still
  enters. The confirming adapter stays as it is: `access=private|no`, and the `demolished:`/`razed:`/`destroyed:`
  tags, still take a place out (0109, RD9, RD10), and reachability is still said, never filtered (RP20).
- **Scope: named monuments and memorials, by a pinned table.** `historic=monument`, and `historic=memorial` with a
  `memorial=*` or `monument=*` value the table names (obelisk, statue, war memorial, stone, cross and the like).
  Plaques, benches, stolpersteine, ghost bikes and grave markers stay out. An unmapped value is left out, never
  guessed (0109). A test pins the table. A `historic=memorial` with no value enters too, as a memorial.
- **Unnamed places enter, under the same filter.** The obelisk may have no name tag, and the owner wants it there. The
  excluded values, the access and lifecycle tags and the merge rule apply to an unnamed place exactly as to a named
  one. The pack's schema then allows a place with no name for this source, which is a contract change (version 3).
  The app calls it "Monument", because "unnamed" doesn't match standing in front of one, which often has a plaque
  (the owner, Nov 11); never a count.
- **The same place in both sources is one place** (the 50 m rule, 0111); the gate stays blind to sources and counts
  (PP6, PP7). Nothing is ranked by how many sources name a place.
- **Noise is reviewed before publishing** (0109): the build reports what it added, by area and class, and the owner
  strikes types or places with `edits.json`.
- **United States only**, as the build is today; the ODbL pack is already accepted (the Nov 10 call, RD11, PW15).

## Consequences
- Supersedes 0110's line "OpenStreetMap only corroborates" and its license reasoning, which the Nov 10 ODbL call
  already answered. 0108's "a nomination never changes a pack" holds: OpenStreetMap here is a source that locates,
  never a community nomination.
- chronicles-data gets an OpenStreetMap locating adapter (the filter pass reuses `adapters/osm/extract.ts`, so the
  week's extracts are downloaded once) and contract version 3. The app pins the new contract (PP17) and reads an
  unnamed archive place as a mark.
- The tile route is unchanged: a `historic=memorial` from the tiles stays a mark only by a notable name (PR5); the
  archive carries the ones the tiles' rule drops.
- Criteria are `specs/osm-locates/spec.md` (OL1-OL12).
- **Proposed for VISION.md's Precedents table** (the owner makes it): "0142 | OpenStreetMap locates monuments and
  memorials beside Wikidata, by a pinned table; corroboration deferred; the gate stays blind to sources (reshaped at
  the gate, Nov 11)".
