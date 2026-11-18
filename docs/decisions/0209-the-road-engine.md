# 0209. The road engine: the app routes a drive itself, with directions, from the map's own tiles first

Date: 2026-11-18 · Status: accepted · Area: navigation, outing, platform, vision · Follows [0204](0204-outing-journey-the-owners-answers.md); amends [0195](0195-open-in-maps-beside-walk.md) and 0058 for a journey's drive, and VISION's shape "Several routes to one point, Apple Maps style: out"

## Context
Decision 0204 called for a driving engine of the app's own as its own slice ("eventually this has to run on native and background
access will be expected"). Until it lands a journey's towns are joined by a straight line, their distance is said "away", and the
phone's maps app takes the road, asked today for walking directions. Starting the slice, the owner was asked three things.

## Decision
The owner's calls, Nov 18:
- **Full driving directions**, over a road line and distance alone and over leaving turns for later: the app guides the drive itself.
  The question named the cost (driving safety, and the vision's "never nag"), and the owner chose it.
- **The map's own tiles first, a road pack later**: main roads read from the tiles at low zoom when a journey is planned, behind an
  adapter a pack from chronicles-data can replace.
- **Roads through the towns**: one way that favours the ordinary roads running through a journey's towns, a motorway only where
  nothing comparable exists.

The gate's reshaping, taken with it (`specs/road-engine/spec.md`, Vision): **one** way, never several and never compared; no minutes,
no arrival time and nothing called fastest; leaving the way is never flagged, and the way is found again quietly; guidance says a
turn and a distance and nothing else; Open in Maps stays beside it, asked for driving.

## Consequences
- A second router beside the one on foot, behind the same `RouteSource` seam (0017): a directed road graph, a cost by kind of road,
  manoeuvres read from the geometry. The foot router is not changed.
- The map's tiles hold no turn restrictions and thin the roads at low zoom: what the engine cannot know is said once, and the plan
  begins by measuring real tiles before any of it is built.
- 0020's "offline maps and routing: out of scope" stands for this slice (the tiles need a connection); the pack that would change it
  is a later decision.
- OJ9, OJ29 and D1 of the outing journey change when the engine lands: a road distance, a road line, and guidance in the session.
- Native: a drive guided with the screen locked needs background work no part of the app does today; nothing has run on a device.
