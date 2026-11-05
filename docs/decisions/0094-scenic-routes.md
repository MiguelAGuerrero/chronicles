# 0094. Scenic routes: the direct way and one per leaning, side by side

Date: 2026-11-04 · Status: accepted · Area: navigation

## Context
Every route was the shortest way, while the concept's first principle is "the interesting way, not only the fastest" (0020). Suggested routes were put off to their own slice on Nov 1 (0022). The owner asked for routes that pass through points of interest and green spaces, chosen by preference, the way Apple Maps offers several routes.

## Decision
The owner's calls, Nov 4:
- **One kind of route:** a scenic route to a destination. A detour via one named stop and a loop with no destination are not in it.
- **Leanings are settings:** Green, Sights and Streets with life, three switches in the walk settings, all on by default. "Streets new to you" is not offered.
- **A preview of each:** Direct, plus one scenic route per leaning switched on, each named by its leaning; routes that come out nearly the same are one row.
- **Where:** Go here during a walk (the long press, a pin's viewer, a mark, a place) and a destination set before Start, whose preview comes up as Start records. Walk me back stays the shortest way (0029).
- **The detour:** at most 30% longer than the direct route, fixed.
- **Off route:** the re-route keeps the same leaning, quietly.
- **Nothing scenic:** the direct route at once, with a notice saying why ("No scenic way nearby", "Scenic routes reach 5 km").

Calls made in the plan the owner approved: scenic routes reach 5 km in a straight line; places not yet found are never named on a route ("past places to find"), so a route doesn't spoil a "?"; green is the tiles' `landcover` parks, gardens and woods.

## Consequences
- The spec is `specs/scenic-routes/spec.md` (SR1-SR15); the plan is `specs/scenic-routes/plan.md`.
- `RouteSource` (0017, 0022) is the seam: `scenicRouteSource` keeps a leaning for re-routes.
- No new truth and no migration: meta `route_leanings`, and the chosen leanings in meta `nav`'s destination.
- Supersedes 0022's deferral of suggested routes; Explore's route preview and "Walk this way" stay deferred.
