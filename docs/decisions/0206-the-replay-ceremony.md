# 0206. The replay ceremony: a loop outside rendering, shown at a preview address first, the stack grows, the replay draws its pictures

Date: 2026-11-18 · Status: accepted · Area: replay, map, deploy · Amends: RR3 and RR4 (the pull-back and the cut), RR11 and RR19 (the pile; nothing counts), MS17 (a moment's videos), 0203 (its "later slices")

## Context
Replay pace (0203) went live and the owner opened it on an iPhone, in the browser: "The sequence looks nothing like the mock-up we
provided and is really non-performant." Both held. The slice had changed timing only, and the replay's engine was measured the
same day (`docs/research/replay-frame-pipeline.md`): the screen and the map component rendered every tick, the walker and the
line moved by re-sending map data through the map's worker, 15 full updates a second on a processor slowed four times, the
line's end 20 px behind. Two spikes were measured; the spec for the whole of what was left (`specs/replay-ceremony`, RC1-RC48)
went to the steward and then to the owner.

## Decision
The owner's calls, Nov 18:
- **Build it whole on the branch and deploy nothing** until the owner has seen it running and says it matches the mock-up.
- **The replay is driven by a loop outside the screen's rendering**, as the live walk moves its dot: the walker a marker, the
  camera told every frame, the walked line revealed by a paint property, the screen rendered only on a discrete change. One
  number caps the frames a second, to be set on the owner's iPhone.
- **A preview address**: the deploy also publishes the branch named in `.github/preview-branch` under `/chronicles/preview/`. It
  is the same site, so it reads the phone's own walks. The engine is shown there alone before the look is built on it.
- **The stack grows**, one entry for each moment, and "if it exceeds the length of the viewport it just pops it out like a
  first-in, first-out order". Three reviewers and the steward read a growing stack as a count (RR11: "the last three ... and
  no count"; RR19); the owner heard that and chose it. Its height is the one exception to "nothing during the path counts"; it
  never shows a number.
- **The grid is kept**, and a moment's videos play in turn, not muted in its cells: "a slideshow is necessary for things that
  are not pictures".
- **The replay draws the pictures on the map itself.** The map's pins stay as 0154 has them on every screen; in the replay each
  moment's picture stands at its place, the later one over an earlier one it would cover.
- **Captions wait for the first phone build**: they cannot be seen on the web, and they bring calls of their own (putting one
  away, a bystander's speech, another language). 0169 is untouched.
- A break is a pull-back and a slide with no dim; the replay flows in from its first beat and closes on the whole walk, naming
  what was passed.

## Consequences
- `specs/replay-ceremony/spec.md` and its plan; RC38-RC44 are retired from this slice.
- The rhythm ceremony is changed, not kept beside a second one: one engine, one camera, one way across a break (RC48).
- `.github/workflows/pages.yml` builds two exports. A preview that fails never blocks the app's deploy.
- Native takes the same frames through its own code, untried; where its map cannot reveal a line it re-sends it at most ten
  times a second.
- VISION.md is at its size budget, so its Precedents table has no row for this call; the owner may move older history out to add one.
