# 0210. A place is visited when the trace came within range of it; the stores pack merges onto the data repo's main

Date: 2026-11-17 · Status: accepted · Area: outing, trace, data · Follows [0209](0209-one-machine-for-every-outing.md), which left "what makes a shop been there" to the owner

## Context
The outing offers places new to you first (0209). An attraction has a found state; a shop has none, because an arrival is never kept
(QC19). Asked what should make a shop "been there", the owner chose inference over a record. They also asked for the data repository
to be added, so the stores pack could be published.

## Decision
The owner, Nov 17: "it could just be a trace inference where if you are within a certain radius of the point, it counts as visited.
In the same way ... to explicitly capture a moment at a specific point of interest, you have to be in a certain range of it."

- **Visited is read from the trace, never stored.** A shop or an attraction that a recorded outing came within range of has been
  visited, and is offered after the ones that have not. The range is Explore's own setting, the one within which a place is found.
- Taken as defaults, the owner's to overrule: only fixes **on foot** count (driving past a shop is not a visit; parking and walking
  up is); the outings read are those that were near the area, the **newest thirty**, so an older visit can be missed; gap fills are
  not read; nothing on the page says a place was visited.
- **The stores pack** (chronicles-data, ST1-ST10) was on a branch cut before that repository's contract v3 and v4. It is merged onto
  its current main on the branch `claude/determined-wright-yg1fq9` there, as contract v5, with its tests green. It is **not** merged
  to that repository's `main` and not published: that push starts the build and the Pages deploy, and is the owner's to give.

## Consequences
- `outing/visited.ts` (core) and `walkedNear` in the outing's service; no new store, no migration.
- A truer reading (every outing, gap fills, a driven stop) needs a kept index of where traces have been: a cache with its own slice.
- The app's pinned copy of the stores contract says v3 and is taken again when the pack is published.
- Native: nothing here has run on a device.
