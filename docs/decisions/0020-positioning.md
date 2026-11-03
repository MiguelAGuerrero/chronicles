# 0020. Positioning: a companion for wandering towns and cities, in three tabs

Date: 2026-11-01 · Status: accepted · Area: product

## Context
The owner's call, Nov 1; the concept doc's "Positioning" section, after AllTrails.

## Decision
A companion for wandering towns and cities: it suggests where to drift, finds the way, keeps what you notice where you noticed it, and gives the outing back. It replaces juggling AllTrails (the way), a camera and notes (the moments) and Relive (the replay). Navigation is for exploring, and exploring is for making memories.

Three tabs are the loop: Explore before, Navigate during, Chronicle after. Principles: the interesting way, not only the fastest; follow the wind (a route is a suggestion; drifting isn't nagged); nothing is a score (no completion, streaks or coverage metrics; unwalked streets and fog stay faint; a find is a memory, never a count); capture is the hinge between the tabs. No counts on the Explore tab (NV14).

Out of scope: trails and nature navigation, offline maps and routing, automatic 3D or video replays, completion and leaderboards, fitness tracking. Open data (OpenStreetMap via OpenFreeMap) with signal assumed.

## Consequences
- The `(tabs)/` routes; Start on Navigate (0021); counts are words everywhere (0052).
- Open in the doc: two things are named Explore; whether the replay keeps its "Passed …" low; what the Explore tab lists in a city where AllTrails lists trails (`docs/DEFERRED.md`).
