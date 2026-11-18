# 0198. More attractions: museums by type, nature reserves, amusement parks and piers, from Wikidata

Date: 2026-11-17 · Status: accepted · Area: explore, discovery, presence · Amends: PK1/PK19 (a museum enters only by its listing), explore-subtypes audit 12 (the zoos kind's label; the map's theme parks)

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
  Superseded on Nov 18 by the audit's call below: the parks are a row of their own under "Zoos and aquariums".

The owner's calls on the audit, Nov 18:
- **Amusement parks, "Own row, on"**: the kind reads "Zoos and aquariums" again; amusement, theme and water parks are its
  subtype "Amusement parks" (asked as "Amusement and theme parks", which wraps at 320 px under its indent, XS22),
  on by default and not small, whichever source holds them (the archive's
  `amusement_park`, the map's `theme_park`, until then under Viewpoints, and a water park). One switch hides every such park,
  and a park both sources hold is one place of one kind (more-attractions audit 1). A reader who had Viewpoints or the zoos
  kind off keeps the new row off: each held some of these parks before.
- **A museum by type, Culture only**: it never lights History, whatever its name ("Historical Museum", "Old Jail Museum");
  a map museum keeps PK2's name rule (audit 2).
- **A pier or a suspension bridge, "Only when listed"**: a pier the archive holds by its type keeps its row, Piers and
  boardwalks, and adds nothing to the History bar (audit 3); a listed one keeps its listing's class on the data side. The
  archive's `bridge` mixes listed covered bridges with typed suspension bridges and its feature carries no listing, so
  bridges stay as they were until a contract change lets the app tell them apart.
- **Natural national monuments, "Own subtype under Nature"**: Devils Tower, Muir Woods, Jewel Cave and the like are
  "Natural monuments" under Nature, on, never History (audit 18; contract v7's `natural_monument`).
- **Places you can't walk to** (a refuge, an amusement park, a national monument as one point deep inside it): "Large open
  spaces might have to be treated differently because right now we have attractions always supposed to represent
  attractions when you're driving somewhere that's off the beaten path that requires a little bit of a detour and you won't
  be able to discover that in a session so we have to deliberate on how to reconcile those sorts of points of interest
  that you can't easily be in walking distance of." Deferred for the owner (audit 9).

## Consequences
- chronicles-data contract v6 (its docs/attractions, AT1-AT6): `museum_by_type`, `nature_reserve`, `amusement_park`, `pier`;
  v5 went to the stores pack; v7 (the audit) adds `natural_monument`. The app ships before the data merges (the rule
  learned on Nov 17).
- `PRESENCE_CODE` p8: every area is derived again; p9 for the audit's calls (theme parks, a museum by type's History, a
  pier's bar, natural monuments), nothing carried.
