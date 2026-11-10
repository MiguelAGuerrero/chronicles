# 0118. Places out of town: the plan's choices

Date: 2026-11-09 · Status: accepted · Area: explore, discovery, atlas

## Context
The plan for Places out of town (`specs/places-out-of-town/plan.md`, OP1-OP20) left four choices to the owner: how the app knows a place is out of town, where the build gets OpenStreetMap's places, whether Other places count on the atlas, and whether the owner's add file needs a stated reason (the steward's silent question).

## Decision
The owner's calls, Nov 9:
- **Out of town is a build flag.** The weekly build marks a place within the reach of a city, town or village point, using the app's own reach numbers (`AREA_REACH_M`, imported so there is one copy); the archive's z8 overview holds only unflagged places, so the phone reads at most 4 tiles for 50 km.
- **OpenStreetMap places come from Geofabrik's extracts**, each state and province in turn, filtered with osmium, never a public query service.
- **Other places count on the atlas** like any kind: a presence dot and a kind row, against fixed steps (OP20). This changes grading, so `ATLAS_CODE` is bumped and every area is read again once.
- **The owner's add file needs no stated reason.** The owner's call is enough to add a place (the steward asked whether it should carry a structural reason; the owner said no). The add file stays a file in the repo, edited by the owner only.

## Consequences
- The reach numbers live in the app's module and the build imports them; a change to them changes both the app and the next archive.
- The weekly job downloads every US state and Canadian province extract each week; the disk holds one at a time.
- `MARKS_EXPLAINED` and the card's kind rows gain Other places; AG5's pinned list changes deliberately.
