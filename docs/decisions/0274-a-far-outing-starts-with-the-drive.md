# 0274. A far outing starts with the drive: Plan an outing offers Start alone, and the way waits for your tap on arrival

Date: 2026-11-27 · Status: accepted, waits on G18's build · Area: the outing, rides, the replay · Amends: [0121](0121-drive-there-walk-back.md) (its far ask, as mirrored on Plan an outing by OJ28 and `outing/choice.ts`) and [0218](0218-the-drive-in-the-outing.md) (DO6, on Plan an outing only) · Keeps: 0121's "the walk starts on your tap, never on arrival", DW3 and DO6 on Explore's area card, tiles and pressed spot · From: the owner's /investigate, in person, Nov 27 (`docs/research/outing-arrival-start.md`)

## Context
The owner, Nov 27: "When planning an outing and I select start when I get there, the outing is lost it assumes that nothing
happened. I at least expected [a map] of all the stops on the way and the walk or the session starts when I get to my
destination." On Plan an outing, a journey whose first town is past 2 km offers "Start" beside "When I get there" (`startChoice`,
`src/lib/outing/choice.ts:11`), and with no position "When I get there" alone. "When I get there" records nothing, keeps only the
first town's stops as Navigate's destination and drops the plan (`useJourney.ts:349`, `useStartWalk.ts:74`, DW3). The page's
Start already did what the owner expected: it records from where you are, the drive as a ride inside the outing, every town carried
by the session's bar, and on arrival "<Town> is here." with "Show the way", nothing routed until the tap (OJ28, OJ48, DO7, the
outing's second audit). Asked what they missed, the owner said "Nothing of the drive kept"; what they meant by the stops on the way,
"A map of the drive's stops".

## Decision
The owner's answers, in person, Nov 27:
- **"Record from the start, my tap (Recommended)".** One session records from the moment you leave, the drive and then the walk;
  on arrival the bar offers the way and it begins on your tap. 0121's "never on arrival" is kept: nothing starts, asks or
  notifies on arrival. Not a start by itself on arrival, and not a notification asking on arrival.
- **"Start alone, outing page (Recommended)".** On Plan an outing, a far journey's footer offers Start alone; "When I get there"
  and its line ("keeps <Town> only") leave that page. Explore's area card, tiles and pressed spot keep their ask (DW3, DO6). Not
  "everywhere", and not both buttons reworded.
- **"Start, waits for a fix (Recommended)".** With no position yet, Start begins the outing anyway and the session records from
  its first fix, the plan carried (the option offered named "Waiting for your position", which today is said only for a
  destination; the session's words before a first fix are the builder's to check). Not a disabled Start.
- **"As today, then DO18-DO23 (Recommended)".** A stop on the way stays the walker standing on the dashed ride in the replay,
  with no mark of its own; drive-in-the-outing part 2 (DO18-DO23: the ride's share by its length, drawn along the road, its
  distance in words) is queued next as its own entry. Not a mark at each stop (0121: no pins that are not moments).

## Consequences
- G18 in `docs/STATUS.md`, "Next evolutions", built by `/slice --from=G18`; G19 for drive-in-the-outing part 2.
- `specs/outing-journey/spec.md` OJ28's far ask and `specs/drive-in-the-outing/spec.md` DO6 say the old for the outing page;
  the slice rewords them in the owner's doc and re-exports (the specs mirror it).
- `.claude/rules/outing.md`'s "Far places: `startChoice` mirrors `walkToChoice`" and "\"When I get there\" keeps only the first
  chapter" lines change with the build.
- Nothing leaves the device (0005); nothing tracks before the tap (0036).
- Native, never run on a phone: a session begun in the car with the screen locked, its ride kept, and the bar's "<Town> is here."
  on arrival.
