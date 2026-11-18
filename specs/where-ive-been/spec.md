<!-- Where I've been (WB). Written in the repo first (2026-11-18), from the owner's words: "Let's remove the unwalked streets button
     because the trace already provides that information implicitly. That said, let's provide a layer to show previous traces so that
     we can toggle on or off where I've been." No concept-doc tab yet; to be copied there as one. The doc wins once it exists. -->

# Where I've been (WB)

The walk screen loses its "Unwalked streets near me" button: the trace already says where you have been. In its place, a map **layer**
(specs/map-layers) draws the lines of your earlier walks, so you can turn where you have been on and off.

## Vision

Idea: "Remove the unwalked streets button because the trace already provides that information implicitly. That said, provide a layer to show previous traces so that we can toggle on or off where I've been."
Verb: earn (new ground seen by its absence, unscored). Return ("a way to recall walks") waits on a tap that opens a line's walk, deferred (steward S5).
Touches:
- Never, "Scores, streaks, completion, coverage, levels, badges, leaderboards"; its nearest fit is "faint fog; 'New to you', 'you walked there often'". A where-I've-been layer is the shape Fog of World turns into coverage.
- Never, "Tallies such as '12 of 87' or '40%' of places, streets or finds". The removed pill said "4 unwalked nearby" in digits (`docs/DEFERRED.md`, what-im-into-page audit 22): the removal clears that debt.
- Always, "**Moments and the trace are truth**; streets, areas and summaries are recomputed." The layer's lines are a cache of the trace, rebuilt from it.
- Shapes, "A heatmap of where others walk | out": the layer is your own walks only, and in one even tone (the owner, below), so it never becomes a heatmap of your own either.
- 0020 ("unwalked streets and fog stay faint"); 0011 and 0028 (the fog bold "only while the switch is on"; with the switch gone it stays quiet); 0097 (one Layers panel, off unless wanted; it kept the unwalked toggle out of layers, which this slice reverses by removing it).
Verdict: aligned
Shape: as asked: a "Where I've been" switch in the shared Layers panel (walk screen and Explore), off by default, drawing every earlier walk's walked line near the map in one faded, thinner green under today's trace; rides and unresolved gaps left out; no dates, no counts. The quiet fog and the ink walked streets stay.
Precedent: Google Maps Timeline (history kept on the device, a map per day; verified); Apple Maps Visited Places (opt-in history of places, kept for a chosen time; verified); Fog of World (the map fogged except where you have been, with a percentage and levels: the fog the model, the percentage a counter-example; unverified); Strava's personal heatmap (every activity overlaid, darker where you go often; from memory, unverified).
Criteria: WB1-WB3 (the button goes, the fog stays quiet, the column closes up), WB10 (no number, percentage, date or "explored"), WB9 (one even tone, never darker where walks overlap), WB17 (nothing new leaves or is fetched).
Open: none (the owner answered overlaps: one even tone, Nov 18).

## How adjacent apps do it

- **Google Maps Timeline** (Android): kept on the device ("saving each of your devices' precise locations to that device"); opened from the profile picture, "Your Timeline"; a day chosen from **Today** at the top; tabs Places, Cities, World. One day's path at a time, never every path at once. Source: https://support.google.com/maps/answer/6258979?hl=en&co=GENIE.Platform%3DAndroid , read Nov 17, 2026. **Verified**.
- **Apple Maps Visited Places**: "helps you keep track of places you've been, so you can easily revisit or share them later"; kept for 3 months, 1 year or Forever, chosen when turned on; one place removed from its card's More. Places, not lines. Source: https://support.apple.com/guide/personal-safety/ipsae6d4500b/web , read Nov 17, 2026. **Verified**.
- **Fog of World**: the map stays fogged except where you have been; a percentage explored and levels. Counter-example (Never: coverage, levels); the fog alone is the model for our faint fog. Source: from memory, unverified. **Unverified**.
- **Strava personal heatmap**: every recorded activity's line overlaid on one map, brighter where you have gone more often, filtered by sport and date; a subscriber feature. Counter-example for the stacking (frequency drawn as intensity, the owner chose one tone); the overlay of your own lines on and off is the job. Source: from memory, unverified. **Unverified**.

## Decisions (the owner's calls, Nov 18; decision 0221)

- **The "Unwalked streets near me" button goes**, with its veil, its bold fog and its "unwalked nearby" line: "the trace already provides that information implicitly".
- **The quiet fog and the ink walked streets stay as they are**, always drawn; only the button and what it switched go.
- **A layer, "Where I've been"**, in the Layers panel shared by the walk screen (ready and live) and Explore (0097: one setting per layer, every map with the panel). Off by default.
- **Faded green, thinner**: today's green, lighter, narrower, no white edge, under today's trace.
- **Every earlier walk in the area shown**: no date window, no picker, nothing counted.
- **One even tone**: where walks overlap the line does not darken; the layer says where, never how often.
- **A cache of each walk's line** (the data model): its walked line simplified, with its bounds, derived from the trace and tagged with a rule code; a SQLite migration and an IndexedDB version.

## Criteria

### The button goes

1. **WB1 · The owner's task: "remove the unwalked streets button".** On the live walk screen there is no unwalked-streets control, no
   "unwalked nearby" line and no grey veil over the base map, and the fog never draws bold. The fog of unwalked streets (`FOG_STYLE`) and
   the ink streets walked before still draw as before, on every walk.
2. **WB2 · The column closes up.** With the button gone, the live walk's edge column has no empty slot: Walk me back sits directly above
   Recenter's place, and the compass directly above the highest button shown. The ready screen's column (Locate, the compass above it) and the
   capture stack are where they were, and the boxes still match across Start.
3. **WB3 · The compass hands focus to a button that is there.** Leaving the compass (tend map 6) moves focus to Walk me back while it shows,
   else Recenter while it shows, else the map; never to a control that is gone.

### The layer

4. **WB4 · The owner's task: "toggle on or off where I've been".** The Layers panel on the walk screen (ready and live) and on Explore lists
   "Where I've been": a row with an icon, its name and a switch, labelled by its name, off by default. **Finding:** someone not told where it is,
   shown the walk screen, finds it by opening the Layers button (the stacked-squares glyph, bottom left) and reading the row's name.
5. **WB5 · One setting, kept.** Turning it on on one of those maps shows it on the others, and it survives a reload (ML7).
6. **WB6 · On, your earlier walks near the map draw; off, none.** With the layer on, every earlier walk whose line passes within 5 km of the
   point the screen's other layers are centred on (the walker on the walk screen; the selected area, else the walker, on Explore) draws its
   line; as that point moves to another area the lines follow. With it off nothing is drawn and nothing is read for it. The Chronicle, replay
   and day maps never draw it. On Explore only the main map draws it: never an area tile's map or the area card's ring, and it is never clipped
   to or framed by an area's border (steward S1; 0066).
7. **WB7 · Walked stretches only.** Only recorded walked fixes and gaps the walker kept draw. A ride, a pause, a still spell, and a gap that is
   unresolved, dismissed or filled by itself (the app's guess) is a break in the line, never drawn as walked (steward S4).
8. **WB8 · Today's walk is not doubled.** The walk being recorded is never part of the layer (its own trace is drawn live); once stopped, it
   joins.
9. **WB9 · One even tone, under today's trace.** The lines are one colour at full opacity, so two walks over one street look the same as one;
   thinner than today's trace, with no white edge, drawn under today's trace, the route and the walked streets' ink, and over the fog. The colour
   is told apart from today's trace and from the ink walked streets by the map palette's measures, and its contrast against the base map stays
   under the trace's (`colors.test.ts`). With the layer on, the fog's paint is unchanged: no bolder, no veil (steward S2).
10. **WB10 · Nothing is a score.** No number, percentage, date, "explored", "covered" or "of" tally appears in the layer's name, its legend or its
    status line, or on the map.
11. **WB11 · Its legend, in words.** With the layer on, the walk's settings ("On the map", the ready bar pulled up and the live walk's options card)
    show one row: the layer's swatch and "Your earlier walks". Explore shows no legend (0097: it has no settings drawer).
12. **WB12 · On but nothing to draw, it says so.** With the layer on: no fix yet says "Waiting for your position"; no earlier walk near says
    "None of your walks pass here"; older walks still being prepared says "Getting your walks ready…". In words, in the panel's status line,
    never for a layer that is off.

### The lines are a cache of the trace

13. **WB13 · A deleted walk's line goes with it.** From the moment a walk is deleted (during its Undo too) its line is not drawn; Undo brings it
    back; the deletion removes its cached line.
14. **WB14 · Kept beside the walk, rebuilt from the trace.** Each walk's line is kept with its bounds and a rule code. It is written when the walk
    stops, rewritten when a gap of it is kept or dismissed, and rebuilt when the rule code changes. It is never edited by hand: a rebuild from the
    same trace gives the same line.
15. **WB15 · Older walks are prepared quietly.** With the layer on, walks with no current line get one, one walk at a time, nearest the map's
    centre first, without holding up the map; walks that fail are left for the next time the layer is turned on.
16. **WB16 · Sent to the map only when it changes, without show.** The lines are simplified (within 5 m of the walked trace) and sent to the map
    again only when the set of lines near changes, never on each fix or frame. While older walks are prepared the map gets at most one send at the
    start and one when the near set is done, so lines never spread outward one by one; no fade or animation when lines appear or a stopped walk
    joins (steward S3; Always, restraint in motion).
17. **WB17 · Nothing new leaves the device or is fetched.** Building and drawing the layer reads only what the device holds: no tile read, no
    request.

## Not in this slice

- The fog and the ink walked streets themselves (unchanged; the owner).
- A tap on a past line to open its walk: the layer's Return (steward S5); deferred, a later slice if wanted.
- A date window or a picker of walks.
- The layer on the Chronicle, replay or day maps (they have no Layers panel).
- A street-level "walked before" check (the walked streets' ink already says it).

## Record

Built Nov 18, 2026 on `claude/modest-johnson-pctfuj`, test-first by history (`bd957f8`: every criterion's todo before its code).

- **Passed:** WB1-WB17. Unit tests (`layers/pastLines.test.ts`, `layers/pastLinesShell.test.ts`, `layers/layers.test.ts`,
  `map/palette.test.ts`, `walk-screen/layersCorner.test.ts`), the Db contract over the fake, IndexedDB and SQLite
  (`putWalkLine`, `getWalkLinesIn`, `listWalkLineCodes`, `deleteWalkLine`, `deleteWalk`), and the `where` journey (21 checks:
  WB1-WB6, WB8-WB12, WB16, nothing leaves the device). `walk`, `qol`, `ready`, `palette`, `layers`, `reload` and `launch` green;
  `gaps` fails "gap-drawing audit 4" on `main` too (3 of 3 baseline runs, `scripts/e2e/flaky.json`).
- **The steward** (before the plan): four drifts, one tone, no breach; all accepted (S1-S5 above, decision 0221).
- **The cold find** (pictures and the task only): found from all three screens through the Layers button, medium confidence;
  its doubts (a wordless glyph, filled when on, another corner on Explore) are the button's, from decision 0097 and fix
  layers-corner, not this slice's.
- **The UI review:** U1 (the seeded walk ran mid-block: the fixture's, fixed), **U2 accepted** (the pale line read 1.9:1, under
  WCAG 1.4.11's 3:1: `where-ive-been ui 1`, a muted sage `#588a78` at 3.54:1 and 3 px, still under the trace's 4.5:1), U3 (the
  legend below the fold in its picture: the journey's, fixed), U4 (the footsteps glyph reused: noted in decision 0221).
- **Deferred:** a tap on a line opening its walk (the layer's Return), simplification by zoom, a date window, a hook's first
  draw from the last lines read (`docs/DEFERRED.md`). **Native:** four device checks in `docs/NATIVE_UNVERIFIED.md`; none of it
  has run on a phone.
