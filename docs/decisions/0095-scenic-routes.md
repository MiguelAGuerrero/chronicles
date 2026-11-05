# 0095. Scenic routes: the direct way and one per leaning, side by side

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

**At the vision gate (the owner, Nov 5).** `docs/VISION.md` arrived on main after the build and rules out
"several ways ranked by minutes" (Never) and "several routes to one point, Apple Maps style" (Shapes: out;
suggested routes: "no minutes compared"). The owner chose to reshape: rows show no time and compare no
minutes; Direct says how far, a scenic row its detour in words ("a short detour", "a longer detour") and
what it passes. The owner kept a row per leaning over the page's "one suggested way".

**Distance over minutes (the owner, Nov 5, after).** Every row gives its route's whole distance in the
units setting, km or miles, so the walker still knows how long it is; the detour words went. No time, no
difference ("longer", "more") and no minutes on any row. The same holds for any suggested route that
walks a town's features.

**Proposed VISION.md edit** (the owner's to make): the Shapes row "Suggested routes" becomes "Direct and
one way per leaning switched on, each named by what it leans toward, each with its own distance in km or miles; no 'fastest' and
no minutes compared"; the row "Several routes to one point, Apple Maps style: out" adds "(routes ranked by
time; a choice by leaning is suggested routes, 0095)".

Calls made in the plan the owner approved: scenic routes reach 5 km in a straight line; places not yet found are never named on a route ("past places to find"), so a route doesn't spoil a "?"; green is the tiles' `landcover` parks, gardens and woods.

## Consequences
- The spec is `specs/scenic-routes/spec.md` (SR1-SR15); the plan is `specs/scenic-routes/plan.md`.
- `RouteSource` (0017, 0022) is the seam: `scenicRouteSource` keeps a leaning for re-routes.
- No new truth and no migration: meta `route_leanings`, and the chosen leanings in meta `nav`'s destination.
- Supersedes 0022's deferral of suggested routes; Explore's route preview and "Walk this way" stay deferred.
