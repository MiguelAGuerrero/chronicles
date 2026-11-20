# 0244. The map sweep: the owner's answers on the map's lines, a loop's two ends, a line's verb and the units line's home

Date: 2026-11-20 · Status: accepted · Area: map, process · Relates to: 0154, 0207, 0229, 0236, 0243

## Context
The last of decision 0229's whole sweeps, of the `map` area (`/tend map`, Nov 20), and the fourth run under the
expectation lens (0236), put four questions to the owner at its first review pause, through the tend orchestrator.

- **The map's expectation lines.** The map had none; the run drafted five and the `steward` reworded four and dropped
  one: E1 said the two ends were "told apart" where its check reads their positions alone, and a loop's two ends showed
  as one mark (`tend map audit 25`); E2's check covered a pin on the end mark alone; E3 rested on a Never line ("Fitness
  numbers") rather than the Always line it serves, and its check (the scale bar) passed while Explore's tiles kept the
  old units; E4 put a rule in the person's mouth ("nothing to keep tracking them after", QL12 and VISION's Never "All-day
  tracking"); E5, the map back to north in one tap, is what map apps have, and the map is secondary in this app.
- **A loop's two ends** (the `steward`'s silent 1, the `ux-reviewer`'s 5): when a walk ends where it began, the end's
  bullseye is drawn over the start (`tend map audit 25`), and the start's green shows as a crescent beside it.
- **The verb of a line** (the `steward`'s silent 2): every feature serves one of the three verbs; must every expectation
  line?
- **The units line's home** (the `steward`'s silent 3): the units setting is the map's, but its words are on every tab.

## Decision
The owner's answers, in person, verbatim, Nov 20.

- **The map's lines, as the steward reworded them:** "Ratify as drafted (Recommended)". Each begins "A person who goes
  out to notice, using the map, would reasonably expect". E1: "a finished walk's line to show where it began and where
  it ended, the two marked by shape, not colour alone", its check `tend map T16`'s; E2: "a moment on the map to open with
  one tap on its pin, even where the pin stands on the mark where the walk ended", its check QL3's; E3: "every distance
  the app shows, on a map's scale and in words, to be in the units they chose, kilometres or miles, as soon as they
  choose them", its grounds the Always line "Distances and times are fine", judged failed at the lens and its check
  moved to the new e2e once the fix landed, failed still (below); E4: "one tap to bring the map to where they stand now", its check QL10's;
  E5, in place of north in one tap: "a photo, a voice memo, a note and a video to look different on the map by their
  shape as well as their colour", its check pending. The run drafts them; the orchestrator records the answer in its own
  commit after the run lands.
- **A loop's two ends:** "One combined mark (Recommended)". The option read: "When the start and the end fall within one
  marker's diameter, one mark is drawn: the start's hollow ring as a halo around the end's solid bullseye."
- **The verb of a line:** "Yes, name the verb (Recommended)". Each expectation line names the verb it serves. A run of
  its own adds it to the tooling; this one changes no script.
- **The units line's home:** "Keep it in the map (Recommended)".

## Consequences
- `tend map 23` binds the units into the views this run chose to bind first (the order is the run's, not the owner's):
  Explore's tiles and card, Navigate's settings and its strip (`useDistance`, `lib/useUnits`); the views still keeping
  the store's units are filed and named by `docs/DEFERRED.md` (the walk screen, the replay, the home sheet, the gap's
  drawing and card, the recording bar, the navigation hook; `tend map audit 48`), held by the test's list. E-map-3 is
  failed in every record: those views, a miles user's first frames on launch in km (QL13), and no check that reads the
  scale bar after a switch. QL16's words ("`useUnits()` in the components that format") and the map
  rule's "Distances in words" line are the owner's to reword: under the React Compiler (0207) a subscription alone does
  not rebuild a memoized line ("Open before the loop").
- `tend map 25` adds E2's start case, a pin on the start marker opened by a tap (QL3's promise).
- The combined mark is judged on screen, so it changes with the zoom: the ends would be sent again on a zoom on both
  maps, past the size the orchestrator set for this run (two source files). It waits in the inbox as an `[owner]` entry
  with the owner's yes, for a build of its own.
- The verb on each line waits for the tooling's run; the map's lines are drafted without it.
- At the diff review the run moved two checks, its own calls: E-map-5's to "in greyscale, each kind's pin carries its
  own glyph" (a glyph is a shape, WCAG 1.4.1's non-colour cue; the deuteranopia item stays a low colour item, not this
  line's defect), and E-map-4's to one check holding Locate on Navigate and on Explore (`tend map audit 56`). E-map-1 is
  failed on a loop (met apart): T50 is its defect, and its check gains a loop case when T50 lands; T50's criterion gains
  a white band between the start's ring and the end's bullseye, the two read apart in greyscale.
