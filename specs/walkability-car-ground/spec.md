<!-- Repo first: from the owner's proposal G5 (docs/STATUS.md, "Next evolutions"; filed 2026-11-19 from the owner's
     /investigate), answered yes in person 2026-11-22 ("Yes, queue it (Recommended)"), built under `/tend inbox G5 yes`
     (decision 0232; its look, decision 0271). Not a tab of the concept doc. -->

# Walkability: only the car ground, hatched, and its stretch on the route (CG)

Nov 27, 2026 · the owner

The owner's words (/investigate, Nov 19, from a phone screenshot): "notice the indicator that I have, and it's not
apparently clear which way it is".

The brief is `docs/research/walkability-car-ground.md` (what the owner saw, the causes ranked, `file:line` references and
the owner's calls); this slice builds G5's ten criteria and no more.

## Vision

```
Idea: Draw only the ground built around cars, as a soft slate hatch with a firm, rounded edge, and mark the route's stretch through it while navigating, so the heads-up has something on the map to point at.
Verb: earn (structural guidance about the ground: where the streets are built for cars, said by the map itself)
Touches: Always, "Guidance is structural ... never whether it is good" (a soft slate hatch, never red or orange; the words stay "Built around cars"); Always, "Restraint in motion, colour and copy" (one reading drawn instead of two; one colour for tint, swatch and icons); Never, "Nagging: off-route alarms" (the route's stretch is a change of style, silent, never a reroute: WH8, WH13); decisions 0096 (amended by 0232), 0097; specs/walkability-urban-form UF9-UF11, specs/walkability-headsup WH8, WH13.
Verdict: aligned
Shape: only car ground drawn (foot ground is the plain map); a soft diagonal slate hatch with a firm edge, its cells joined and rounded into areas; the route's stretch through it cased in slate while navigating with the layer on; the car icon in the same slate.
Precedent: Komoot ties a route warning to the section it applies to; AccessMap marks the exception on the path, not the norm; aviation charts hatch restricted airspace along its boundary; Google Maps says it in words only (all unverified, docs/research/adjacent-apps.md, "Mark ground that is hard on foot"). Departs from AccessMap's red: a soft slate, since the ground is described, not judged.
Criteria: never red or orange, readable without colour; no number, count, share or rank (UF12); nothing touches the route, no sound or haptic (WH8, WH13); the cells' rule and the area card's words unchanged. (CG1-CG10 below carry them.)
Open: none (the look picked by the owner, 2026-11-27)
```

## Decisions

- **Only the car ground is drawn; a soft hatch with a smooth edge; the route marks its stretch** (the owner, Nov 19,
  decision 0232, amending 0096): ground easy on foot is the plain map.
- **The hatch's look** (the owner, in person, 2026-11-27, decision 0271), in three answers on the web build at 390 px:
  1. From four candidates (A 45°, 9 px apart, 1.5 px lines at 55%, a 2 px edge at 85%; B 45°, 6 px apart, 1 px, edge
     1.25 px; C about 63°, 13 px apart, 2 px, edge 3 px; D about 27°, 8 px apart, 1.25 px, edge 1.5 px): "A (Recommended)".
  2. Asked by the steward whether A reads as "built around cars" or as "keep out" (a hatch with a firm boundary is the
     charts' mark for restricted airspace): "Too 'keep out'".
  3. From three softened A's on the same scene, each with Explore at its own zoom (A1 1.5 px at 40%, edge 1.25 px at
     70%; A2 1.25 px at 40%, edge 1 px at 60%; A3 1.5 px at 35%, no edge): "Soft A2 (Recommended)": lines at 45°,
     rising to the right, 9 px apart, each 1.25 px at 40%; the edge 1 px at 60%; slate `#3b4a6b`; the route's casing as
     drawn (slate, 14 px under the route's 8 px, 3 px each side); the legend's swatch two lines, none corner to corner
     (the steward's S4).
- **The read's edge fades** (the owner, in person, 2026-11-27, on the steward's S2): "Fade over ~100 m (Recommended)":
  toward the edge of what was read the hatch fades out over about 100 m, never a straight cut (0232: never a missing
  tile), and no edge line is drawn along it.
- **Unread ground and plain ground** (the owner, in person, 2026-11-27, asked by the steward: with foot ground drawn as
  the plain map, plain also means "not read" and "neither"): "Unread should differ". Not built in this slice: filed for
  the owner as its own entry (see "Not in this slice").
- **One slate car icon everywhere** (the owner, in person, 2026-11-27, decision 0271): "Everywhere (Recommended)": the
  pedestrian with the car badge is slate wherever it is drawn. The question named the heads-up, the legend and the area
  card; the code shows the area card draws no icon (its "On foot" section is words only, `AtlasCard.tsx:254-259`), so
  "everywhere" is the heads-up and the legend, the only hosts of `WalkBandIcon`'s car icon, and no icon is added to the
  card; its words are unchanged. The owner was told so (2026-11-27).

## Mock-up

Not needed: a restyle of the existing Walkability layer, its legend swatch, the route and the car icon, with no new screen, sheet, dialog, flow or regrouping (decision 0259); the hatch's look was picked by the owner from candidates drawn on the web build, "A (Recommended)", then "Too 'keep out'", then "Soft A2 (Recommended)" (the owner, 2026-11-27), the read's edge "Fade over ~100 m (Recommended)" (the owner, 2026-11-27), and the icon's reach, "Everywhere (Recommended)" (the owner, 2026-11-27).

## How adjacent apps do it

The job: show, on the map a walker follows, which ground is hard on foot, and where their way enters it.

- **Komoot** (iOS, Android, web): route warnings (off-grid sections, steps, steep or dangerous terrain) are notes the map
  does not show; the distance indicator shows which section of the route a warning applies to. Source:
  https://www.komoot.com/help/warnings (search summary, page unreachable Nov 19). **Unverified**.
- **AccessMap** (Seattle, web): footways coloured by how their incline affects pace, an inaccessible one as a dotted red
  line, with a legend. Source: https://taskarcenteratuw.github.io/tcat-wiki/accessmap/user-manual/interface (search
  summary, page unreachable Nov 19). **Unverified**. A counter-example in part: red as a verdict.
- **Aviation charts** (Esri's charting conventions): restricted airspace drawn with a hatched band along the inside of
  its boundary, not a filled interior. Source:
  https://desktop.arcgis.com/en/arcmap/latest/extensions/aviation-charting/symbolizing-restricted-airspace.htm (search
  summary, page unreachable Nov 19). **Unverified**.
- **Google Maps**: walking directions carry a caution in words, "Use caution – walking directions may not always reflect
  real-world conditions"; nothing marks the ground on the map. Source: quoted at
  https://walksydney.org/2018/12/10/pedestrians-left-at-the-kerb-by-google-maps/ (search summary, page not read).
  **Unverified**.

All four in `docs/research/adjacent-apps.md`, "Mark ground that is hard on foot". Where this departs: AccessMap judges in
red; here the ground is described in one soft slate, never red or orange (VISION, "Guidance is structural"). Like Komoot,
the route's own stretch carries the mark the heads-up points at; like the charts, the area is a hatch with a firm edge.

## Every surface (decision 0167)

- **The Walkability layer's drawing** (`walkability` prop of `WalkMap`): the Explore page's map
  (`src/app/(tabs)/explore.tsx`), Navigate's ready map (`src/components/walk/useReady.tsx`) and the walk screen's map
  (`src/app/walk.tsx`), each on the web (`WalkMap.web.tsx`) and native (`WalkMap.native.tsx`) renderer. All four
  criteria of the drawing (CG1-CG4) hold on each, from the one `useWalkability`.
- **The route's casing** (CG6): only the walk screen navigates a route (`navigation.nav`); the ready map shows a
  destination's preview, not a navigated route, and Explore none. A route preview (choosing among routes) draws no
  casing, as it draws no trace or fog.
- **The legend** (CG5): `LayersControl`'s key, in the Layers panel's drawer on Explore, Navigate and the walk.
- **The car icon** (CG7, the owner's "Everywhere"): `WalkBandIcon` with `band="car"`, drawn by the heads-up
  (`walk.tsx`, `walk-ahead`) and the legend's row (`LayersControl`); `grep -rn "<WalkBandIcon" src` finds no other host.
  The area card's "On foot" section draws no icon and gains none. The foot and mixed icons keep their colours.

## Criteria

G5's ten, in its words, numbered with the slice's prefix; CG11 is the states they imply (slice step 2).

1. **CG1** (the owner's task: "notice the indicator … it's not apparently clear which way it is") With the Walkability
   layer on, ground built around cars is drawn and ground easy on foot is not (the plain map); the cells' rule and the
   area card's words are unchanged. **Finding:** someone who has not seen the legend can say which ground is built around
   cars and where the route's line points, on the owner's scene (a navigated walk into car ground, Walkability and
   Storefronts on, the heads-up showing, 390 px).
2. **CG2** The car ground is a soft diagonal hatch in slate with a firm edge line (the owner's pick, Soft A2: 45°, lines
   9 px apart, each 1.25 px at 40%, the edge 1 px at 60%, `#3b4a6b`), the streets and labels readable through it, never red
   or orange, readable without colour.
3. **CG3** Neighbouring car cells are drawn as one area with rounded edges, no 250 m steps, from a core function of the
   cells (deterministic, never stored, O(n log n)).
4. **CG4** The edge of what was read never draws an edge of car ground: the firm line is drawn only where car ground
   meets ground that was read; toward the read's edge the hatch (and any edge line reaching it) fades out over about
   100 m, never a straight cut (the owner, "Fade over ~100 m").
5. **CG5** The legend shows one row, "Built around cars", its swatch the hatch as drawn (its lines, spacing and edge; two
   lines, none corner to corner) and its icon in the same slate.
6. **CG6** While navigating with the layer on, the route's stretch inside car ground is drawn with a slate casing under
   the route's own colour, from the runs the heads-up already finds; with the layer off it is not. Only runs of car
   ground are cased (`areaStretches`, 300 m or more along the route): a fast road on plain ground is not, and a
   crossing of car ground under 300 m is uncased, as it is unsaid. Each casing is cut to the drawn car ground, so it
   begins and ends within 25 m of the hatch's edge.
7. **CG7** The heads-up's icon is the same slate, not the accent; its words, timing and silence are unchanged (WH7, WH8).
   The same slate car icon wherever it is drawn (the heads-up and the legend; the owner, "Everywhere").
8. **CG8** Nothing touches the route: no reroute, no "avoid", no sound or haptic (WH13).
9. **CG9** No number, count, share or rank anywhere (UF12): the map is handed areas and edges with a kind and nothing
   else.
10. **CG10** The same on the web and the native map; native recorded as never run on a device.
11. **CG11** (the states the criteria imply) With the layer off nothing is drawn or read; with no car cell in reach
    nothing is drawn (no area, no edge); while new tiles are read the last drawing stays (as today, walkability audit
    5); a navigated route with no stretch in car ground has no casing, and ending the route takes the casing away.

## Not in this slice

- **Unread ground drawn differently from plain ground** (the owner, "Unread should differ"): filed as an `[owner]` entry
  in the inbox by this run's record, with the steward's analysis, a recommended shape and an "Otherwise".
- A quiet label inside large car areas (G5's "After it").

## Amends

- specs/walkability-urban-form UF9 (a tint over both readings), UF10 (two legend rows) and UF11 (both ends
  in a real town): replaced by CG1-CG5 (decision 0232 retires UF11); their text says so and their tests move to the new
  drawing.
- specs/walkability-headsup WH7: the icon is slate (CG7); its words unchanged.
- specs/map-layers ML13 names "the tint": it now reads "the drawing" (no change of meaning).

## Tests

Unit, in `src/lib/__tests__/walkability/` (feature `walkability`): `walkCarGround.test.ts` (CG1, CG3, CG4, CG9, CG11),
`walkHatch.test.ts` (CG2, CG10's image), `walkTint.test.ts` (UF9, UF12 moved to the new drawing), `walkCasing.test.ts`
(CG6, CG8, CG11's casing), `src/lib/__tests__/layers/` (CG5's row). Journeys: `walkability` (the drawing on Explore and
Navigate, the legend, the area card's words), `headsup` (the owner's scene: the casing, the slate icon, the layer off),
pictures at 390 and 320.

## Record

(filled at the end of the slice)
