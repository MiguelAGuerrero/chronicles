# Walkability on the map: which ground is which (investigation, 2026-11-19)

From: the owner's investigation of Nov 19, from a phone screenshot: "notice the indicator that I have, and it's not apparently clear
which way it is". Done by hand before `/investigate` existed and written in its form (decision 0231). Queued as G5. Status: built in walkability-car-ground (decisions 0232, 0271).

## What the owner saw

A navigated walk with the Walkability and Storefronts layers on, the heads-up showing.

| On screen | What it is | Drawn by |
|---|---|---|
| A large grey block, top left | Ground built around cars: slate `#3b4a6b` at 30% | `WALK_STYLE.car`, `src/components/map/types.ts:855-860`; `src/components/map/WalkMap.web.tsx:79-82`, `WalkMap.native.tsx:720-723` |
| Pale blue everywhere else | Ground easy on foot: `#5b9bd5` at 24% | `WALK_STYLE.foot`, same places |
| Magenta band and dashes along a main street | The Storefronts layer (`HOTSPOT`), not walkability | `types.ts:57` |
| The blue line from the walker, northwest into the grey | The navigated route (`COLORS.route`) | `WalkMap.web.tsx` layer `route`; `WalkMap.native.tsx:815-817` |
| "Next: an area built around cars", with an orange icon | The heads-up for a run of car cells of 300 m or more on the route (UF15) | `src/lib/walk/ahead.ts:93`, `:202`; `src/app/walk.tsx:1614-1619`; icon `src/components/WalkBandIcon.tsx:13` |

The line points at the grey ground the route enters, not the blue ground the heading cone faces. Nothing on the screen says so.

## Why it reads wrong (most to least)

1. **Nothing is plain, so neither tint stands out.** Within the 1.5 km read almost every cell is foot or car. Two tints of one blue
   family, told apart by lightness only (the owner's cool pair of Nov 5), leave nothing to compare against.
2. **The car tint lands on grey, which already means something else.** Over Positron's land (about `#f2f3f0`) it blends to about
   `#bbc0c8`, a neutral cool grey: disabled, out of range or not loaded. The app's own veil (`COLORS.veil` `#d7dbe0`, `types.ts:91`)
   uses grey for "outside what matters" on the replay and a day. The foot tint blends to about `#cedeea`, close to the base map itself.
3. **The shape looks like a glitch.** 250 m cells with `fill-antialias: false` (chosen on purpose so cells of one reading show no seam)
   make stair-stepped rectangles, like a block of tiles that failed.
4. **No key next to the map.** The legend is under "On the map" in the walk's settings drawer (ML4, the owner's call of Nov 5).
5. **The heads-up is anchored to nothing.** No direction or distance, and the route looks the same inside car ground.
6. **The icons disagree with the tints.** The pill's car icon is the accent orange `#c2410c` (`theme.accent`), the warm warning the owner
   turned down for the tint; the legend's foot icon is green (`theme.ok`) beside a blue swatch.
7. **First seen on a phone.** specs/walkability-urban-form's record: "The tint's look on a phone is seen only on the web build".

## How adjacent apps do it

Recorded in `docs/research/adjacent-apps.md`, "Mark ground that is hard on foot (Earn)". None of the pages could be fetched from the
cloud session on Nov 19, so every line is **Unverified**; they are leads, and the recommendation rests on them only in part.

- **Google Maps**: a caution in words ("Use caution – walking directions may not always reflect real-world conditions") and nothing on
  the map.
- **Komoot**: route warnings (steps, steep, off-grid) are notes the map does not show; the warning points to the section of the route it
  applies to.
- **AccessMap** (Seattle): marks the exception on the path itself, a dotted red line for an inaccessible footway, with a legend.
- **Aviation charts** (restricted airspace): a hatched band along the inside of the boundary, so the area reads as restricted
  without a filled interior.

## Options

| | Change | Answers | Vision risk |
|---|---|---|---|
| A | Draw only the car ground; foot ground is the plain map | 1, 2 | Reverses "both ends shown" (0096) |
| B | Car ground as a pattern (sparse hatch, `fill-pattern`) with a firm edge | 2, 3; not colour alone (WCAG 1.4.1) | A hatch can read as forbidden: keep it soft |
| C | Join and round the cells into areas (buffer, then unbuffer, in core) | 3 | Low: cells stay the truth, only the drawing changes |
| D | A quiet label inside large car areas | 4 | Low if sparse and never a count |
| E | The route's stretch through car ground marked while navigating | 5 | Must never read as "avoid" or a reroute (WH13) |
| F | One colour for tint, swatch, legend icon and pill icon | 6 | None |

## The owner's calls (Nov 19)

1. What draws: **only the car ground** (A), over "keep both, restyle them". Decision 0232 (amends 0096).
2. How it is marked: **a soft hatch with a smooth edge** (B and C), over an edge band only and a flat smoothed tint.
3. The route: **mark the stretch** (E, with F), over recolouring the pill only and a direction in the pill's words.

D (labels) was not asked; it is left out of the slice and can follow if the hatch alone does not say it.

## The recommendation

A + B + C + E + F, one slice, size **M**. `/vision`: **aligned**. Verb earn (structural guidance about the ground). Touches:
"Guidance is structural ... never whether it is good" (the hatch is soft slate, never red or orange, and the words stay "Built
around cars"); "Restraint in motion, colour and copy" (drawing one reading instead of two is quieter); Never "Nagging: off-route
alarms" (the route's stretch is a change of style, silent, never a reroute, WH8, WH13). The criteria are G5's in `docs/STATUS.md`.

## What the slice will touch

- `src/components/map/types.ts`: `WALK_STYLE` (car only, a pattern and an edge) and `walkabilityGeoJSON` (smoothed polygons; the
  `foot` band leaves the drawing, not the cells).
- A new core module for the smoothing, test-first in `src/lib/__tests__/walkability/` (deterministic, no state; UF1's "the same cell
  reads the same" must hold for the drawn shape too; O(n log n), `EdgeGrid` if it needs an index).
- `WalkMap.web.tsx` and `WalkMap.native.tsx`: the pattern image registered on each (MapLibre's `fill-pattern`; check the installed
  `maplibre-gl` 6.x and `@maplibre/maplibre-react-native` 11.x types first, AGENTS.md), the edge line, and a route casing layer under
  `route` fed from the runs `ahead.ts` already finds.
- `WalkBandIcon.tsx` (the car colour), `src/lib/layers/registry.ts` (one legend row), the legend swatch.
- Specs to amend: specs/walkability-urban-form UF9-UF11, specs/walkability-headsup (the icon), specs/map-layers ML13 if its wording
  names two rows.
- Journeys: `walkability` (car drawn, foot not), `headsup` (the stretch marked), `layers`. Pictures at 390 px for the `ux-reviewer`.

## Done when

On the owner's own scene re-shot (a navigated walk with Walkability and Storefronts on, the route entering car ground, the
heads-up showing, 390 px), a reader who has not seen the legend can say which ground is built around cars and where the line
points. The steward judges it against the owner's words at the slice's review; on a phone, a `[phone]` check.

## Open for the owner

- Hatch density, angle and edge width: candidates side by side on the web build, the owner picking (a look question; G5's `Open:`).

## Engineering unknowns

- Whether a hatch stays legible at zoom 13 or turns to noise; a zoom range for the pattern, a flat tint below it.
- `fill-pattern` on MapLibre React Native: never run on a device (`docs/NATIVE_UNVERIFIED.md` when built).
- Smoothing near the 1.5 km read edge, where cells are left out: the edge must not suggest the ground ends.
