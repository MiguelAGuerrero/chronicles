# 0189. Go here on every Explore tile: a sheet of two choices, Chronicles or the phone's maps app

Date: 2026-11-14 · Status: accepted · Area: explore, navigation · Extends [0058](0058-open-in-maps.md) and [0121](0121-drive-there-walk-back.md)

## Context
The owner, Nov 14: on Explore each card should have a quick "go here", because opening the card to reach Walk to is a step too many when the tile's preview is enough. It should offer Apple Maps or the app's own navigator. The vision gate judged it **aligned** (`specs/explore-go-here/spec.md`, Vision): it serves earn, and the maps choice is what the Shapes table already says ("Open in Maps hands that job to the phone's maps app").

## Decision
The owner's calls, Nov 14:
- **Chronicles means Go here on Navigate**: the destination is saved and Navigate opens ready (0121's "When I get there"); the walk starts on Start, never at once. It works at any distance.
- **Every tile** has the action (a town's neighborhoods, a town's tile and a town's heading card too), except the area you are in and an area with no point. With no fix it is still there.
- **One "Go here" button, then a two-row sheet**: Chronicles first, the phone's maps app second, neither marked better. The maps row names the app that gets the destination before the tap.
- **Defaults taken at the plan, open to overrule:** ink and the smallest type on the tile, no fill or border at rest; a saved destination is said to be replaced, once; a Go here tap is not a visit and feeds nothing.

## Consequences
- The tile is a host of Open in Maps (0058, which deferred the Explore mark card) and of "When I get there" (0121). Only the destination leaves the device, on a tap.
- On the tile, Chronicles never starts a walk by itself, even within 2 km, where the card's Walk to does (0121, DW1). The row's hint says "Opens Navigate, ready", so no walk starting is no surprise. With a walk open it routes that walk, as Walk to does (NV10).
- `atlas/goHere.ts` (core), `components/atlas/GoHereSheet.tsx`, `AtlasTile`'s `onGoHere`, `nav/handoff.ts`'s `mapsName`.
- Not in this slice: complexes' rows, the busy streets, the long press, the mark card, Chronicle's Walk here, HomeSheet's `place-go` (`docs/DEFERRED.md`).
- Native: Apple Maps from the sheet and the sheet itself have never run on a device (`docs/NATIVE_UNVERIFIED.md`).
