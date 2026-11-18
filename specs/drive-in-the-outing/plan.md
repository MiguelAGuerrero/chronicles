# The drive in the outing: plan

Four parts under one spec, built in the order the spec suggests. Each ends shippable.

## Part 1, start in the car (DO6-DO10): built first

**The idea.** Today a place past 10 km offers "When I get there" alone, and between 2 and 10 km the question says "Walk now". After
this part the question at every distance past 2 km is "Start now" or "When I get there". Past what can be walked, "Start now" begins
the outing where you are with the place carried as a one-town journey, so the session's bar says "Toward <place>" with Open in Maps,
Drive there and Pass by, exactly as a planned journey does. Nothing new is stored: it is the plan a journey already carries.

| Touched | Change | Criteria |
|---|---|---|
| `lib/startPlan.ts` `walkToChoice` | past what can be walked it answers `far`, not `later` | DO6 |
| `outing/journeyPlan.ts` `placePlan` | one place as a one-town plan (its point alone) | DO7 |
| `components/atlas/AtlasCard.tsx` | the far footer: "Start now" beside "When I get there"; "Walk now" reads "Start now" | DO5, DO6 |
| `src/app/(tabs)/explore.tsx` | Start now for a far place: the plan offered, the session started with no way on foot | DO7, DO8 |
| `atlas/mapsButton.ts` `tileWalk` | a tile for a far place is unchanged ("Set as destination") | none |

Tests: `navigation/wayBack.test.ts` (the choice at every distance), `outing/journeyPlan.test.ts` (the one-town plan is a plan, and
holds a point and a name alone), a new journey `startfar` (the card past 10 km, Start now, the bar, nothing on foot routed).

Not in this part: a pressed spot past 10 km still offers "When I get there" alone (it has no name to head toward); the tiles' own
buttons; the wider renaming of "walk" in the app's words (0203's own slice). DO9 (the title) and DO10 are held by rides R8 and by
construction; no new test.

Against precedent: Apple Maps asks nothing before Go; here the question stays because "Start now" begins a recording.

## Part 2, the drive in the replay (DO18-DO23): next

To be planned with the replay's rules open (`.claude/rules/` for the replay, rides R10, 0085), and reviewed by the steward and the
ux-reviewer: it changes the make-or-break screen.

## Part 3, places from the road (DO11-DO17, DO12a): after a measurement

Step 0 is a measurement, as the road engine's was: for one region's large places, how many have a shape in the map's own tiles, in
Overture and in the pack's sources, and how many shapes can be matched to the place. The owner then picks the source.

## Part 4, hands-free capture on iOS (DO24-DO30)

Native, an architecture call (App Intents through a config plugin), and not finishable without a phone.
