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
buttons; the wider renaming of "walk" in the app's words (0206's own slice). DO9 (the title) and DO10 are held by rides R8 and by
construction; no new test.

Against precedent: Apple Maps asks nothing before Go; here the question stays because "Start now" begins a recording.

## Part 2, the drive in the replay (DO18-DO23): next

To be planned with the replay's rules open (`.claude/rules/` for the replay, rides R10, 0085), and reviewed by the steward and the
ux-reviewer: it changes the make-or-break screen.

## Part 3, places from the road (DO11-DO17, DO12a): after a measurement

Step 0 is a measurement, as the road engine's was: for one region's large places, how many have a shape in the map's own tiles, in
Overture and in the pack's sources, and how many shapes can be matched to the place. The owner then picks the source.

### Step 0, the measurement: done for one city (Nov 18)

`scripts/measure/perimeters.mjs`, over central Zurich (tileserver-gl's test tiles at z14, and Overture's base theme, release
2026-10-21.0, read from its public bucket at z13, its highest zoom). The places are the 611 named points of large kinds in the map's
own tiles (pitches, parks, attractions, hospitals, colleges, gardens, cemeteries, universities, zoos, stadiums, golf courses).

| | The map's own tiles | Overture's base theme |
|---|---|---|
| Shapes in the box | 9,093 (grass, pitches, playgrounds, woods, schools, cemeteries ...) | 9,981 |
| Shapes with a name | 7 | 1,647 |
| Shapes with an id | none | all |
| Places inside some shape | 606 of 611 | 611 of 611 |
| Places inside a shape whose name matches theirs | cannot be told (no names) | 334 of 611 (55%) |

By kind, inside an Overture shape of the same name: cemeteries 37 of 37, parks 91 of 99, pitches 139 of 166, gardens 29 of 41,
zoos 3 of 6, stadiums 3 of 5; and few for what is a building or a campus more than a ground: hospitals 17 of 74, universities 5
of 17, colleges 4 of 58, attractions 3 of 99.

What it says:
- **"Inside some shape" means nothing by itself**: grass, residential land and suburbs cover nearly every point. A place's own
  perimeter has to be told from the shapes around it, which needs a name or an id on the shape.
- **The map's own tiles cannot do that**: their shapes carry no names. They could draw green ground, not say whose it is.
- **Overture can, for open grounds**: parks, cemeteries, gardens, pitches. It is the host town borders already come from.
- **Campuses and complexes are not grounds in either**: a hospital or a college is a point inside unnamed land. Their perimeters
  would have to come from Overture's buildings (as the complexes of CX16 already do) or from the pack.

Not measured: the pack's own large kinds (nature reserves, natural monuments, amusement parks: the live pack was not read here);
any place outside one European city; refuges and parks many kilometres across, which z13 tiles cut into many pieces; entrances,
which neither source was asked for.

## Part 4, hands-free capture on iOS (DO24-DO30)

Native, an architecture call (App Intents through a config plugin), and not finishable without a phone.
