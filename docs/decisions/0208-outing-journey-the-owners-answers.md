# 0208. The outing journey: no cap on towns, variety chooses them; the app gets a road engine of its own, as its own slice

Date: 2026-11-17 · Status: accepted · Area: explore, outing, navigation, platform · Follows [0207](0207-the-session-is-an-outing.md); amends [0194](0194-shops-are-presence-the-outing-and-its-stores-pack.md) for the outing page

## Context
The plan for the destination-first outing (`specs/outing-journey/plan.md`, OJ1-OJ40) put eight questions to the owner, with a draft of the
screens. The draft capped a journey at three towns between here and the destination, and left the road to the phone's maps app because
the app routes on foot only.

## Decision
The owner's calls, Nov 17:
- **No cap on the towns of a journey.** "Whichever selection of towns produces the greatest variety of points of interest. Though that
  could be a setting." The towns are chosen for the variety of kinds they add, not counted to a limit; how many is a setting, not a rule.
  Variety is of kinds (what a place is), so it stays structural: never popularity, a rating or how many a town holds.
- **A driving engine of the app's own, as its own slice**: "eventually this has to run on native and background access will be expected."
  The app is to route a drive itself rather than only hand it to the maps app. It is a new routing engine over roads and comes after the
  page; until it lands, distances between towns are straight lines said as "away" and Open in Maps carries the road (OJ9, OJ29).
- **"For the rest, proceed with reasonable defaults."** Taken as: a town may be one stop by the road (D2), and Open in Maps then hands
  that stop's position; distance in words and no time (D3); the distance on foot stays on each card, as the owner asked for the
  commitment on the preview (the steward's S7 not taken); shops and attractions merge inside the outing only (D4); picked chips widen
  (D5); the capture stack is unchanged at driving speed (D6); the search may set this page's destination (GZ16 amended for it); and the
  page is built first (step 1), for the owner to look at before the towns between and the session's bar.

## Consequences
- OJ20 and OJ37 change: no fixed number of towns; a journey takes the towns that add a kind it does not yet hold, and reading stays
  bounded per town and cancellable, not by a count of towns. The setting is part of step 2.
- A slice "the road engine" is owed: its gate, spec and plan before any code (a road graph from the map's tiles, a route and a road
  distance, on the device). It changes D1, OJ9 and OJ29 when it lands.
- Each default is the owner's to overrule; none is a rule of the vision.
- Native: nothing here has run on a device.
