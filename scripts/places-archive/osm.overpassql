// The OpenStreetMap export the places build reads with --osm (PW14, RP2, RP5, RP7; decision 0104). Run by the
// chronicles-data weekly job, one box of a region at a time ({{bbox}}: south,west,north,east), with
// `out tags center;`, converted to GeoJSON points. Only elements carrying a `wikidata` tag are asked for: OSM only
// corroborates Wikidata items, joined by that tag, and never adds a place of its own (the owner, Nov 9).
[out:json][timeout:300];
(
  nwr["wikidata"]["tourism"~"^(museum|attraction|gallery)$"]({{bbox}});
  nwr["wikidata"]["historic"~"^(monument|memorial|castle|ruins|fort|archaeological_site)$"]({{bbox}});
  nwr["wikidata"]["amenity"~"^(place_of_worship|theatre|arts_centre|library|townhall|courthouse)$"]({{bbox}});
  nwr["wikidata"]["access"~"^(private|no)$"]({{bbox}});
  nwr["wikidata"]~"^(demolished|razed|was):"~".";
);
out tags center;
