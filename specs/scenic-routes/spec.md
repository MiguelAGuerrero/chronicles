<!-- Repo first: written from the owner's request in a session (Nov 4), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Scenic routes: the interesting way to where you're going

Nov 4, 2026 · @Miguel Guerrero

Today every route is the shortest way. The concept's first principle is "the interesting way, not only the fastest" (decision 0020), and suggested routes were put off to their own slice on Nov 1 (decision 0022). This slice adds them. When you pick a destination, the app offers the direct route and up to three scenic ones, each leaning toward one thing: green, sights, or streets with life. You see them side by side, as Apple and Google Maps show alternatives, and tap the one to walk.

## Decisions (the owner's calls, Nov 4)

- **One kind of route:** a scenic route to a destination. A detour via a single named stop, and a loop with no destination, are not in this slice.
- **The leanings are settings:** Green, Sights, Streets with life, each a switch in the walk settings, all on by default. "Streets new to you" is not offered.
- **A preview of each:** Direct, plus one scenic route per leaning switched on, each named by its leaning. Routes that come out nearly the same are merged into one row.
- **Where:** Go here during a walk (the long press, a pin's viewer, a mark, a place) and a destination set before Start. Walk me back stays the shortest way (decision 0029).
- **The detour:** fixed at most 30% longer than the direct route.
- **Off route:** the re-route keeps the same leaning, quietly.

## Criteria

1. **SR1 The leanings are settings.** The walk settings (the ready bar pulled up, and the walk's drawer) show "Scenic routes" with three switches: Green, Sights, Streets with life. All three are on by default, and a change is kept across a reload. With all three off, Go here behaves exactly as before this slice: no preview, the direct route.
2. **SR2 A preview before going.** On Go here, or on Start with a destination set, with at least one leaning on and the destination at most 5 km away in a straight line, the app finds the direct route and one scenic route per leaning switched on. It then shows a preview: every offered route drawn on the map (the highlighted one strong, the rest faint) and a card with one row per route, Direct first.
3. **SR3 Each row in words.** A row names its route ("Direct", "Through green", "Past the sights", "Along busy streets") and gives its time at the walk's pace and its distance. A scenic row says how much longer it takes in words ("4 min longer") and, in one line, what it passes. No score, percentage or rank appears anywhere.
4. **SR4 What a route passes.** The line names parks by name when the map has one ("through Platzspitz"), else "through a park". It names busy streets by name ("along Bahnhofstrasse"), and places already found by name. Places not yet found are never named: they appear as "past places to find", with any count said in words.
5. **SR5 A modest detour.** A scenic route is never more than 30% longer than the direct one.
6. **SR6 A leaning pulls.** Compared with the direct route:
   - the Green route runs a longer stretch inside parks, gardens and woods;
   - the Sights route passes, within 40 m, more of the places worth seeing whose kinds are on in "What I'm into";
   - the Busy route runs a longer stretch of graded busy streets, a stronger grade counting more.
   A scenic route that gains less than 100 m of what it leans on, or one place for Sights, is not offered.
7. **SR7 No near-duplicates.** Two scenic routes sharing 80% or more of their length show as one row naming both leanings ("Through green, past the sights"). A scenic route sharing 90% or more with the direct one is not offered.
8. **SR8 Choosing.** Tapping a row's Go starts navigating that route, with today's blue bar, time left and arrival. Tapping a row or its line on the map highlights it. Cancel, Back or Escape closes the preview and sets no destination. The walk keeps recording while the preview is open.
9. **SR9 Nothing scenic.** If no scenic route is offered (none gains enough, the read fails, or the destination is over 5 km away), navigation starts on the direct route at once with no preview. A notice says why once: "No scenic way nearby" or "Scenic routes reach 5 km".
10. **SR10 Off route, same leaning.** Off a scenic route, the re-route keeps the same leaning, within 30% of the direct way from where you are. When nothing on that leaning is worth it, it takes the direct way. The notice is today's "New route"; nothing nags.
11. **SR11 Reload.** The chosen leaning is kept with the destination. A reload resumes navigating on the same leaning, without showing the preview again.
12. **SR12 Walk me back is unchanged.** Walk me back offers no preview and keeps the shorter of the trace and the streets.
13. **SR13 Local, cancellable.** The read uses the map's tiles and Overture's places for the area between the two ends: the same hosts as today, and nothing else leaves the device. "Finding a route" with Cancel covers the read. Cancel stops it, and no route starts.
14. **SR14 Accessible.** Each row is a button whose label says the whole row. Opening the preview is announced ("3 routes to Your spot").
15. **SR15 Green from the map.** Green areas are read from the map's own vector tiles: OpenMapTiles' `landcover` parks, gardens and woods. This is checked against real OpenMapTiles data.

## Routes and data

- No new truth and no schema change. The leanings are a meta key; the chosen leaning joins the destination in meta `nav`.
- Green areas, places and graded streets for the corridor are read per route and not cached beyond today's caches of streets and places.

## Deferred

- A detour via one named stop; a loop with no destination ("back here in 30 min").
- Explore's Walk here and an area's "Walk to its busiest street" with the preview (the draft "Walk this way").
- Choosing a route on the ready screen before Start (here the preview comes up as the walk starts).
- "Streets new to you" as a leaning; a choice of detour size; water and riversides as green.
- Scenic routes past 5 km.

## Record (Nov 5)

Built SR1-SR15 on the web; native never run on a device (`docs/NATIVE_UNVERIFIED.md`).

- **Unit** (`src/lib/__tests__/navigation/`): `scenic.test.ts` (SR2-SR7, SR10, SR12, with a seeded property check for SR5), `scenicGreen.test.ts` (SR15), `scenicRead.test.ts` (SR6's sights, SR9, SR13), `routeLeanings.test.ts` (SR1), `navStore.test.ts` (SR11).
- **E2E:** `E2E_ONLY=scenic` (SR1-SR4, SR8, SR9, SR11, SR14). SR10, SR12 and SR13's Cancel are unit-tested only. The preview's announcement (SR14) is not checked in the browser.
- **Real data (SR15):** six to fifteen z14 tiles of tileserver-gl's Zurich `test_data.zip` decode about 180-640 green areas, with names from park points (Zeughaushof, Bullingerhof). On Node, all three leanings over a 5.4 km corridor (32,000 street pieces) take about 1.1 s, after joins were indexed (3.8 s before, 13 s with sights snapping every place). Downtown, a Sights row is common and often says only "past places to find".
- **Changed on the way:** the row puts "how much longer" on the line with what it passes; on one line it was cut on a 390 px phone.
- **Deferred:** see the Deferred list above and `docs/DEFERRED.md` (Navigation and routes).
