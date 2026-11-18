# 0211. The session carries a journey town by town, as a trip planner carries an itinerary, in this app's terms

Date: 2026-11-17 · Status: accepted · Area: outing, navigation, vision · Follows [0209](0209-one-machine-for-every-outing.md); amends QC29 ("the one new meta key") and OJ34

## Context
The audit left three questions with the owner (the silence of new-first, stops that read alike, the order after a first town) and the
largest unbuilt piece: Start began only a journey's first town. The owner, Nov 17: "Proceed with reasonable defaults. Try to have
alignment with traditional trip planners, but just reframe their features to be in accordance with this app's philosophy."

## Decision
What a trip planner does, and how it is said here (each a default, the owner's to overrule):

| A trip planner | Here |
|---|---|
| An itinerary of stops in order | A journey of towns in order, each a walk or one stop; stops said by kind (OJ5, OJ25) |
| A saved trip | The plan rides with the open session only: town names and positions, cleared at Stop; nothing is kept between outings (OJ34) |
| Next stop, with directions | A bar names the next town and how far away; the phone's maps app takes the road; within reach the way is on foot (OJ29, OJ30) |
| Skip a stop | "Pass this town by"; a town driven past is let go without a tap or a word (OJ31) |
| Remove a stop | "Leave this town out" on the page; never the destination's town (OJ26) |
| Progress: 2 of 5, checkmarks | None: nothing is numbered, counted or marked done; what is behind is read from where you have been |
| Minutes and arrival times | Distances, in the units setting |
| An overview map with the route | The page's map draws the towns joined by a faint straight line, and the walk in the town at hand |
| Reorder stops, optimise the route | The order is the lie of the land: along the way, or nearest first |
| Share the trip | Not now; an outing is shared after it happened, as a reel (the vision) |
| "Been here" badges | "New to you." in words on a town you have not been in; a place you have visited is only offered later |

The three questions, by default: a town new to you says "New to you." (the vision's own words; places stay silent); stops of one kind
keep reading alike (kind and distance only, no numbers); the order after a first town is not a done mark, and it stands.

Start begins a recorded session wherever you are, the drive included (0207); "When I get there" stays beside it for a far first town.

## Consequences
- A second meta key, `outing_journey` (the plan of the open session), beside `outing_chains`; cleared when the session stops.
- `outing/journeyPlan.ts` (core): the plan, the chapter ahead, a chapter's destination on foot. The walk screen gains a bar.
- Not here: a road route (0208), a kept or shared journey, a journey resumed in a later session.
- Native: nothing here has run on a device.
