# 0137. Old walks are placed in the background, from the tiles, with no cover and no count

Date: 2026-11-11 · Status: accepted · Area: home, places · Amends: 0019 ("placed in one pass behind a cover"), v0.5-places criterion 25

## Context
On the owner's iPhone, Chronicle's map opened grey behind "Placing your walks (1 of 1)" and a Skip. The owner read the
count as a count of their walks (it counted only walks with no places yet) and asked for the map and the places of
walks to show at once, with each walk's own work done lazily. The cover existed because the pass placed walks through
the home map itself: each walk's street read jumped the visible camera to it at street zoom, so the map had to be
hidden, for up to 80 s a walk. A map-free reader already did the same work for the replay's gap decisions
(`tileCollector`, same street ids, no camera moves).

## Decision
- **The pass reads tiles in code** (`createBacklog` in `lib/backlog/shell.ts`, on `tileCollector`), never through the
  home map. The map, its stars and the sheet show at once; the pass runs behind them, one walk after another.
- **No cover, no count, no Skip.** Each walk's star comes as it is placed (the screen reads the rows again after each
  walk). The walk at hand says "Placing…" on its row under "Not placed yet", and only that row, its Days timeline row
  and their More wait; every other row opens as usual. The pass's state lives in the shell (`backlogStatus`), so a
  section switch mid-pass keeps it.
- **A walk deleted or waiting on Undo** since the pass began is skipped, so the pass never writes its rows back.
- **A walk placed moves the map only if nothing was framed before**; otherwise its places count as framed and the
  map stays where the owner left it, across a replay too.
- Leaving the screen still stops the pass after the walk at hand; a walk that fails waits for the next launch.

## Consequences
- The vision check's excused tally ("Placing your walks (N of M)", STATUS's open question 5) is gone, with its entry
  in `scripts/vision.allow.json`.
- `backlog` is now a shell a unit test reaches (`fix background-placing 1-4`).
- Deferred: the tile reader reads less ground than the map's views did (audit 3, `docs/DEFERRED.md`).
- Native: the pass now fetches and decodes tiles on the phone as the gap decisions do; never run on a device.
