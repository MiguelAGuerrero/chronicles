<!-- Map layers (ML). Written in the repo first (2026-11-05), at the owner's request while reviewing the walkability rework:
     "make the tints a setting in the walk ... the idea of layers, where a layer imposes some graphics on the base map, and the
     walkability layer is just one of them ... off by default to reduce visual clutter ... move the busyness to those layers as well."
     To be copied into the concept doc as a tab. The doc wins once it exists. DRAFT: waits on the owner's review of plan.md. -->

# Map layers (ML)

A **layer** puts some graphics on the base map: a tint, a line, a border. The map shows none that the person has not asked for, except the
one that orients them. One button on the map opens a small panel of layers, each a switch. Three layers to begin: **Walkability**,
**Busy streets** and **Town borders**. More can join later without changing the panel.

## Vision

(Written after the build, 2026-11-05, when the vision gate arrived: this spec predates it, so the verdict is a review of what was built, not a gate on an idea.)

Idea: "Make the tints a setting in the walk ... the idea of layers, where a layer imposes some graphics on the base map ... off by default just to reduce visual clutter ... and move the busyness to those layers as well."
Verb: earn (Explore and Navigate: a layer is a way to notice, chosen by the walker, so the map stays the content and the chrome stays out of the way).
Touches:
- Always, "**Restraint** in motion, colour and copy: the content is the novelty, not the chrome." Layers off by default is this line; the one layer on from the start (Town borders) is what orients you.
- Always, "**Capture is one tap away** on every screen you walk or capture from." The Layers button takes the top slot of the edge column and its panel opens upward or over the cards below, never over the capture stack (ML4).
- Always, "**Counts are words**" and Never, "Scores, streaks, completion, coverage"; 0052. No number or count on the button, panel or any legend (ML6).
- 0034, "Busy areas are information only": Busy streets stay information (a graded shading, no pin, no card, no walk the loop). What changes is *when* they draw: on request on any walk, not only an exploring one. That is the owner's call of 2026-11-05 (decision 0096), not drift.
Verdict: aligned
Shape: as asked, with two changes the owner made on 2026-11-05 after the UI audit and the vision review: all three layers start off (Town borders were on), and the button is outlined, not filled with the app's accent.
Criteria: ML4 (never covers the capture stack, the other edge buttons or the bottom strip) and ML6 (no number, count or percentage) carry what the vision needs.
Precedent: 0034 (busy areas are information only) and 0096 (the owner's call that Busy streets draw on request on any walk, not only an exploring one).
Open: none.

## Why

Overlays arrived one at a time, each with its own rule for when it shows: town borders always, busy streets only on an exploring walk,
walkability (new) behind its own button. The owner tried walkability and found the map crowded and the button unclear. One place to choose
what is drawn, off unless wanted, is the quieter map.

## Decisions

- **One Layers button** replaces the walkability button, in the same place on each map (the owner, 2026-11-05).
- **Off by default** (the owner, 2026-11-05): Walkability and Busy streets start off, to keep the map clear.
- **Busy streets draw independently of Explore** (the owner, 2026-11-05): the layer shows on any walk, exploring or quiet. What Explore mode
  does beyond drawing (the "On <street>" chip, the dead-zone nudge, the "?" marks) stays tied to Explore mode.
- **One setting for every map** (the owner, 2026-11-05): turn a layer on once and it shows on the Explore map, the Navigate map, ready or
  live.
- **Walkability, Busy streets and Town borders join; nothing else yet** (the owner, 2026-11-05). The "unwalked streets near me" toggle, the
  fog, the "?" marks and routes stay as they are.
- **All three layers start off, and the button is outlined** (the owner, 2026-11-05, on the UI audit): Town borders were on by default and the
  button filled with the app's accent while a layer was on; both read as chrome. The button now says a layer is on by its glyph and a firmer
  edge. Anyone who had borders on will find them off, one tap away.

## Acceptance criteria

### The registry

1. **ML1 · A layer is data.** A layer has an id, a name in words, an icon, whether it is on by default, the legend rows it shows when on
   (each a swatch, an icon where it has one, and words), and what it hands the map to draw. The panel, the store and the defaults are built
   from the list of layers, never from a layer's name. Adding a layer is one entry and its drawing, with no change to the panel.
2. **ML2 · The three layers and their defaults.** Walkability, Busy streets and Town borders all start off.

### The control

3. **ML3 · One Layers button.** On the Explore map and on the Navigate map (ready and live), one round button in the map's edge column,
   where the walkability button was (the column's top on Navigate, the top right on Explore), opens the panel. It replaces the walkability
   button; no layer has a button of its own. Its accessible name is "Layers", it says whether the panel is open, and it is at least 44 px. It is an
   outlined button: while any layer is on its glyph is the filled one and its edge firmer, and it is never filled with the app's accent. It shows no count.
4. **ML4 · The panel.** A small card **beside** the button, to its left and from its top down, listing the layers, each a row: its icon, its name, a
   switch. A layer that is on shows its legend, not in this panel but under "On the map" in the walk's settings drawers (the owner, Nov 5: the tooltip is intrusive); each legend row is a 44 px target that says what it means in a line beneath it when
   pressed or hovered, in the flow of the panel, never floating. The card scrolls inside the room it has, so on a 375×667 phone with every layer on
   every switch is reachable, and its width follows the map's own pane (at least 280 px wherever the pane allows), so a wide Explore keeps a
   readable panel. It is inline (never a `Modal`), opens and closes on the button, closes on Escape, on a tap on the map and when its screen goes,
   and covers none of the capture stack, the other edge buttons or the bottom strip.
5. **ML5 · Switches are switches.** Each row is a `switch` with a checked state and the layer's name as its label; the legend's icons keep
   their tooltips (specs/walkability WK22, WK23). Turning a layer on or off redraws the map at once.
6. **ML6 · Nothing is a score.** No number, count, percentage or comparison appears on the button, the panel or any legend.

### What is kept

7. **ML7 · One setting per layer, for every map, kept.** A layer's state is one meta value shared by every map, survives a reload, and
   defaults as ML2 says until the person changes it. The walkability switch already kept (`walk_layer`) is read once into the new setting, so
   nobody who turned it on has it turned off.

### Busy streets as a layer

8. **ML8 · Busy streets draw on request.** With the layer on, the graded magenta busy streets and pockets (specs/activity-density AD12) draw
   on the Explore map and on the Navigate map, ready and live, for the remembered areas near the map (the 3 km the walk uses), exploring or
   not. With it off they draw on none of those maps. Their meaning (a density of places, never foot traffic) and their grades are unchanged.
9. **ML9 · Turning it on reads, once.** If no remembered area lies within 1.5 km of the map's centre when the layer is on, the area is read
   once, the same read What's good here does, and kept; a failure says nothing and tries again only when the layer is toggled or the map moves
   1 km. Nothing is read while the layer is off.
10. **ML10 · Explore mode is not changed by the layer.** An exploring walk's chip, nudge and "?" marks behave as before whether the layer is on or
    off, and an exploring walk no longer draws busy streets by itself.
11. **ML11 · The Chronicle map is left alone.** The home map's "What's good here" result draws its busy streets as before; it has no Layers button.

### Town borders as a layer

12. **ML12 · Borders draw when the layer is on.** The tinted town you are in and the lined neighbours (specs/town-borders TB1-TB5) draw when the
    layer is on, on every map that shows them today, and not when it is off. The legend names the two roles in words ("Your town", "Nearby towns").
    A town's own atlas page and the Chronicle home map keep drawing the border they frame (TB2, TB11), which is not a layer.

### States

14. **ML14 · A layer that is on but cannot draw says why.** In the panel, under that layer, in words: "Waiting for your position" with no fix, "Reading…"
    while its tiles are read, "Not available now" when nothing could be had. Never a silent blank, and never for a layer that is off.
15. **ML15 · The drawing is not rebuilt once a fix.** On a live walk, Busy streets are sent to the map again only when the set of remembered areas near
    changes, not on each fix.

### Walkability's place in it

13. **ML13 · Walkability is the layer's drawing and its legend.** Everything specs/walkability-urban-form says about the tint, its legend rows and its
    reads (UF9, UF10, UF17) happens when the Walkability layer is on, and nothing is read for it when off (specs/walkability WK4).

## Not in this slice

- The "unwalked streets near me" toggle, the fog, the "?" marks, routes, the trace (they stay as they are).
- A layer's own options (a slider for the busy grade, a choice of tint): a layer is on or off.
- Layers on the Chronicle, replay or day maps.
- Ordering layers, or a layer's opacity.

## Audit

**UI audit, 2026-11-05** (the `auditor` for behaviour and layout, the `steward` against docs/VISION.md; both report-only, then triaged). Tests named
`layers audit N` and `walkability audit N`, numbered as the auditor's findings, in `src/lib/__tests__/layers/layersAudit.test.ts` (seen failing first) and the
`layers` journey (added with the fix, not seen failing). Auditor: 14 findings (3 high, 6 medium, 5 low): **10 fixed, 3 fixed in part, 1 deferred.**

1. The walk's panel opened upward and was clipped on a short phone, with no scroll: **accept, fixed** (`layers audit 1`). It opens beside the button from
   its top down and scrolls (`layers/layout.ts` `panelBox`).
2. Busy streets rebuilt their drawing and labels on every fix: **accept, fixed** (`layers audit 2`, unit and e2e). Keyed by which areas are near (`nearKey`).
3. A wide Explore crushed the panel: **accept, fixed** (`layers audit 3`). Sized by the map's pane.
4. A floating tooltip painted under later siblings: **accept, fixed** (`walkability audit 4`, e2e). Tips are inline now.
5. The panel's open state leaked across screens: **accept, fixed** (`layers audit 5`, e2e). It closes when its button goes.
6. The car tint matched the town borders' colour and relied on colour alone: **accept, fixed** (`walkability audit 15`). The owner's cool pair, told apart by lightness.
7. A layer on but blank: **accept, fixed in part** (`layers audit 7`): a note for no position, reading and not available. **Deferred:** Explore centres the layers on the
   selected area or you, not the panned map; the tint is not there after panning away, with no cue.
8. Legend icon targets were 29×22: **accept, fixed** (`walkability audit 8`, e2e). The whole row is a 44 px target; a tap opens it and a second closes it.
9. The area card's section appeared and vanished, and a town's line described the 800 m ring: **accept, fixed** (e2e, the `walkability` journey). Shown only once there
   are words; a town's reads "On foot · around its centre".
10. The button is off-screen in a short landscape window (web only): **defer.**
11. Legend swatches did not match the tint; a dead `mixed` swatch: **accept, fixed** (by construction: the swatch is the tint at the map's own strength; `mixed` removed).
12. Accessibility: **accept, fixed in part**: one label per legend row (`walkability audit 8`), the panel after the button in tab order, a group label, a live status line.
    **Deferred:** the heads-up pill is not announced by VoiceOver (native needs an explicit announcement).
13. Listener and store churn: **accept, fixed in part** (`layers audit 13`, unit): settings load once and an early switch is not overwritten. **Deferred:** Escape also
    closes an open atlas card or capture viewer in the same keypress.
14. The new components were off the spacing grid: **accept, fixed** (`LayersControl.tsx` and `Tooltip.tsx` are in `spacingGrid.test.ts`).

Steward: 8 findings (no breach of a Never; two drifts close to one, three drifts, two questions, one tone note). **The owner's calls (2026-11-05):**
S1 and S5 the tint is a cool pair, not green and orange (`walkability audit 15`); S2 and S3 the heads-up speaks, and reads route tiles, only while the Walkability layer
is on (the `headsup` journey); S4 the card says what the ground is, never "mostly" (`walkability audit 16`); S6 an outlined button and borders off by default.
S3's other half, the card reading tiles when it is opened, is **rejected**: opening a card is a tap, and decision 0093 covers the host. S5's other option, drawing only the car
ground, was not chosen. S7 is cited as precedent above. S8 (a dead swatch, "a car is likely needed") is fixed.

