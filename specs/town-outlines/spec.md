<!-- Repo first: written from the owner's report in a session (Nov 4), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Town outlines: the town you are in is the one whose border you are inside

Nov 4, 2026 · @Miguel Guerrero

At Planet Fitness, 2677 MacArthur Rd, Whitehall PA, the Explore tab said Catasauqua. The app judged towns by label points: the nearest town point within 3 km, the closer for its size. Whitehall is a township with no town label point in the map tiles, so Catasauqua's point, 1.8 km away, won. Overture Maps' divisions (release 2026-10-21.0) have a locality outline named Whitehall that the gym is inside.

This slice makes a town's outline decide, wherever one is known, on the Explore tab, in Explore's checklists and in where walks are placed (the home's stars and walk titles). Label points stay as the fallback.

## Decisions (the owner's calls, Nov 4)

- **Source:** Overture Maps divisions (`divisions.pmtiles`, `division_area` with subtype `locality`), read by tile from the Overture bucket the app already reads places from (decision 0080). No account, no key. Census TIGER and Who's On First were considered: TIGER is US-only and its host is unreachable from cloud sessions; Who's On First is large and also unreachable.
- **No outline:** where no outline that was read covers the point (no data, offline, unincorporated land), the nearest-point rule stands as today.
- **Nesting:** the municipality is the town. In Overture's US data, Census-designated places and hamlets (Fullerton, Egypt) have no outline, so the smallest locality outline that contains the point is the municipality. Where two outlines nest (Manhattan inside New York), the smaller one is the town, as the tiles' boroughs are today.
- **Neighborhoods:** a neighborhood point counts only when it lies inside the same town outline as you. Overture's neighborhood outlines are not used yet (see the plan: they are administrative districts such as "Manhattan Community Board 5").

## Criteria

1. **TO1** A point inside a town's outline is in that town, even when another town's label point is nearer. The Whitehall case, as a unit test against Overture's real outline at 2677 MacArthur Rd: Whitehall, not Catasauqua.
2. **TO2** Where outlines nest, the smallest one that contains the point is the town: Midtown is in Manhattan, not New York.
3. **TO3** Where no outline that was read contains the point, the town is chosen by points, as today. A town whose outline was read and does not contain the point is never chosen by its point.
4. **TO4** A town known only by its outline (no label point in the map tiles) is still a place: it gets Overture's own point for it, else its outline's centre, and it shows wherever towns show (the Explore tab's tiles and title, the home's stars, a walk's title).
5. **TO5** A town seen both as a label point and as an outline is one place, at the label point it had before, so its stars, its checklist and its Explore tile stay where they were.
6. **TO6** A neighborhood point counts for a place only when it is inside the same town outline as the place. A neighborhood point across a town's border is not that place's neighborhood.
7. **TO7** A walk's places follow the outlines. Each 50 m piece of the walk is in the town whose outline contains it, so a walk that crosses a border counts in both towns, by the metres walked in each, and is titled by where most of it was.
8. **TO8** A walk placed while the outlines could not be read (offline, a timeout, a failed tile) is placed by points, and is placed again from the outlines the next time it is snapped and they can be read.
9. **TO9** Switching to outlines places every walk again, once. A new Overture release alone does not.
10. **TO10** The Explore tab's town is the one whose outline you are in: at the gym, the title and the "You're here" tile say Whitehall. Walking 50 m across a border changes it without moving 1 km.
11. **TO11** An Explore checklist place belongs to the town whose outline contains it, and to none across the border.
12. **TO12** Outlines read once are kept on the phone and answer later, offline too. They are a cache, cleared with the other derived stores. A read fetches only the zoom-12 tiles under the points it needs, at most twelve per walk.

## Routes and data

- No new routes or dependencies (`pmtiles`, `@mapbox/vector-tile` and `pbf` are already in the app).
- New cache: town outlines (derived), SQLite migration 16 and IndexedDB v14.
- Network: Overture's public bucket, already a host (decision 0080).

## Record (Nov 4)

Built on branch `claude/town-outlines`. The owner took the plan's defaults ("proceed with reasonable defaults"): neighborhood outlines deferred, outlines kept on the phone, the plan as written.

| Id | Passed by |
|---|---|
| TO1 | `townOutlines.test.ts` "TO1: the gym at 2677 MacArthur Rd is in Whitehall, not Catasauqua" (Overture's real outlines) |
| TO2 | `townOutlines.test.ts` "TO2: Midtown is in Manhattan, the smaller of two nested outlines" |
| TO3 | `townOutlines.test.ts` "TO3: ..."; e2e `outlines` "TO3: with no outline holding you, the town is the nearest point's" |
| TO4 | `townOutlines.test.ts` "TO4: an outline-only town is a place, at Overture's point, else the middle of what was read"; e2e `outlines` "TO10: ... a town known only by its outline (TO4)" |
| TO5 | `townOutlines.test.ts` "TO5: a label point inside its own outline is one candidate, at the label point" |
| TO6 | `townOutlines.test.ts` "TO6: a neighborhood point across the town's border does not count" |
| TO7 | `townOutlines.test.ts` "TO7: a walk across the Whitehall-Catasauqua border counts metres in both, titled by the larger" |
| TO8 | `townOutlines.test.ts` "TO8: places are read only when the outlines were too"; `townOutlinesShell.test.ts` "TO8: a failed or unreachable read is not complete, keeps nothing, and the next read tries again" |
| TO9 | `townOutlines.test.ts` "TO9: the rules tag changes with AREA_RULES, not with the Overture release" |
| TO10 | `townOutlines.test.ts` "TO10: here is the town whose outline you are in, at once across a border"; e2e `outlines` "TO10: inside Pawtucket's outline the Explore tab names it" |
| TO11 | `townOutlines.test.ts` "TO11: a checklist place belongs to the town whose outline holds it, and to none across the border" |
| TO12 | `townOutlinesShell.test.ts` (three TO12 cases); `dbContract.ts` "FC7 putOutlineTiles, getOutlineTiles" and the `purgeDerived` case; `townOutlines.test.ts` "TO12: a read asks for the tiles under its points, at most twelve"; e2e `outlines` "TO12: outlines are read from Overture's divisions by byte range" |

- **Test-first, honestly:** the pure outline module (`areas/outlines.ts`, `divisionTiles.ts`) was written just before its tests (TO1-TO5 passed on their first run); TO6-TO12's tests were written and seen failing before their code.
- **Changed from the plan:** the criteria's tests sit in `townOutlines.test.ts` and `townOutlinesShell.test.ts` rather than spread over `areas`, `explore` and `atlas` tests; TO8's decision is the pure `placesRead()`, since `snapWalk` is an older shell on the `db` singleton with no ports to fake. A walk too wide to read (more than 12 tiles) is placed by points for good (`tooMany`), so it isn't retried on every launch. The e2e's other journeys get a divisions archive with no towns in it, since a 404 counts as a console error.
- **Deferred:** `docs/DEFERRED.md` "Town outlines". **Native, never run on a device:** `docs/NATIVE_UNVERIFIED.md` "Town outlines".
- **Not audited** (decision 0074: only when the owner asks).
