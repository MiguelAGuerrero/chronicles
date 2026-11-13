# 0165. Smooth neighborhood switches: names once at the settle, lines held on a town's page, measured against the camera

Date: 2026-11-13 · Status: accepted · Area: explore, map, layers

## Context
After Explore in a dense city (0160) the owner tried a smaller town on an iPhone (Nov 13): "there is still some slowness
panning between neighborhoods. It feels like it's reloading each and every time." The Busy lines and names redrew on
every switch, a neighborhood just seen included, and the camera's move stuttered. A fresh agent's adversarial
investigation measured it in a small-town world at 4x CPU: about 7 frames per 400 ms move against 10 to 12 for the
camera alone, 192-260 ms of long tasks inside the move against 10-39 ms. The causes: the selected neighborhood's
outline derived in render every switch; unchanged Busy lines and pockets sent to the map again (each send drops the
source's tiles, so a revisit cut them again); the names sent two or three times a switch; every area marker rebuilt; the
Busy view centred on each neighborhood, so whole areas' lines swapped; every remembered area listed again; and a read a
switch cut short never retried.

## Decision
The owner's calls, Nov 13:
- **One slice**, spec and tests first, measured before and after in a small-town world made a journey (`switches`).
- **The busy names arrive once, when the camera stops**: the old area's leave as a switch's move starts, as before; the
  destination's are sent once at its settle (web; native keeps today's timing, deferred). No other move clears them.
- **On a town's page the Busy lines stay drawn around the town** while its neighborhoods are switched; each
  neighborhood is still read where it is, and the names stay only near the selected one (EC7).
- **The card, ring and name are not held until the settle** (about 0.4 s behind the camera): not now; re-measured
  after the slice first.
- **SS9 is measured against the camera alone**: a switch and the same move with the app idle, side by side in one run.
  A fixed 100 ms of long tasks could not be met by maplibre moving the camera alone (0-347 ms per round trip from run to
  run at 4x CPU).

## Consequences
- After: a switch renders Explore once during its move (the selection), sends the map only what changed, and costs
  what the camera alone does give or take that render. The journey also found three causes outside the plan, each
  fixed at its cause: the atlas loop rendered Explore at every step, the complexes hook rendered it to set a retry
  timer and read mid-move, and the row of cards changed height with the selection, resizing the map mid-move.
- Specs: `specs/smooth-switches/spec.md` (SS1-SS10).
