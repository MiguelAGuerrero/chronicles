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
7. **ES7 · Kept clear.** On a 320 x 568 phone and in landscape, the open panel overlaps neither the Layers button nor the tab bar, and its list scrolls to the last kind (the same `clearBottom` as Layers). Like Layers' panel it opens over the area cards as a popover (ML4), on a solid background so the card beneath never shows through.
8. **ES8 · A view filter only.** A kind that is off changes what Explore shows (and, as today, a walk's Explore mode and the replay's "Passed ... without stopping" line, E11). It changes nothing that was captured: no moment, capture, walk or place's context in Chronicle or the replay reads it, and a find stays a memory. This slice adds one reader of the setting, the new panel.
9. **ES9 · Every kind off is an ordinary state.** Switching every kind off is allowed and is nothing special: no line, notice or prompt appears on Explore, nothing else changes (a walk's mode stays as it was), and the switches work as ever. (The owner, Nov 11: "just let it be a single state with nothing special about it"; a blank atlas is the person's own doing.)

## Record

Built Nov 11, 2026. ES1-ES9 tested first: unit tests in `src/lib/__tests__/explore/exploreSettings.test.ts` and `kindsPanel.test.ts`, screen checks in the `layers` journey. Passed: 1878 unit tests, typecheck, lint, the `layers` journey and the thirteen others covering the changed files (`marks`, `snap`, `tabs`, `ready`, `walk`, `walkability`, `headsup`, `hidden`, `nudge`, `outlines`, `reload`, `replay`, `space`), one run each. Not covered by a check: ES4's "a kind switched off no longer shows its ? on the map" is carried by the store's listener (tested) and the atlas's existing read of it, not by a journey step. Deferred: a hint that every kind is off (docs/DEFERRED.md). Test-first by history for every criterion but ES3 by the tool's reading: ES3's todo check sat on three lines (`check.todo(` on the first, the id on the third), which `check:test-first` takes for a real test in `2c1c90b`; it was a todo there. Native has never run on a device; the item is in `docs/NATIVE_UNVERIFIED.md`.

## Audit

Nov 11, 2026, at the owner's request: the auditor (8 findings), the steward (4) and the ux-reviewer (8), numbered on in that order.

1. Native Back does not close the panel on the page near you: accept, fixed. `claimsBack` (`atlas/waitingPins.ts`) makes Explore take Back while the panel is open, not only on a town's page. Test `explore-settings audit 1` (unit); the device check is in `docs/NATIVE_UNVERIFIED.md`.
2. Opening Layers steals focus to the kinds button: accept, fixed (`layersOpen` keeps focus on Layers). Test `explore-settings audit 2` (the `layers` journey).
3. Rows wrap at 320 and the panel covers the area card: in part. The card is covered as Layers' panel is (a popover, ML4): reject, ES7 now says so. The see-through is fixed (audit 9). The wrap is deferred: the labels are the walk's, shared with its drawer.
4. A whole save races a toggle: accept, fixed. Every write, a whole save too, goes through one queue, so what was heard last is what is stored. Test `explore-settings audit 4` (unit, the toggle's read held while a save lands). Whole saves stay last-writer-wins: the walk's copy of the kinds is the screen's own.
5. A failed first load leaves the switches disabled: accept, fixed (`loadOrDefault`: every kind on). Test `explore-settings audit 5` (unit).
6. A failure on the second meta write splits stored and shown: accept, fixed (the kinds first, then which kinds there were, best effort). Test `explore-settings audit 6` (unit).
7. `useAtlas` lets a late load overwrite a newer value: defer, the window is milliseconds and the code predates the slice (`docs/DEFERRED.md`).
8. A fast second tap on one switch is a no-op: reject, the same as every switch in the app; the save is a local write.
9. The steward's: the panel covers the card row, and the card shows through: accept in part. The card is now solid (`explore-settings audit 9`, the `layers` journey); covering the card is as Layers (ML4), reject.
10. The panel is heavy chrome: reject. It is the walk's switches and Layers' width; the picture was taken after the journey scrolled to the last kind (audit 13), and the panel opens at its first kind.
11. The planner ignores What I'm into, and this adds a second door: defer, already in `docs/DEFERRED.md`; the sentence now names this door.
12. Screen-reader wording and the redraw step: accept in part. `explore-settings audit 12` (the `layers` journey) reads a switch's role, name and state. The redraw of "?" for a hidden kind is carried by the store's listener (tested) and `visibleMarks` and `waitingKinds` with `hidden` (E16 tests), not by a journey step.
13. The small-phone picture was taken after the scroll, so it looked cut at the top: accept, the journey now takes one before the scroll too (`kinds-small-top`).
14. The funnel reads as filter, not as "what I'm into": reject, opinion; the funnel is the established filter glyph, and the name is spoken.
15. No title, no close control, no open state: reject, opinion; Layers has none, the group is labelled, and the spec has the button differ by open state only as Layers does (ML3).
16. The card hides the map it filters: defer, opinion; the width is Layers' `panelBox`.
17. Labels wrap at 320: as 3, deferred.
18. The switch is 40 x 24: reject, the row is the control (`SwitchRow`).
19. Nothing shows that a kind is off: reject, the owner's call (ES3, ES9).
20. Layers beside kinds: no finding.

20 findings: 8 fixed (9 and 12 in part: 1, 2, 4, 5, 6, 9, 12, 13), 5 deferred (3 and 17 the wrap, 7, 11, 16), 6 rejected (8, 10, 14, 15, 18, 19), 1 with no finding (20). Journeys run: `layers` twice (before the audit with pictures, and after the fixes).
