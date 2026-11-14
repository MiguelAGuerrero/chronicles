<!-- Repo first: from the owner's proposal G2 (docs/STATUS.md, "Next evolutions"), answered yes Nov 14 in conversation; decisions 0140, 0178. Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Storefronts: "busy" becomes storefronts, listed nearest first

Nov 14, 2026 · @Miguel Guerrero

## Vision

Idea: "busy" implies traffic, which depends on the time of day, and doesn't necessarily correlate with the presence of storefronts in an area; the concept is the density of non-residential places you can walk into, for a downtown strip and a small corner pocket alike (the owner, T4 reshaped Nov 11; asked again Nov 14).
Verb: earn (Explore before: the word stops promising people what the data cannot see)
Touches: VISION.md Never, "Popularity, trending, foot traffic, other people's activity" (nearest fit "Presence of places from open data": storefronts is what is there, never who is); Never, "rankings of places" (nearest first, never busiest first; nothing counts storefronts); decisions 0034 (information only), 0080 (amended), 0127 (amended), 0109 (the sources stay Overture and OpenStreetMap), 0140 (storefronts is presence's).
Verdict: aligned
Shape: as filed in G2, with the owner's two calls of Nov 14 (decision 0178): storefronts count only places you walk into, and the code says storefronts too.
Criteria: SF1-SF15.
Open: none.

## What it is

The map layer, the area card, What's good here?, the walk's help line and the route leaning called the density of shops, food and services "busy". Busy says traffic; the data says what stands along a street. This slice says storefronts everywhere that concept shows, lists an area's storefronts nearest you first (never busiest first), and makes storefronts presence's own reading: a class is a storefront or it is not, and only storefronts weigh toward the layer. Parks, green, monuments, memorials, public art, viewpoints, curiosities, listed structures and cemeteries are places to find, never storefronts, so they stop lighting the layer. Walkability's "streets far apart and busy" is traffic, and stays.

## Decisions

- **The word is "Storefronts", nearest first, everywhere the concept shows** (the owner, Nov 11, T4 reshaped into G2).
- **Full G2** (the owner, Nov 14).
- **Storefronts count only places you walk into** (the owner, Nov 14, decision 0178): parks and green, monuments and memorials, public art, viewpoints, curiosities, listed structures and cemeteries weigh nothing toward storefronts. Shops, food, drink, venues, museums and theatres, everyday services, health, civic places, lodging, sport, offices and vehicle services weigh as before. A complex's "shopping" word keeps reading the old weight (`densityWeight`), since a mall's art is still its own.
- **The code says storefronts too** (the owner, Nov 14, decision 0178): the layer's id, the leaning's value, hooks, modules, test ids and perf counters. A choice saved under the old word is read as the new one.
- **Go straight through** (the owner, Nov 14): no stop at the plan.
- **"What's good here?" becomes "What's here?"** (the owner, Nov 14, after the steward's S3: "Go with what's here, that's better for me"; SF15).
- Defaults taken in the slice, for the owner to overrule: the card's two sections ("Busy areas", "Busy streets") become one list, "Storefronts", so two sections never share a name and a dense far street never sits above a near one (steward S2); offices stay storefronts, as the owner's list of what stops counting left them; the route leaning's label "Streets with life" becomes "Storefronts"; Walk to still starts at the street with the most storefronts (AT8; only its words change), and a tile still shows that street.

## Acceptance criteria

1. **SF1** The owner's task, "see where the storefronts are": the Layers panel lists a layer named "Storefronts", with the storefront icon, whose legend reads "Storefronts" and whose tip names every kind that counts (shops, food, drink, services and offices you walk into), with no number. Finding: someone told only "show where the shops are" opens Layers (the map's layers button) and finds the word Storefronts there.
2. **SF2** An area's card has one section headed "Storefronts" (never "Busy areas" or "Busy streets"): one list of its storefront streets, a graded town's pockets and the area's other streets alike, each once, each with Walk to where it can be walked to.
3. **SF3** The card's storefronts are listed nearest you first; with no fix, nearest the area's point; ties by name. Never by how many storefronts a street has.
4. **SF4** Walk to's line reads "Starts you on {street}", with no superlative.
5. **SF5** What's good here? says "Where storefronts gather: {street or pocket}. A best guess from the map.", never "Busiest area".
6. **SF6** A pocket of storefronts with no street and no neighborhood near is named "A pocket of storefronts", never "A busy pocket".
7. **SF7** The walk's Explore help line says storefronts ("a chip names the storefront street you’re on", storefronts ui 1); a tile's spoken line says "Storefronts along {street}."; a whole town's marks line says where its storefronts gather is listed apart.
8. **SF8** The route leaning is "Storefronts" ("Along streets of shops and cafés, the high street"), a route leaning on it is titled "Along storefronts", and the streets it names are in the order you pass them, never by how many storefronts they have.
9. **SF9** No line or label of this concept says busy, busiest or most, and none counts storefronts; walkability's "Streets far apart and busy" (traffic) is unchanged.
10. **SF10** Presence says which classes are storefronts; only a storefront weighs toward the layer's density, What's good here?, a town's pockets and the route leaning. Parks, reserves, green amenities, open space, monuments, memorials, public art, viewpoints, curiosities, listed structures and cemeteries weigh nothing; every other class weighs what it did.
11. **SF11** The reclassification re-derives what depends on it: the presence code moves on with nothing carried, so remembered areas and the atlas's rows are read again.
12. **SF12** A choice saved under the old word holds: the layer saved on stays on as Storefronts, the leaning saved off stays off, and a navigation in progress that leaned on busy streets leans on storefronts after a reload.
13. **SF13** The code names the concept storefronts: no module, prop, test id, map layer id or perf counter under `src/` names it busy (other meanings of busy, a button's wait, an overloaded server, a busy recorder, walkability's traffic, are untouched).
14. **SF14** Decisions 0080 and 0127, and the shipped specs that pin the old words, say they were amended by this slice.
15. **SF15** The owner's task, "look at what's here" (the owner, Nov 14, taking the steward's S3): the long press's action on Explore's map is titled "What's here?", never "What's good here?"; it says where there is a lot, never whether it is good. Finding: someone told only "see what's around this spot" presses and holds the map, as the map's own hint says, and finds the words there.

## Record

Built Nov 14, test-first by history (14 of 14, `check:test-first`), on `claude/wonderful-mendel-jfw77q`; not merged or deployed; not audited (decision 0074).

- **Passed:** SF1-SF14 (unit tests in `layers/`, `presence/`, `navigation/`, `explore/`, `landing/`); typecheck, lint, `npm test`, `check:docs`, `check:vision`, `check:records`. E2E: `layers`, `switches`, `dense`, `carousel`, `walk` pass; `atlas` passes but for AT9, a recorded flake on main (`scripts/e2e/flaky.json`, 2 of 3 there); `scenic` passes but for "fix preview-clutter audit 1", which fails 3 of 3 on main (83d509eb, `e2e:baseline`), and stops the journey there on main too, so its later checks (SR1 all off, SR10) did not run. Reached and not run: the 20 other journeys `check:affected` names, which hold no check on the change (`docs/TESTING.md`, "Choosing the journeys").
- **Steward:** S1, S2, S4 accepted into SF8, SF2, SF1; S3 rejected and filed for the owner ("What's here?").
- **Cold find** (decision 0167): the layer found (medium-high), the card's list found late (medium), the walk's Explore line not understood.
- **UI review** (decision 0145): `storefronts ui 1` [high] accepted, the Explore line says what Explore does (a chip names the storefront street you're on); `storefronts ui 2` [medium] accepted, the card says what counts under its heading, the layer tip's own words (`STOREFRONTS_WHAT`); `storefronts ui 3` [medium] deferred, Walk to is the card's existing row pattern (the complexes' too), a card-wide restyle; `storefronts ui 4` [low] rejected, the dash is an empty View a screen reader skips; `storefronts ui 5` [medium] deferred, pictures of a list of several rows and of the leaning's row (nearest first is held by SF3's test; scenic's leaning step waits on main's failing check).
- **Native:** nothing native beyond the renamed map layer ids and props in `WalkMap.native.tsx`, never run on a device (`docs/NATIVE_UNVERIFIED.md`).
