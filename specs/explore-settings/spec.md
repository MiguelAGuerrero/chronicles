<!-- Repo first: written from the owner's request (Nov 11, 2026) at /slice; not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Explore settings: what I'm into, from the Explore tab

Nov 11, 2026 · @Miguel Guerrero

## Vision

Idea: "The Explorer tab should have the settings that are accessible in the navigation walker settings. The point of these settings is to filter out points of interests or other features of a town or city that the user is uninterested in. So there should be a dedicated settings store ..., and the Explorers tab should have a settings button to control those values, which are then synced to the walking settings as well."
Verb: earn (Explore: the walker chooses what is worth noticing, so the map shows what they came for).
Touches:
- Always, "**Restraint** in motion, colour and copy: the content is the novelty, not the chrome." One more round button in the edge column, off the map's content; no badge, no number (ES2).
- Always, "**Counts are words**" and Never, "Tallies"; NV14, no counts on Explore. Neither the button nor its panel shows how many kinds are on or off (ES3).
- Never, "A capture behind a menu": Explore draws no capture stack, so the panel keeps clear of what it does draw: the Layers button, the tab bar and the bottom strip (ES7).
- Never, "Editing out the lows" is not touched: a kind switched off hides places to find, never a walk's trace or a moment. (The replay's "Passed ..." line has followed the hidden kinds since E11; unchanged.)
- E16 ("What I'm into"), NV21, NV22: the switches already exist in the walk's settings and save as they change; this is the same setting, reached from Explore.
Verdict: aligned
Shape: as asked, with the store the walk already uses (`explore/settings.ts`, meta `explore_hidden`), not a second one: the owner chose reuse (Nov 11). Only the kind switches, not the "?" range or the pocket alert (the owner, Nov 11).
Criteria: ES3 (no number or count; the button looks the same however many kinds are off) and ES7 (the panel keeps clear of the Layers button, the tabs and the bottom strip) carry what the vision needs.
Precedent: ML4 (the Layers button's panel); E16, NV21 (the switches); NV22 (saved as they change).
Open: none.

## Why

What a person is into is chosen in the walk's settings drawer, one screen away from where they browse: Explore. Someone who has no wish to find a cemetery or a place of worship sees them in the atlas until they start a walk and open the drawer. The setting already reaches Explore (it reads `explore_hidden`); it has no door there.

## Decisions

- **Reuse the walk's store** (the owner, Nov 11): one meta key, one listener, one truth. No second store, no copy to keep equal.
- **Kinds only** (the owner, Nov 11): the "?" range and the pocket alert are about a walk, not about what Explore shows, and stay in the walk's drawer.
- **A button beside Layers** (the owner, Nov 11): the edge column's second round button, opening a panel as Layers does.

- **Everything off is just a state** (the owner, Nov 11): no empty-state line and no switch to Quiet. Whether to hint that the filters are all off is left for later; the owner has no shape for it yet.

## Acceptance criteria

### The store

1. **ES1 · One setting, two doors.** A kind switched off from the Explore tab is off in the walk's settings, and one switched off in the walk's settings is off on Explore the next time it is seen and after a reload. A change from either door keeps the "?" range and the pocket alert as they were.
2. **ES2 · Changing one kind changes only it.** Switching a kind off or on adds or removes that kind alone; the others, and a kind added since the choice was saved (PK18), keep their state. Two switches pressed in one tick both end up saved. A save that fails puts the switch back to the saved state and never throws.

### The control

3. **ES3 · The button.** On the Explore tab, one round button of at least 44 px in the map's edge column, below the Layers button, labelled "What I'm into". Its panel is closed on arrival. It shows no number, count or percentage, on the button or in the panel, and looks the same whether none or all kinds are off (no dot, no fill, same label); only its open state differs, as Layers does.
4. **ES4 · The panel.** Pressing the button opens a panel of one switch per kind, in the walk's order and with the walk's labels, each on unless switched off, named by its label with its on or off state for a screen reader. Before the saved choice has loaded the switches are disabled, never shown on and then flipped. A switch saves as it changes (NV22) and the atlas redraws in the same render, with no reload: a kind switched off no longer shows its "?" or its kind in what is waiting; switched back on, it does. The Layers panel and this one are never open together.
5. **ES5 · Closing.** The button, Escape, Back and a tap on the map close the panel, and focus returns to the button; the panel never follows the person to another screen. Opening either panel closes the other.
6. **ES6 · Quiet.** A kind that is off shows only in its switch. No line says how many places or kinds are hidden, and nothing is added to the Explore tab's own content.
7. **ES7 · Kept clear.** On a 320 x 568 phone and in landscape, the open panel overlaps neither the Layers button, the tab bar nor the bottom strip, and its list scrolls to the last kind (the same `clearBottom` as Layers).
8. **ES8 · A view filter only.** A kind that is off changes what Explore shows (and, as today, a walk's Explore mode and the replay's "Passed ... without stopping" line, E11). It changes nothing that was captured: no moment, capture, walk or place's context in Chronicle or the replay reads it, and a find stays a memory. This slice adds one reader of the setting, the new panel.
9. **ES9 · Every kind off is an ordinary state.** Switching every kind off is allowed and is nothing special: no line, notice or prompt appears on Explore, nothing else changes (a walk's mode stays as it was), and the switches work as ever. (The owner, Nov 11: "just let it be a single state with nothing special about it"; a blank atlas is the person's own doing.)
