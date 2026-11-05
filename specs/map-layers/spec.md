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
Shape: as asked. Nothing in it betrays a rule; it removes chrome.
Criteria: ML4 (never covers the capture stack, the other edge buttons or the bottom strip) and ML6 (no number, count or percentage) already carry what the vision needs.
Open: Town borders default **on** is my reading, not the owner's call: the vision says "restraint ... the content is the novelty, not the chrome", which leans toward off. Keep on (it orients you and was already shown), or off with the others?

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
- **Town borders default on** (my reading, to confirm): they are how a person knows which town they are in, and moving them into layers
  should not silently take away something shipped. One line in the registry flips it.

## Acceptance criteria

### The registry

1. **ML1 · A layer is data.** A layer has an id, a name in words, an icon, whether it is on by default, the legend rows it shows when on
   (each a swatch, an icon where it has one, and words), and what it hands the map to draw. The panel, the store and the defaults are built
   from the list of layers, never from a layer's name. Adding a layer is one entry and its drawing, with no change to the panel.
2. **ML2 · The three layers and their defaults.** Walkability: off. Busy streets: off. Town borders: on.

### The control

3. **ML3 · One Layers button.** On the Explore map and on the Navigate map (ready and live), one round button in the map's edge column,
   where the walkability button was (the column's top on Navigate, the top right on Explore), opens the panel. It replaces the walkability
   button; no layer has a button of its own. Its accessible name is "Layers", it says whether the panel is open, and it looks filled while
   any layer is on. It shows no count.
4. **ML4 · The panel.** A small card by the button listing the layers, each a row: its icon, its name, a switch. A layer that is on shows
   its legend rows under its name. The panel is inline (never a `Modal`), opens and closes on the button, closes on Escape and on a tap on
   the map, and never covers the capture stack, the other edge buttons or the bottom strip. In Explore's short map pane it opens below the
   button and left of the Locate and compass buttons, and in the walk it opens upward (specs/walkability's placement rules, kept).
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

### Walkability's place in it

13. **ML13 · Walkability is the layer's drawing and its legend.** Everything specs/walkability-urban-form says about the tint, its legend rows and its
    reads (UF9, UF10, UF17) happens when the Walkability layer is on, and nothing is read for it when off (specs/walkability WK4).

## Not in this slice

- The "unwalked streets near me" toggle, the fog, the "?" marks, routes, the trace (they stay as they are).
- A layer's own options (a slider for the busy grade, a choice of tint): a layer is on or off.
- Layers on the Chronicle, replay or day maps.
- Ordering layers, or a layer's opacity.
