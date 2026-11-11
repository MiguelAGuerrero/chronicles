<!-- Repo first: written from the owner's request (Nov 11, 2026) at /slice; not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Explore settings: what I'm into, from the Explore tab

Nov 11, 2026 · @Miguel Guerrero

## Vision

Idea: "The Explorer tab should have the settings that are accessible in the navigation walker settings. The point of these settings is to filter out points of interests or other features of a town or city that the user is uninterested in. So there should be a dedicated settings store ..., and the Explorers tab should have a settings button to control those values, which are then synced to the walking settings as well."
Verb: earn (Explore: the walker chooses what is worth noticing, so the map shows what they came for).
Touches:
- Always, "**Restraint** in motion, colour and copy: the content is the novelty, not the chrome." One more round button in the edge column, off the map's content; no badge, no number (ES2).
- Always, "**Counts are words**" and Never, "Tallies"; NV14, no counts on Explore. Neither the button nor its panel shows how many kinds are on or off (ES3).
- Never, "A capture behind a menu": the panel never covers the capture stack (ES2).
- Never, "Editing out the lows" is not touched: a kind switched off hides places to find, never a walk's trace or a moment.
- E16 ("What I'm into"), NV21, NV22: the switches already exist in the walk's settings and save as they change; this is the same setting, reached from Explore.
Verdict: aligned
Shape: as asked, with the store the walk already uses (`explore/settings.ts`, meta `explore_hidden`), not a second one: the owner chose reuse (Nov 11). Only the kind switches, not the "?" range or the pocket alert (the owner, Nov 11).
Criteria: ES3 (no count anywhere in the control) and ES2 (never covers the capture stack or the other edge buttons) carry what the vision needs.
Precedent: ML4 (the Layers button's panel); E16, NV21 (the switches); NV22 (saved as they change).
Open: none.

## Why

What a person is into is chosen in the walk's settings drawer, one screen away from where they browse: Explore. Someone who has no wish to find a cemetery or a place of worship sees them in the atlas until they start a walk and open the drawer. The setting already reaches Explore (it reads `explore_hidden`); it has no door there.

## Decisions

- **Reuse the walk's store** (the owner, Nov 11): one meta key, one listener, one truth. No second store, no copy to keep equal.
- **Kinds only** (the owner, Nov 11): the "?" range and the pocket alert are about a walk, not about what Explore shows, and stay in the walk's drawer.
- **A button beside Layers** (the owner, Nov 11): the edge column's second round button, opening a panel as Layers does.

## Acceptance criteria

### The store

1. **ES1 · One setting, two doors.** A kind switched off from the Explore tab is off in the walk's settings, and one switched off in the walk's settings is off on Explore, at once and after a reload. A change from either door keeps the "?" range and the pocket alert as they were.
2. **ES2 · Changing one kind changes only it.** Switching a kind off or on adds or removes that kind alone; the others, and a kind added since the choice was saved (PK18), keep their state. A save that fails leaves what was shown unchanged in words, never a crash.

### The control

3. **ES3 · The button.** On the Explore tab, one round button of at least 44 px in the map's edge column, below the Layers button, labelled "What I'm into". Its panel is closed on arrival. It shows no number, count or percentage, on the button or in the panel. It never covers the capture stack, the Layers button or the bottom strip.
4. **ES4 · The panel.** Pressing the button opens a panel of one switch per kind, in the walk's order and with the walk's labels, each on unless switched off. A switch saves as it changes (NV22) and the atlas redraws at once: a kind switched off no longer shows its "?" or its kind in what is waiting; switched back on, it does. The Layers panel and this one are never open together.
5. **ES5 · Closing.** The button, Escape, Back and a tap on the map close the panel; the panel never follows the person to another screen.
6. **ES6 · Quiet.** A kind that is off shows only in its switch. No line says how many places or kinds are hidden, and nothing is added to the Explore tab's own content.
