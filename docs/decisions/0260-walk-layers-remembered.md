# 0260. Layers are one setting everywhere: the walk starts with what the ready map shows, and a switch on it is remembered

Date: 2026-11-22 · Status: accepted · Area: layers, walk · Amends: 0234 (a walk's default view is quiet; the saved setting is per kind of map), specs/modes-to-layers MD3 and MD10, ML7 restored

## Context
Since decision 0234 the live walk kept its own layers, every one off at each walk's start (`walk_layers:<walk>`). The owner,
Nov 22, through `/fix`: "When starting navigation it always resets my preferences … if I toggle on storefront and places
of interest, they will be displayed on the map when I start a walk and then they'll get reset shortly after starting the
walk, my choices should just be remembered." The ready map drew the shared setting until the walk existed, then the walk
screen switched to the walk's own, all off.

Asked how they should be remembered (one setting everywhere; a walk copying the ready map at its start; walks remembering the
last walk), the owner chose **"One setting everywhere (Recommended)"**, with its consequences as asked: Places stays on by
default, so a fresh walk shows "?" marks unless they are switched off; the replay's "passed without stopping" lines count
from the walk's start when Places was already on. Precedent: Google Maps, Apple Maps and AllTrails keep one layer choice
across browsing and navigation.

## Decision
- **One saved setting, `map_layers`, for Explore's map, the ready map and the live walk** (ML7 as first written). The walk starts
  with what the ready map shows; a switch on the walk is the same switch everywhere and is kept for the next walk.
- **What stays the walk's own:** the spans Places was on during it (`places_spans:<walk>`, MD9), opened when the walk opens
  with Places on and kept from every switch while the walk is open, whichever map made it (`layers/walkShell.ts`).
- `walk_layers:<walk>` is no longer written or backed up; the stores still delete an earlier walk's row with the walk.
- Spans and the walk's pass distance (`walk_pass:<walk>`, TC9) are written only while the walk is open (not ended, not
  deleted), whether the switch came from the walk, the ready map or Explore (fix audits 2, 3).
- **Accepted trade-off (fix audit 4, low):** a walk open across the update draws `map_layers` from then on, so a walk that
  had Places on in its own setting while the maps had it off loses its "?" at relaunch, and its span closes there.

## Consequences
- MD3 ("a fresh walk starts with every layer off") and MD10's per-walk setting are amended; 0234's proposed VISION.md line
  ("a walk starts with every layer off") is withdrawn. No mode returns: the walk is quiet when the person switches its layers off.
- The owner's Claude Docs spec, if it carries MD3 and MD10, is the owner's to amend; the repo's mirror notes this decision.
