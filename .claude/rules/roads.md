---
paths:
  - "src/lib/roads/**"
  - "src/lib/__tests__/roads/**"
  - "scripts/fixture-roads.mjs"
  - "scripts/measure/roads-in-tiles.js"
---
# The road engine

The app's own router for a drive between towns (RE1-RE34, decisions 0203 and 0204; the spec is `specs/road-engine/spec.md`, its plan and the measurement of real tiles `plan.md`). A second `RouteSource`-shaped engine beside the one on foot, which it never touches. Step 1 (the core) is built; the page, guiding and speech are steps 2 to 4.

## What it is

- **Roads come through `RoadSource`** (`types.ts`): the map's tiles are the first source, a road pack the next; `Road` (kind, link, sense, points) is the pack's contract too. No dataset is hard-coded.
- **z12 is the zoom** (`ROAD_RULES.zoom`): below it no road in the tiles says which way it runs (measured, `scripts/measure/roads-in-tiles.js`). Only motorway to tertiary and their links are read; `oneway` is 1, -1 or absent.
- **Each road is cut to its own tile** (`roadsFromTile`), and the graph joins the halves again: a road's end within `joinM` (10 m) of another road's point is that point (`RoadGraph.build`). At 3 m the real tiles fall apart (84% in one part); at 10 m they hold (98%).
- **The graph is flat arrays and directed** (`graph.ts`): every point a node, edges by a road's sense. Built once, never changed; build it from roads in any order and it is the same graph (the roads are sorted first).
- **One way, by a cost per kind of road** (`way.ts`, `ROAD_RULES.cost`): a motorway's metre costs half as much again, so it is taken only when the way without it is more than half as long again. Never a speed, a time or a second way. `findWay` is a generator that yields every `yieldEvery` junctions: whoever drives it gives the screen a turn or stops it.
- **A town with no main road within `snapM` has a null leg**: a straight stretch, and the way is not `whole`. Never invent a road to it.
- **`tilesAlong` returns tiles in no order along the way** (sorted by column and row): the order of requests must not tell the tile host which end is the start (the steward's S6).

## Traps

- The fixture `zurichRoads.json` is nine real z12 tiles (`scripts/fixture-roads.mjs`, from tileserver-gl's `test_data.zip`); hand-made roads never show what a tile edge does. The live host (`tiles.openfreemap.org`) cannot be read from a cloud session: what differs there is unknown.
- Distances in tests are `distanceM`'s, a few metres off round numbers: compare with a tolerance.
- A real route across nine tiles looks at fewer junctions than `yieldEvery`: a test of yielding passes its own rule.
- The tiles hold no turn restrictions, no closures, and names for the larger roads only (the name layer is thin at z12).
- Native: nothing here has run on a device; there is no worker there, so the search must be driven in turns.
