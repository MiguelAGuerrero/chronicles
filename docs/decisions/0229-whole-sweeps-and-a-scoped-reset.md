# 0229. Whole sweeps and a scoped reset: only a new screen or control in an area's own files makes it rough again

Date: 2026-11-18 · Status: accepted · Area: process · Amends: 0129 (an area changed since its sweep is rough again) · From: the orchestrated `/tend` session, Nov 18

## Context
The owner asked: "every surface is determined to be rough without any clear criteria for progression… has there
ever been an evaluation change". The tend orchestrator's audit of the ledger on Nov 18 found none:
- No area changed state in 52 ledger versions; every area was rough from its first entry.
- 0 of 30 sweeps were whole (lenses 1-7). The run log's state field reads rough->rough 29 times. 26 areas were
  never swept.
- The causes: rough->settling needs a whole sweep; the faster lane (0181) and aimed runs made every sweep partial;
  any source change by anyone resets an area to rough (0129's "rough again, whoever changed it", `changed` in
  `scripts/tend.js`); an inbox build never moves a state.
- So the balance read "outgrowing its base" (more than three rough areas), and no `G` was proposed in 62 runs.

## Decision
The owner, in person through the tend orchestrator session on Nov 18: **"Whole sweeps + scoped reset"**.

- **Scoped reset.** A change since an area's sweep, by anything but the loop's own commits (a `tend …` commit or
  its revert), makes the area rough only when it touches files the area owns (`scripts/features.js`) and adds a
  screen or a control there. Any other change leaves the ledger's state as it stands.
- **The mechanical reading** (`resetsArea` in `scripts/tend.js`), from each commit's `-U0` patch:
  - a screen: a route file added (git's `A`, not a rename) under `src/app/` that the area owns, other than a
    navigator (`_layout`) or one of the router's own files (`+html`, `+not-found`);
  - a control: across the `.tsx` files the area owns, the `onPress=`, `<Pressable`, `<Switch`, `<TextInput` and
    `accessibilityRole="button"` its added lines hold outnumber those its removed lines held. A control edited or
    moved within the area is none added; one moved in from another area's file is one added.
- `next` ranks the areas by the commits that reset them, and the balance's areas by state reads the same count.

## Why
A state the next unrelated commit undoes cannot be reached, so the loop could never finish an area or propose its
evolution. A new screen or control is what a sweep has not seen; a fix, a copy change or a refactor inside the
area is not new ground. The markers are what the code already uses for every tappable element, read from the
patch the script already asks git for, with no judgment in them.

## Consequences
- The next tend session runs whole sweeps (lenses 1-7, uncapped) on walk-screen, presence, tabs and map, in that
  order.
- `/tend` section 8's override paragraph and its `rough` row now say the scoped rule; this amends 0129's "an area
  changed since its sweep by anything but the loop is rough again, whoever changed it". 0129's "a slice landing
  makes its area rough" holds when the slice adds a screen or a control, which most do.
- A control the markers miss (a custom component's `onLongPress`, a gesture) does not reset its area; one renamed
  from another element counts as added. The reading is changed by an edit to `resetsArea` and its tests.
