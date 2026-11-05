# 0095. Walkability by urban form, shown as tinted areas

Date: 2026-11-05 · Status: accepted (the build waits on the owner's review of the plan) · Area: streets, explore, navigation

## Context
The owner tried the shipped walkability layer (0093). Its legend showed symbols that appeared nowhere on the map, and every area read "mostly mixed", Allentown's walkable core included. Overture's real tiles showed why: Allentown maps hundreds of sidewalk segments yet reads no car-oriented road at all, and its residential grid, with almost no sidewalk mapped, reads like a suburb. Sidewalk tags measure how well a place is mapped, not how walkable it is.

## Decision
- Judge areas by urban form: junction density, arterial share, crosswalks and sidewalks where mapped (evidence raises, absence never lowers), and places along the streets. Service ways are not streets.
- Show it as soft tinted areas, green where easy on foot and warm where built around cars, nothing between. The legend's swatches match what is drawn.
- The area card says it in words from its cells. The heads-up keeps its fast-road line and adds one for entering car-oriented ground.
- Still words, no number (0093).

## Consequences
- Supersedes the street-band basis of 0093 for the map and the card; the street band stays for fast roads and the tooltips.
- `walk_tile` gains junction points (SQLite migration 20, `WALK_CODE` w2); cells are derived on read.
- The thresholds are starting values, pinned by five real fixtures and tuned with them.

## Later call (2026-11-05)
- The tint is one layer among several (specs/map-layers, decision 0096): a Layers button replaces the walkability button, off by default.
- On the UI audit (2026-11-05): the tint is a cool pair (light blue and slate), not green and orange; the card says what the ground is, never "mostly"; the heads-up speaks only while the layer is on.
