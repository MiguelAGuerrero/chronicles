# Smooth neighborhood switches (SS1-SS10)

Last exported: not from the concept doc. The owner's report and calls in this session (Nov 13) are the source; it follows Explore in a dense city (decision 0160).

## Vision

Idea: The owner, Nov 13, on an iPhone's web app in a smaller town: "there is still some slowness panning between neighborhoods. It feels like it's reloading each and every time": the Busy lines and names redraw on every switch, a neighborhood just seen included, and the camera's move stutters.
Verb: earn (where there is a lot stays readable while you look between neighborhoods: a map that keeps up instead of redrawing what it already showed)
Touches: Always, "Restraint in motion, colour and copy: the content is the novelty, not the chrome" (served: nothing that didn't change flickers or redraws); decision 0124 / EC7 (the Busy names only near the selected area and from zoom 13: kept, and its lines draw at any zoom); 0034 (busy areas are information only: unchanged); 0160 (the names drawn by the map, the read after the settle: kept).
Verdict: aligned
Shape: as asked. On a town's page the Busy lines drawn are held around the town while its neighborhoods are switched (each neighborhood is still read where it is, so none loses its lines); the names stay only near the selected neighborhood. The old area's names leave as the camera starts moving (as today), the new area's arrive once, when it stops.
Criteria: SS4 (lines held around the town on its page, every selected neighborhood's ring still read, names only near it, EC7 kept), SS5 (names sent once, at the settle, web), SS10 (no other camera move clears a name).
Open: none

## What it is

A follow-up to Explore in a dense city. A fresh agent's adversarial investigation (Nov 13), in a small-town world with the Busy layer on, at 4x CPU, measured a neighborhood switch against the same camera ease with the app idle: about 7 frames per 400 ms ease against 10 to 12, the worst frame interval 117-147 ms against 45-53, long tasks inside the ease 192-260 ms against 10-39. Revisits cost the same as first visits. The causes, most costly first:

1. The selected neighborhood's outline (`hoodGround`) is derived in Explore's render on every switch, 68-159 ms at 4x, a revisit included; it lands mid-ease or at its end, and the line is cleared and sent again (about 40 KB).
2. Explore and the map render about three times a switch, and the web map rebuilds every area marker (`createRoot`), since a marker's key holds whether it is selected.
3. About ten `setData` and 148 KB a switch: the Busy lines and pockets are sent again although unchanged (a new view object when names are dropped), and the names two or three times (first at the ease's start with room worked out at the old camera, again at its end). Each `setData` drops that source's tiles, so a revisit cuts its lines again.
4. The Busy view is centred on each neighborhood, so the areas within 3 km change from one to the next and whole areas' lines swap in and out.
5. Every switch lists every remembered area from storage again.

And a bug: a switch away during a Busy read marks the area tried, so its lines never come until the layer is switched off and on.

## Decisions (the owner's calls, Nov 13)

- **One slice**, spec and tests first, measured before and after in a small-town world turned into a journey.
- **The names arrive once, when the camera stops**: the old area's leave as the move starts, as today; the destination's are sent once at the settle, with room for the destination's view.
- **On a town's page the Busy lines stay centred on the town** while its neighborhoods are switched; the names stay only near the selected neighborhood (EC7). Each neighborhood is still read where it is (steward S3, accepted).
- **SS9 measures against the camera alone** (Nov 13): a switch and the same move with the app idle, side by side in one run. At 4x CPU the camera alone had 0-347 ms of long tasks per round trip from run to run, so a fixed 100 ms could not be met by maplibre itself.
- **The card, ring and name are not held until the settle** (about 0.4 s behind the camera): not now; re-measure after this slice first.

## Criteria

1. **SS1** Going back to a neighborhood already shown in this visit draws its outline without deriving it again.
2. **SS2** A neighborhood's outline is never derived while the camera moves: it waits for the settle.
3. **SS3** A switch whose Busy lines are unchanged sends the map no line or pocket data.
4. **SS4** On a town's page, switching between its neighborhoods never removes an area's Busy lines; lines are added only when a read brings an area not drawn before. Each selected neighborhood's ring is still read where it is (steward S3), and the names stay only near the selected neighborhood and from zoom 13 (EC7).
5. **SS5** On the web, during a switch's camera move no Busy name is drawn; when it settles the destination's names are sent to the map once. On native the names keep today's timing (DEFERRED; steward S2).
6. **SS6** A switch rebuilds only the area markers whose look changed (the one left and the one selected).
7. **SS7** A Busy read cut short by a switch is read again when its area is selected again.
8. **SS8** A switch with no Busy read finished since the last does not list the remembered areas from storage again.
9. **SS9** In the small-town world at 4x CPU, a switch renders Explore at most once during its camera move, and costs what the camera alone does on the same move, give or take that render: over the round trip, the median of a switch's long tasks during its move less the camera alone's is at most 100 ms, and of its worst frame less the camera alone's at most one frame (17 ms). (Amended Nov 13, the owner: the fixed 100 ms could not be met by the camera alone.)
10. **SS10** A drag, a zoom, or the walk screen's and Navigate's follow camera never clears a Busy name that is drawn (steward S1; DC5).

## Steward (Nov 13)

- S1 accepted: only a switch Explore makes clears the names (SS10).
- S2 accepted: SS5 is the web's; native keeps today's timing (DEFERRED).
- S3 accepted: reads stay per neighborhood; only the lines drawn are held around the town (SS4).
- Silent (a large town's first read): moot, reads are not widened.

## Record

Built 2026-11-13, tests first (`2f0793d`), on `claude/trusting-cannon-f5wdhg`.

- **SS1-SS10 pass**: unit tests in `places/groundKept.test.ts` and `layers/switches.test.ts`; the `switches` journey on the harness's `smallWorld`.
- **Before** (the journey at 4x CPU, the code as it was): every switch sent unchanged lines and pockets, names mid-move, rebuilt six area markers; the lines swapped between 14 and 18 strips on the way back; long tasks inside the move 186-419 ms, worst frame 67-167 ms.
- **After**: one Explore render per move (the selection), nothing sent that didn't change, the names once at the settle; two runs paired with the camera alone: median 0 ms of long tasks over it, the worst frame within one frame.
- **Found on the way, fixed at the cause** (outside the plan): the atlas loop set a new `townsKnown` object at every step, rendering Explore mid-move; the complexes hook rendered Explore to set its retry timer, and read mid-move; the row of cards changed height with the selection (only the selected card has a footer), resizing the map mid-move.
- **SS9 amended** on the owner's call (decision 0164): the fixed 100 ms couldn't be met by the camera alone.
- **SS10** guards a regression that did not exist before the slice (nothing cleared the names until SS5's hold). Its first runs read no names at all, the check zooming where no street is named; it now zooms on the town's card.
- **Deferred**: native's names timing; the card, ring and name held until the settle (`docs/DEFERRED.md`).
- **Native** has never run on a device: the lines' memo keys, the outline and complexes waiting on `onRegionDidChange` (`docs/NATIVE_UNVERIFIED.md`).
