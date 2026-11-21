# 0255. Town fixtures resume with their data: an OpenStreetMap-first pack, and a visitor centre is the town's tourist office

Date: 2026-11-21 · Status: accepted, waits on G13's build · Area: explore, data packs · Amends: [0225](0225-a-towns-fixtures-are-a-layer.md) (what "a visitor centre" is; the order of the work)

## Context
The owner, Nov 21, by `/investigate`: "How could we build a data set for which every town, major town, city is given its
municipal fixtures, such as visitor centers, etc., that could be overlaid on the map that aren't necessarily sights to see ...
if you always want to stop by the visitor center to see what's around, it's easy to see where that is and be known ahead of
time that a particular area has it, whether that be through its Explorer card or just seeing it on the map." That is decision
0225's town fixtures, specced as TF1-TF24 and deferred on Nov 18; its data set was never worked out.

Measured the same day (`docs/research/municipal-fixtures.md`): Overture, which the app already reads, gets town halls and
libraries mostly right in six towns but misses or misfiles visitor centres and mixes parcel points into post offices; Wikidata
holds 14,594 US public libraries with coordinates but 281 visitor centres; OpenStreetMap tags a town's tourist office apart from
an attraction's visitor centre, and can be counted only inside chronicles-data's build.

## Decision
The owner's answers, Nov 21, each the recommended option:
- **Source: an OpenStreetMap-first pack, the others folded in.** A third pack built in chronicles-data beside places and
  stores: OpenStreetMap for every kind; Overture and Wikidata (or the public-library survey) folded in where they are strong;
  de-duplicated when the pack is built, not in the app.
- **A visitor centre is the town's tourist office only** (`information=office`): the place to stop and see what is around. A
  visitor centre tied to one attraction (`information=visitor_centre`: a park's, a battlefield's) stays with its attraction, a
  place to discover. This narrows 0225's "a visitor centre".
- **The data set first, the screens after.** The pack and the app's adapter are queued now; the card's line and the map's layer
  (TF6-TF13) follow as their own step, drawn as a mock-up for the owner's approval before any code (0252).
- **The list waits for Monday's count.** The kinds are drawn from chronicles-data's OpenStreetMap kind counts (its scheduled
  build of Nov 23) and brought to the owner before the pack's contract is fixed (TF1).

## Consequences
- The pack is built in chronicles-data by a session there; this repo's part is the pinned contract, the adapter and its
  in-memory source (TF4, TF5, TF14, TF21).
- Everything else in 0225 stands: words only, never counted, never a find.
