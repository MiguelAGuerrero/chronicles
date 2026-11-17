# 0198. More attractions: museums by type, nature reserves, amusement parks and piers, from Wikidata

Date: 2026-11-17 · Status: accepted · Area: explore, discovery, presence · Amends: PK1/PK19 (a museum enters only by its listing), explore-subtypes audit 12 (the zoos kind's label)

## Context
The owner asked to extend the data set with conventional attractions and highlights. Measured on the Wikidata Query Service
(Nov 17): 5,866 US museums with coordinates, of which the archive held 942 (a museum entered only by a listing); 2,085
gardens of every kind (771 held); 390 nature reserves and 577 National Wildlife Refuges; 366 amusement and 108 water
parks; piers, boardwalks, suspension bridges and national monuments. A research pass on outside sources (federal, state,
city, nonprofit, open place datasets) was under way; their licences were not yet confirmed at their sources.

## Decision
The owner's calls, Nov 17:
- **Wikidata types now**; outside sources wait until each licence is confirmed at its source.
- **All museums by type, Culture only unless listed**: a museum that enters by type lights Culture alone; one that enters
  by its listing still lights History too.
- **Nature reserves and gardens, no parks**: the map's tiles carry parks.
- **Amusement and theme parks with zoos and aquariums**: the kind was to read "Zoos, aquariums and amusement parks"; it
  reads "Zoos and amusement parks", since the longer label wraps at 320 px (XS22, MA9); aquariums stay in the kind.

## Consequences
- chronicles-data contract v6 (its docs/attractions, AT1-AT6): `museum_by_type`, `nature_reserve`, `amusement_park`, `pier`;
  v5 went to the stores pack. The app ships before the data merges (the rule learned on Nov 17).
- `PRESENCE_CODE` p7: every area is derived again.
